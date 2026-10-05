/**
 * node-builtins-stub.ts — browser-safe stubs for Node builtins that
 * @alsania-io/ai-router imports (fs, path, events). In the content script
 * there is no filesystem, so these no-op / minimal implementations keep the
 * router from crashing on load.
 */

// ── path ────────────────────────────────────────────────
export function resolve(...parts: string[]): string {
  return '/' + parts.filter(Boolean).map(String).join('/');
}
export function join(...parts: string[]): string {
  return parts.filter(Boolean).map(String).join('/');
}
export function dirname(p: string): string {
  const s = String(p).replace(/\/+$/, '');
  const i = s.lastIndexOf('/');
  return i <= 0 ? '/' : s.slice(0, i);
}
export function basename(p: string): string {
  const s = String(p).replace(/\/+$/, '');
  const i = s.lastIndexOf('/');
  return i === -1 ? s : s.slice(i + 1);
}
export function extname(p: string): string {
  const b = basename(p);
  const i = b.lastIndexOf('.');
  return i <= 0 ? '' : b.slice(i);
}
export const sep = '/';
export const delimiter = ':';

const pathDefault = { resolve, join, dirname, basename, extname, sep, delimiter };

// ── fs (no-op: autoDiscover finds nothing, which is safe) ──
export function existsSync(): boolean {
  return false;
}
export function readdirSync(): string[] {
  return [];
}
export function readFileSync(): string {
  return '';
}
export function statSync(): { isDirectory: () => boolean; isFile: () => boolean } {
  return { isDirectory: () => false, isFile: () => false };
}
export const promises = {
  readdir: async (): Promise<string[]> => [],
  readFile: async (): Promise<string> => '',
  stat: async () => ({ isDirectory: () => false, isFile: () => false }),
};

// ── events ──────────────────────────────────────────────
export class EventEmitter {
  private handlers = new Map<string, Function[]>();
  on(ev: string, fn: Function) {
    const a = this.handlers.get(ev) || [];
    a.push(fn);
    this.handlers.set(ev, a);
    return this;
  }
  off(ev: string, fn: Function) {
    this.handlers.set(ev, (this.handlers.get(ev) || []).filter((h) => h !== fn));
    return this;
  }
  once(ev: string, fn: Function) {
    const wrap = (...a: unknown[]) => {
      this.off(ev, wrap);
      fn(...a);
    };
    return this.on(ev, wrap);
  }
  emit(ev: string, ...args: unknown[]) {
    (this.handlers.get(ev) || []).forEach((h) => h(...args));
    return true;
  }
  removeAllListeners(ev?: string) {
    if (ev) this.handlers.delete(ev);
    else this.handlers.clear();
    return this;
  }
  setMaxListeners(_n?: number) {
    return this;
  }
  getMaxListeners() {
    return 10;
  }
  addListener(ev: string, fn: Function) {
    return this.on(ev, fn);
  }
  removeListener(ev: string, fn: Function) {
    return this.off(ev, fn);
  }
  listeners(ev: string): Function[] {
    return [...(this.handlers.get(ev) || [])];
  }
  rawListeners(ev: string): Function[] {
    return this.listeners(ev);
  }
  listenerCount(ev: string): number {
    return (this.handlers.get(ev) || []).length;
  }
  prependListener(ev: string, fn: Function) {
    const a = this.handlers.get(ev) || [];
    a.unshift(fn);
    this.handlers.set(ev, a);
    return this;
  }
  static listenerCount() {
    return 0;
  }
  static defaultMaxListeners = 10;
}

// One combined default so aliased imports of fs / path / events all resolve
// their `.default.<member>` access (ai-router uses __importDefault).
const nodeBuiltinsDefault = {
  // path
  resolve,
  join,
  dirname,
  basename,
  extname,
  sep,
  delimiter,
  // fs
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  promises,
  // events
  EventEmitter,
};
export default nodeBuiltinsDefault;
