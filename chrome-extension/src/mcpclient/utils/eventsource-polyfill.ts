/**
 * Minimal EventSource polyfill for MV3 background service workers.
 *
 * Chrome extension service workers have no `EventSource` global — it's a
 * Window/dedicated-worker API, not part of ServiceWorkerGlobalScope. Since
 * this project's SSEPlugin runs inside the background service worker and
 * uses the MCP SDK's SSEClientTransport (which calls `new EventSource(...)`),
 * every SSE connection attempt threw immediately with no visible error to
 * the UI. This shim implements just enough of the EventSource surface using
 * fetch()'s streaming response body, which IS available in service workers.
 */

type EventSourceInit = { withCredentials?: boolean; headers?: Record<string, string> };

class EventSourcePolyfill {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  readyState: number = EventSourcePolyfill.CONNECTING;
  url: string;
  withCredentials: boolean;

  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  private listeners: Map<string, Set<(ev: any) => void>> = new Map();
  private abortController = new AbortController();
  private lastEventId = '';

  constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
    this.url = url.toString();
    this.withCredentials = !!eventSourceInitDict?.withCredentials;
    this.connect(eventSourceInitDict?.headers);
  }

  private async connect(extraHeaders?: Record<string, string>): Promise<void> {
    try {
      const headers: Record<string, string> = {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
      };
      if (this.lastEventId) headers['Last-Event-ID'] = this.lastEventId;

      const response = await fetch(this.url, {
        headers,
        credentials: this.withCredentials ? 'include' : 'same-origin',
        signal: this.abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
      }

      this.readyState = EventSourcePolyfill.OPEN;
      this.dispatch('open', new Event('open'));
      if (this.onopen) this.onopen(new Event('open'));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const raw of events) {
          this.processEvent(raw);
        }
      }

      // Stream ended cleanly — surface as an error so McpClient's health
      // monitoring notices and can reconnect, matching native EventSource
      // behavior of firing "error" when the connection drops.
      this.readyState = EventSourcePolyfill.CLOSED;
      this.dispatch('error', new Event('error'));
      if (this.onerror) this.onerror(new Event('error'));
    } catch (error) {
      if (this.abortController.signal.aborted) return; // Intentional close()
      this.readyState = EventSourcePolyfill.CLOSED;
      const errEvent = new Event('error');
      this.dispatch('error', errEvent);
      if (this.onerror) this.onerror(errEvent);
    }
  }

  private processEvent(raw: string): void {
    if (!raw.trim()) return;
    let eventType = 'message';
    const dataLines: string[] = [];

    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).replace(/^ /, ''));
      } else if (line.startsWith('id:')) {
        this.lastEventId = line.slice(3).trim();
      }
      // "retry:" and comment lines ("^:") are not needed for MCP's usage
    }

    const data = dataLines.join('\n');
    const messageEvent = new MessageEvent(eventType, { data, lastEventId: this.lastEventId });

    this.dispatch(eventType, messageEvent);
    if (eventType === 'message' && this.onmessage) this.onmessage(messageEvent);
  }

  addEventListener(type: string, listener: (ev: any) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (ev: any) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  private dispatch(type: string, event: any): void {
    this.listeners.get(type)?.forEach(listener => {
      try {
        listener(event);
      } catch {
        // Don't let a subscriber's error break the read loop
      }
    });
  }

  close(): void {
    this.readyState = EventSourcePolyfill.CLOSED;
    this.abortController.abort();
  }
}

// Install globally only if the real EventSource isn't available — true in
// the background service worker, false in any normal page/DOM context.
// Exported as an explicit function (not a bare top-level side effect) because
// this package declares "sideEffects": false — a plain `import './this-file'`
// with no used export gets tree-shaken out of the bundle entirely, silently.
export function installEventSourcePolyfill(): void {
  if (typeof (globalThis as any).EventSource === 'undefined') {
    (globalThis as any).EventSource = EventSourcePolyfill;
  }
}

export { EventSourcePolyfill };
