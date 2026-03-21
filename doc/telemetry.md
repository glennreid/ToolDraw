App still renders correctly. Here's what was added:

**`src/telemetry.ts`** — standalone module with:
- `track(event, properties)` — enqueues an event
- Flushes every **30 seconds** via `setInterval` using `fetch`
- Flushes on **page hide** (`visibilitychange`) and **unload** via `navigator.sendBeacon` (fire-and-forget, survives page close)
- Silently swallows network errors so drawing is never disrupted

**Payload format** sent to `https://data.usebutter.com/events`:
```json
{
  "session_id": "abc123def456",
  "events": [
    { "event": "session_start", "properties": { "screen_width": 1280, "screen_height": 800 }, "timestamp": "..." },
    { "event": "tool_selected", "properties": { "tool": "circle", "source": "keyboard" }, "timestamp": "..." },
    { "event": "shape_drawn",   "properties": { "tool": "circle", "color": "#e94560", "stroke_width": 4, "size": 87 }, "timestamp": "..." }
  ]
}
```

**Events tracked:** `session_start`, `tool_selected`, `color_changed`, `stroke_width_changed`, `shape_drawn`, `undo`, `canvas_cleared` — all with relevant properties including `source` (click/keyboard/swatch/picker).
