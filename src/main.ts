import { track } from './telemetry';

type Tool = 'line' | 'circle' | 'rectangle';

interface Point {
  x: number;
  y: number;
}

interface Shape {
  tool: Tool;
  start: Point;
  end: Point;
  color: string;
  lineWidth: number;
}

// ── Preset palette ─────────────────────────────────────────────────────────
const SWATCHES = [
  '#1a1a2e', '#e94560', '#4a90d9', '#50c878', '#f5a623',
  '#9b59b6', '#e74c3c', '#1abc9c', '#f39c12', '#ffffff',
];

// ── App ────────────────────────────────────────────────────────────────────
class DrawingApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private tool: Tool = 'line';
  private color: string = '#1a1a2e';
  private lineWidth: number = 2;

  private drawing = false;
  private origin: Point = { x: 0, y: 0 };
  private shapes: Shape[] = [];

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.resizeCanvas();
    this.buildSwatches();
    this.bindControls();
    this.bindCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());
    track('session_start', { screen_width: window.innerWidth, screen_height: window.innerHeight });
  }

  // ── Canvas sizing ────────────────────────────────────────────────────────
  private resizeCanvas() {
    const container = this.canvas.parentElement!;
    const { clientWidth: w, clientHeight: h } = container;

    // Preserve drawn content across resize via off-screen copy
    const tmp = document.createElement('canvas');
    tmp.width = this.canvas.width || w;
    tmp.height = this.canvas.height || h;
    tmp.getContext('2d')!.drawImage(this.canvas, 0, 0);

    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(tmp, 0, 0);

    this.redraw();
  }

  // ── Swatch grid ──────────────────────────────────────────────────────────
  private buildSwatches() {
    const grid = document.getElementById('swatches')!;
    SWATCHES.forEach((hex) => {
      const btn = document.createElement('button');
      btn.className = 'swatch' + (hex === this.color ? ' active' : '');
      btn.style.background = hex;
      btn.title = hex;
      btn.addEventListener('click', () => this.setColor(hex, btn));
      grid.appendChild(btn);
    });
  }

  private setColor(hex: string, swatchBtn?: Element) {
    this.color = hex;
    (document.getElementById('colorPicker') as HTMLInputElement).value = hex;
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    swatchBtn?.classList.add('active');
    track('color_changed', { color: hex, source: 'swatch' });
  }

  // ── Control wiring ───────────────────────────────────────────────────────
  private bindControls() {
    // Tool buttons
    document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tool = btn.dataset.tool as Tool;
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.body.className = `tool-${this.tool}`;
        track('tool_selected', { tool: this.tool, source: 'click' });
      });
    });

    // Custom color picker
    const picker = document.getElementById('colorPicker') as HTMLInputElement;
    picker.addEventListener('change', () => {
      this.color = picker.value;
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      track('color_changed', { color: this.color, source: 'picker' });
    });

    // Stroke width
    const strokeInput = document.getElementById('strokeWidth') as HTMLInputElement;
    const strokeLabel = document.getElementById('strokeValue')!;
    strokeInput.addEventListener('change', () => {
      this.lineWidth = +strokeInput.value;
      strokeLabel.textContent = `${strokeInput.value}px`;
      track('stroke_width_changed', { stroke_width: this.lineWidth });
    });

    // Undo / Clear
    document.getElementById('undoBtn')!.addEventListener('click', () => {
      this.shapes.pop();
      this.redraw();
      track('undo', { shapes_remaining: this.shapes.length, source: 'button' });
    });
    document.getElementById('clearBtn')!.addEventListener('click', () => {
      track('canvas_cleared', { shapes_cleared: this.shapes.length });
      this.shapes = [];
      this.redraw();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const map: Record<string, Tool> = { l: 'line', c: 'circle', r: 'rectangle' };
      const t = map[e.key.toLowerCase()];
      if (t) {
        const btn = document.querySelector<HTMLButtonElement>(`[data-tool="${t}"]`)!;
        btn.click();
        track('tool_selected', { tool: t, source: 'keyboard' });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.shapes.pop();
        this.redraw();
        track('undo', { shapes_remaining: this.shapes.length, source: 'keyboard' });
      }
    });
  }

  // ── Canvas events ────────────────────────────────────────────────────────
  private bindCanvas() {
    this.canvas.addEventListener('mousedown', e => this.onDown(e));
    this.canvas.addEventListener('mousemove', e => this.onMove(e));
    this.canvas.addEventListener('mouseup',   e => this.onUp(e));
    this.canvas.addEventListener('mouseleave', e => this.onUp(e));

    // Touch support
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this.onDown(this.toMouse(e));
    }, { passive: false });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      this.onMove(this.toMouse(e));
    }, { passive: false });
    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this.onUp(this.toMouse(e));
    }, { passive: false });
  }

  private toMouse(e: TouchEvent): MouseEvent {
    const t = e.touches[0] ?? e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY } as MouseEvent;
  }

  private pt(e: MouseEvent): Point {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: MouseEvent) {
    this.drawing = true;
    this.origin = this.pt(e);
  }

  private onMove(e: MouseEvent) {
    if (!this.drawing) return;
    const preview: Shape = {
      tool: this.tool,
      start: this.origin,
      end: this.pt(e),
      color: this.color,
      lineWidth: this.lineWidth,
    };
    this.redraw(preview);
  }

  private onUp(e: MouseEvent) {
    if (!this.drawing) return;
    this.drawing = false;

    const end = this.pt(e);
    const dx = end.x - this.origin.x;
    const dy = end.y - this.origin.y;
    if (Math.hypot(dx, dy) > 1) {
      this.shapes.push({
        tool: this.tool,
        start: { ...this.origin },
        end,
        color: this.color,
        lineWidth: this.lineWidth,
      });
      track('shape_drawn', {
        tool: this.tool,
        color: this.color,
        stroke_width: this.lineWidth,
        size: Math.round(Math.hypot(dx, dy)),
      });
    }
    this.redraw();
  }

  // ── Render ───────────────────────────────────────────────────────────────
  private redraw(preview?: Shape) {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Light grid background
    this.drawGrid();

    this.shapes.forEach(s => this.renderShape(s));
    if (preview) this.renderShape(preview, true);
  }

  private drawGrid() {
    const { ctx, canvas } = this;
    const step = 28;
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.055)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.restore();
  }

  private renderShape(s: Shape, preview = false) {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (preview) ctx.globalAlpha = 0.6;

    switch (s.tool) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(s.start.x, s.start.y);
        ctx.lineTo(s.end.x, s.end.y);
        ctx.stroke();
        break;

      case 'circle': {
        const r = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
        ctx.beginPath();
        ctx.arc(s.start.x, s.start.y, r, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'rectangle': {
        const x = Math.min(s.start.x, s.end.x);
        const y = Math.min(s.start.y, s.end.y);
        const w = Math.abs(s.end.x - s.start.x);
        const h = Math.abs(s.end.y - s.start.y);
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 2);
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}

// Boot
new DrawingApp();
