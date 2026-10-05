import './events-shim';

/**
 * Aegis Identity Hub - Browser Runtime Shims
 * Provides safe shims for Node.js process and filesystem methods in browser environments.
 */

if (typeof globalThis !== 'undefined') {
  const g = globalThis as any;
  if (!g.__dirname) {
    g.__dirname = '/';
  }
  if (!g.__filename) {
    g.__filename = '/index.js';
  }
  if (!g.process) {
    g.process = {};
  }
  if (!g.process.env) {
    g.process.env = {};
  }
  if (typeof g.process.cwd !== 'function') {
    g.process.cwd = () => '/';
  }
  if (!g.process.platform) {
    g.process.platform = 'browser';
  }
  if (!g.process.version) {
    g.process.version = 'v22.0.0';
  }
  if (!g.process.versions) {
    g.process.versions = { node: '22.0.0' };
  }
  if (typeof g.process.nextTick !== 'function') {
    g.process.nextTick = (fn: any, ...args: any[]) => setTimeout(() => fn(...args), 0);
  }

  const createStreamShim = () => ({
    isTTY: false,
    columns: 80,
    rows: 24,
    write: () => true,
    on: function() { return this; },
    once: function() { return this; },
    off: function() { return this; },
    emit: () => true,
    end: () => {},
    hasColors: () => false,
    getColorDepth: () => 1,
    read: () => null,
  });

  if (!g.process.stdout || typeof g.process.stdout.isTTY === 'undefined') {
    g.process.stdout = createStreamShim();
  }
  if (!g.process.stderr || typeof g.process.stderr.isTTY === 'undefined') {
    g.process.stderr = createStreamShim();
  }
  if (!g.process.stdin || typeof g.process.stdin.isTTY === 'undefined') {
    g.process.stdin = createStreamShim();
  }
  if (!g.process.argv) {
    g.process.argv = ['browser', '/'];
  }

  // Path polyfill for isomorphic modules
  const pathShim = {
    resolve: (...args: string[]) => {
      const parts = args.filter(Boolean).map(a => String(a).replace(/^\/+|\/+$/g, ''));
      return '/' + parts.filter(Boolean).join('/');
    },
    join: (...args: string[]) => {
      const parts = args.filter(Boolean).map(a => String(a).replace(/^\/+|\/+$/g, ''));
      return parts.join('/');
    },
    dirname: (p: string) => {
      const s = String(p).replace(/\/+$/, '');
      const idx = s.lastIndexOf('/');
      return idx <= 0 ? '/' : s.slice(0, idx);
    },
    basename: (p: string) => {
      const s = String(p).replace(/\/+$/, '');
      const idx = s.lastIndexOf('/');
      return idx === -1 ? s : s.slice(idx + 1);
    },
    extname: (p: string) => {
      const b = pathShim.basename(p);
      const idx = b.lastIndexOf('.');
      return idx <= 0 ? '' : b.slice(idx);
    },
    sep: '/',
    delimiter: ':',
  };

  if (!g.path) {
    g.path = pathShim;
  } else {
    if (typeof g.path.resolve !== 'function') g.path.resolve = pathShim.resolve;
    if (typeof g.path.join !== 'function') g.path.join = pathShim.join;
    if (typeof g.path.dirname !== 'function') g.path.dirname = pathShim.dirname;
    if (typeof g.path.basename !== 'function') g.path.basename = pathShim.basename;
  }
}

export {};
