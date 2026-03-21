
Create  a browser-based typescript drawing app with a canvas on the right and a column on the left with a  toolbar and a color picker. Three drawing tools: line segment, circle, and rectangle.

The app is open in your browser. Here's what was built:

**Project structure:**
```
ToolDraw/
├── index.html          ← standalone, opens directly (no build needed)
├── src/main.ts         ← TypeScript source
├── package.json        ← Vite + TS (for when npm is available)
└── tsconfig.json
```

**Features:**
- **Left sidebar** — dark themed panel with:
  - Three tool buttons with SVG icons: Line Segment, Circle, Rectangle
  - 10-color swatch palette + custom color picker
  - Stroke width slider (1–24px)
  - Undo (removes last shape) and Clear Canvas buttons
- **Right canvas** — light grid background, fills remaining space
- **Drawing behavior:**
  - Line: drag start→end
  - Circle: drag from center, radius = drag distance
  - Rectangle: drag any corner to opposite corner (normalized, no negative rects)
  - Live preview at 55% opacity while dragging
- **Keyboard shortcuts:** `L` / `C` / `R` to switch tools, `Cmd/Ctrl+Z` to undo
- Touch support included

> Note: Since no modern Node.js was found on your system, `index.html` is fully self-contained and runs without a build step. The `src/main.ts` file is the original TypeScript source for if you want to use the Vite setup later.

The dev server is running and the app looks great. Everything is working — dark sidebar with all controls on the left, grid canvas on the right. 

The fix was creating a `dev.sh` wrapper that puts `/opt/homebrew/bin` in `PATH` before running npm, since your shell's default PATH doesn't include Homebrew's modern Node.js (v25.8.1).

Awesome. Now please add telemetry to track all user actions and create an upload path to send JSON telemetry data to a remote server called "data.usebutter.com"

I'll add a clean telemetry module to both the TypeScript source and the inline HTML, tracking tool changes, color/stroke changes, shapes drawn, undo, and clear — batched and flushed periodically plus on page hide.