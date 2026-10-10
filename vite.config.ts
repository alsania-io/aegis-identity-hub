import react from '@vitejs/plugin-react';
import path from 'path';
import { existsSync } from 'fs';
import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Dev override: if the local ai-router checkout exists, build against its TS
// SOURCE entry (not the CJS dist) for a true live edit loop AND correct named
// exports. The package's dist is CommonJS; Rollup's static analysis cannot
// detect all its named exports (ProviderLoader et al.). Pointing at src/*.ts
// lets Vite compile it directly. Falls back to the npm-published package when
// the local checkout is absent, so the hub stays portable.
const localAiRouterSrc = path.resolve(__dirname, '../echo-sys/packages/ai-router/src/index.ts');
const aiRouterAlias = existsSync(localAiRouterSrc)
  ? { '@alsania-io/ai-router': localAiRouterSrc }
  : {};

export default defineConfig(() => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        ...aiRouterAlias,
        '@': path.resolve(__dirname, '.'),
        '@src': path.resolve(__dirname, 'pages/content/src'),
        '@extension/shared': path.resolve(__dirname, 'packages/shared'),
        '@extension/storage': path.resolve(__dirname, 'packages/storage'),
        '@extension/env': path.resolve(__dirname, 'packages/env'),
        '@extension/i18n': path.resolve(__dirname, 'packages/i18n'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      force: true,
      include: ['react', 'react-dom', 'react-dom/client'],
    },
    css: {
      postcss: {
        plugins: [tailwindcss, autoprefixer],
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
