/**
 * Aegis Identity Hub - Isomorphic Events Polyfill
 * Ensures both `new events_1.EventEmitter()` and `new EventEmitter()` succeed in browser & bundler runtimes.
 */

type Listener = (...args: any[]) => void;

export class EventEmitter {
  public static EventEmitter = EventEmitter;
  public static default = EventEmitter;
  private _events: Record<string, Listener[]> = Object.create(null);
  private _maxListeners = 50;

  public setMaxListeners(n: number): this {
    this._maxListeners = n;
    return this;
  }

  public getMaxListeners(): number {
    return this._maxListeners;
  }

  public emit(event: string | symbol, ...args: any[]): boolean {
    const key = String(event);
    const listeners = this._events[key];
    if (!listeners || listeners.length === 0) return false;
    // Clone array to avoid issues if listeners remove themselves during execution
    const copy = [...listeners];
    for (const fn of copy) {
      try {
        fn.apply(this, args);
      } catch (err) {
        console.error(`[EventEmitter] Error in listener for event "${key}":`, err);
      }
    }
    return true;
  }

  public on(event: string | symbol, listener: Listener): this {
    const key = String(event);
    if (!this._events[key]) {
      this._events[key] = [];
    }
    this._events[key].push(listener);
    return this;
  }

  public addListener(event: string | symbol, listener: Listener): this {
    return this.on(event, listener);
  }

  public once(event: string | symbol, listener: Listener): this {
    const key = String(event);
    const onceWrapper: Listener = (...args: any[]) => {
      this.off(key, onceWrapper);
      listener.apply(this, args);
    };
    (onceWrapper as any)._original = listener;
    return this.on(key, onceWrapper);
  }

  public off(event: string | symbol, listener: Listener): this {
    const key = String(event);
    const listeners = this._events[key];
    if (!listeners) return this;
    this._events[key] = listeners.filter(
      (fn) => fn !== listener && (fn as any)._original !== listener
    );
    if (this._events[key].length === 0) {
      delete this._events[key];
    }
    return this;
  }

  public removeListener(event: string | symbol, listener: Listener): this {
    return this.off(event, listener);
  }

  public removeAllListeners(event?: string | symbol): this {
    if (event) {
      delete this._events[String(event)];
    } else {
      this._events = Object.create(null);
    }
    return this;
  }

  public listenerCount(event: string | symbol): number {
    const listeners = this._events[String(event)];
    return listeners ? listeners.length : 0;
  }

  public rawListeners(event: string | symbol): Listener[] {
    return [...(this._events[String(event)] || [])];
  }
}

// Attach static self-references for CommonJS interop
(EventEmitter as any).EventEmitter = EventEmitter;
(EventEmitter as any).default = EventEmitter;

export const once = (emitter: EventEmitter, event: string) => {
  return new Promise((resolve) => {
    emitter.once(event, (...args: any[]) => resolve(args));
  });
};

(EventEmitter as any).once = once;

// Expose globally
if (typeof globalThis !== 'undefined') {
  (globalThis as any).EventEmitter = EventEmitter;
}
if (typeof window !== 'undefined') {
  (window as any).EventEmitter = EventEmitter;
}

export default EventEmitter;
