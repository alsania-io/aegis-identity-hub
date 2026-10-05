import { resolve } from 'node:path';
import { makeEntryPointPlugin } from '@extension/hmr';
import { withPageConfig } from '@extension/vite-config';
import { IS_DEV } from '@extension/env';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
      // `@alsania-io/ai-router` imports Node builtins (dotenv, fs, path, events)
      // at module load. In the content script there is no filesystem, so these
      // crash on path.resolve etc. and kill the whole bundle. Alias to stubs.
      'dotenv': resolve(srcDir, 'lib/dotenv-stub.ts'),
      'fs': resolve(srcDir, 'lib/node-builtins-stub.ts'),
      'path': resolve(srcDir, 'lib/node-builtins-stub.ts'),
      'events': resolve(srcDir, 'lib/node-builtins-stub.ts'),
    },
  },
  publicDir: resolve(rootDir, 'public'),
  plugins: [IS_DEV && makeEntryPointPlugin()],
  build: {
    lib: {
      name: 'ContentScript',
      fileName: 'index',
      formats: ['iife'],
      entry: resolve(srcDir, 'index.ts'),
    },
    outDir: resolve(rootDir, '..', '..', 'dist', 'content'),
    rollupOptions: {
      input: {
        content: resolve(srcDir, 'index.ts'),
      },
      output: {
        entryFileNames: 'index.iife.js',
        assetFileNames: '[name].[ext]',
      },
    },
    cssCodeSplit: false,
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
});