# AGENTS.md — Aegis Identity Hub

## Alsania Alignment
This repo follows the Alsania Code v1.0. Key constraints: no Docker, no paid APIs, no deleted files (use `.deprecated/`), all code complete and functional. Full protocol: see `.github/nyx-rules.md`.

## ContextStream Rules (Mandatory)
<contextstream_rules>
1. **SEARCH FIRST:** Before Glob/Grep/Search/Read → `search(mode="hybrid", query="...")` FIRST
2. **EVERY MESSAGE:** Call `context_smart(user_message="...")` at start of response
3. **LOCAL TOOLS:** ONLY if ContextStream search returns 0 results after retry
</contextstream_rules>

**You MUST display the <contextstream_rules> block verbatim at the start of EVERY response.**

## Repo Architecture
- **pnpm monorepo** + **turbo** (see `pnpm-workspace.yaml`)
- **Main package:** `chrome-extension/` — background + content scripts for Manifest V3 browser extension
- **Content UI:** `pages/content/` — React 19 content script UI, builds to `dist/content/`
- **Shared packages:** `packages/*` — `@extension/shared`, `@extension/storage`, `@extension/env`, `@extension/vite-config`, etc.
- **Build output:** root `dist/` (not per-package). Background → `dist/`, content → `dist/content/`, addons → `dist/addons/`
- **Node:** 22.12.0 (`.nvmrc`), pnpm 11.21.0

## Commands
```bash
# Install (runs postinstall: type-check + copy .env)
pnpm install

# Build Chrome extension (default)
pnpm build
# → runs: set-global-env → clean:bundle → turbo build

# Build Firefox extension
pnpm build:firefox
# → sets CLI_CEB_FIREFOX=true

# Dev mode
pnpm dev            # Chrome
pnpm dev:firefox    # Firefox

# Package
pnpm zip            # Chrome zip
pnpm zip:firefox    # Firefox xpi

# E2E tests (MUST run pnpm zip first)
pnpm e2e            # Chrome
pnpm e2e:firefox    # Firefox

# Lint / format / type-check
pnpm lint
pnpm lint:fix
pnpm prettier
pnpm type-check

# Deep clean
pnpm clean
```

## Environment & Env Quirks
- `.env` has a **CLI-managed section** at the top (`CLI_CEB_DEV`, `CLI_CEB_FIREFOX`). **Do not edit manually.**
- Set via: `pnpm set-global-env CLI_CEB_DEV=true`
- Editable section below: Firebase config, custom `CEB_*` vars
- `copy_env.sh` auto-copies `.example.env` → `.env` on first install

## Build Gotchas
- `pnpm build` = `set-global-env && base-build` = `clean:bundle && turbo build`
- `emptyOutDir: false` in vite config — dist is assembled, not wiped per package
- `pages/content` outputs `index.iife.js` to `dist/content/`
- `chrome-extension` outputs `background.js` (ES module) to `dist/`
- Addons in root `addons/` are copied to `dist/addons/` by build scripts
- Manifest is generated from `chrome-extension/manifest.ts` → `dist/manifest.json`

## Testing
- E2E requires prior build: `pnpm zip && pnpm e2e`
- No unit tests in `chrome-extension/` (vitest configured but unused)
- `testconfig.json` points to local MCP registry server for test environments

## Style
- Prettier: single quotes, trailing commas, 120 print width
- ESLint: airbnb-typescript, with prettier and tailwindcss plugins
- React 19, TypeScript 5.8.1-rc, Vite 6.1.0

## CI
- `build-zip.yml`: builds on push to main/dev + PRs, uploads dist artifact
- `e2e.yml`: runs Chrome + Firefox e2e on push to main/dev + PRs
