const ENDPOINT = 'https://data.example.com/events';
const FLUSH_INTERVAL_MS = 30_000;
const MAX_QUEUE = 100;

interface TelemetryEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

interface Payload {
  session_id: string;
  events: TelemetryEvent[];
}

const sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
const queue: TelemetryEvent[] = [];

export function track(event: string, properties: Record<string, unknown> = {}): void {
  queue.push({ event, properties, timestamp: new Date().toISOString() });
  if (queue.length >= MAX_QUEUE) flush();
}

async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const events = queue.splice(0);
  const payload: Payload = { session_id: sessionId, events };
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silently swallow — telemetry must never disrupt the drawing experience
  }
}

function flushBeacon(): void {
  if (queue.length === 0) return;
  const events = queue.splice(0);
  const payload: Payload = { session_id: sessionId, events };
  navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
}

setInterval(flush, FLUSH_INTERVAL_MS);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushBeacon();
});
window.addEventListener('beforeunload', flushBeacon);
