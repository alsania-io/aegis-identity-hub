// Stream pacing: turn a bursty stream of text chunks into a smooth
// character-by-character reveal. Ported into Aegis Identity Hub from the Hermes
// browser extension (`extension/lib/stream-pacing.mjs`) — reused, not
// reinvented. DOM-free, dependency-free; clock + scheduler injectable.
//
// Why: fast runtimes (a local proxy at 300-450 tok/s) deliver whole paragraphs
// in one frame, so the transcript "spits it out" instead of looking streamed.
// This buffers pushed text and reveals it at an adaptive, monotonic pace:
//   - never exceeds maxCharsPerSecond (hard per-frame cap);
//   - accelerates as backlog grows (CATCH_UP_GAIN x backlog/maxLag), clamped;
//   - enforces minDurationMs for tiny payloads by PACING (not withholding);
//   - reveals whole Unicode code points (never splits surrogate pairs).
//
// Usage:
//   const pacer = createStreamPacer({ onFrame: (text) => paint(text) });
//   onDelta: pacer.push(delta);
//   turn end: pacer.finish();
//   next turn: pacer.reset();
//
// Counts are Unicode code points (match Array.from(text).length).

export const STREAM_PACER_DEFAULTS = Object.freeze({
  minCharsPerSecond: 420,
  maxCharsPerSecond: 2600,
  minDurationMs: 600,
  maxLagMs: 900,
});

const CATCH_UP_GAIN = 2;

function isHighSurrogate(point: string): boolean {
  const code = point.codePointAt(0)!;
  return code >= 0xd800 && code <= 0xdbff;
}
function isLowSurrogate(point: string): boolean {
  const code = point.codePointAt(0)!;
  return code >= 0xdc00 && code <= 0xdfff;
}

export interface StreamPacerOptions {
  onFrame?: (text: string, meta: { done: boolean; backlog: number }) => void;
  now?: () => number;
  schedule?: (cb: () => void) => any;
  cancel?: (handle: any) => void;
  minCharsPerSecond?: number;
  maxCharsPerSecond?: number;
  minDurationMs?: number;
  maxLagMs?: number;
}

export interface StreamPacer {
  push(text: string): void;
  flush(): void;
  finish(): void;
  reset(): void;
  pending(): number;
  revealed(): number;
}
export function createStreamPacer(opts: StreamPacerOptions = {}): StreamPacer {
  const onFrame = opts.onFrame ?? (() => {});
  const now = opts.now ?? Date.now;
  const schedule = opts.schedule ?? ((cb: () => void) => setTimeout(cb, 16));
  const cancel = opts.cancel ?? ((h: any) => clearTimeout(h));
  const minCharsPerSecond = opts.minCharsPerSecond ?? STREAM_PACER_DEFAULTS.minCharsPerSecond;
  const maxCharsPerSecond = opts.maxCharsPerSecond ?? STREAM_PACER_DEFAULTS.maxCharsPerSecond;
  const minDurationMs = opts.minDurationMs ?? STREAM_PACER_DEFAULTS.minDurationMs;
  const maxLagMs = opts.maxLagMs ?? STREAM_PACER_DEFAULTS.maxLagMs;

  const lagMs = Number(maxLagMs) > 0 ? Number(maxLagMs) : 1;
  const minRate = Math.max(0, Number(minCharsPerSecond) || 0) / 1000;
  const maxRate = Math.max(0, Number(maxCharsPerSecond) || 0) / 1000;
  const minWindowMs = Math.max(0, Number(minDurationMs) || 0);

  let pendingPoints: string[] = [];
  let revealedCodePoints = 0;
  let revealedText = "";
  let timer: any = null;
  let closed = false;
  let startedAt: number | null = null;
  let lastFrameAt: number | null = null;
  let credit = 0;

  function stopTimer() {
    if (timer !== null) { cancel(timer); timer = null; }
  }

  function emit() {
    const backlog = pendingPoints.length;
    onFrame(revealedText, { done: closed && backlog === 0, backlog });
  }

  function scheduleFrame() {
    if (timer === null) timer = schedule(frame);
  }

  function frameTake(dt: number, t: number): number {
    const backlog = pendingPoints.length;
    if (backlog === 0) return 0;
    const cap = maxRate * dt;
    let budget = minRate * dt + (CATCH_UP_GAIN * backlog * dt) / lagMs;
    if (startedAt !== null) {
      const windowLeft = minWindowMs - (t - startedAt);
      if (windowLeft > 0) budget = Math.min(budget, (backlog * dt) / windowLeft);
    }
    budget = Math.min(budget, cap);
    credit = Math.min(credit + budget, cap + 1);
    let take = Math.floor(credit);
    if (take <= 0 && revealedCodePoints === 0) take = 1;
    take = Math.min(take, backlog, Math.floor(cap));
    credit = Math.max(0, credit - take);
    return take;
  }

  function frame() {
    timer = null;
    const t = now();
    const dt = lastFrameAt === null ? 0 : Math.max(0, t - lastFrameAt);
    lastFrameAt = t;
    const take = frameTake(dt, t);
    if (take > 0) {
      revealedText += pendingPoints.slice(0, take).join("");
      pendingPoints.splice(0, take);
      revealedCodePoints += take;
      emit();
    }
    if (pendingPoints.length > 0) scheduleFrame();
  }
  function push(text: string): void {
    const chunk = String(text ?? "");
    if (!chunk) return;
    const wasIdle = timer === null && pendingPoints.length === 0;
    if (closed) {
      closed = false;
      if (wasIdle) startedAt = null;
    }
    if (startedAt === null) startedAt = now();
    const incoming = Array.from(chunk);
    // Heal a surrogate pair split across pushes while both halves are pending.
    if (
      pendingPoints.length > 0 &&
      incoming.length > 0 &&
      isHighSurrogate(pendingPoints[pendingPoints.length - 1]) &&
      isLowSurrogate(incoming[0])
    ) {
      pendingPoints[pendingPoints.length - 1] += incoming.shift();
    }
    for (const point of incoming) pendingPoints.push(point);
    if (wasIdle) {
      lastFrameAt = now();
      credit = 0;
    }
    scheduleFrame();
  }

  // Render everything remaining immediately and stop (terminal for the run).
  function flush(): void {
    stopTimer();
    if (pendingPoints.length > 0) {
      revealedText += pendingPoints.join("");
      revealedCodePoints += pendingPoints.length;
      pendingPoints = [];
    }
    credit = 0;
    closed = true;
    lastFrameAt = null;
    emit();
  }

  // Close the stream without truncating: buffered text keeps draining, then
  // `done` flips true.
  function finish(): void {
    closed = true;
    if (pendingPoints.length === 0) {
      stopTimer();
      emit();
      return;
    }
    scheduleFrame();
  }

  // Drop buffered text and stop. Emits nothing.
  function reset(): void {
    stopTimer();
    pendingPoints = [];
    revealedCodePoints = 0;
    revealedText = "";
    closed = false;
    startedAt = null;
    lastFrameAt = null;
    credit = 0;
  }

  return {
    push,
    flush,
    finish,
    reset,
    pending: () => pendingPoints.length,
    revealed: () => revealedCodePoints,
  };
}