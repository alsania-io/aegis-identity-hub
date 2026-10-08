# Aegis Identity Hub

> Cross-device automation & memory extension. Agent / identity / memory context for browser-based AI — by Alsania I/O.

Aegis Identity Hub connects free browser-based AI models to MCP server tools, and adds agent identity, persistent memory, skills, and workspace features on top. It is the fully-featured, mobile-friendly successor to Nyx Control / Nyx Mobile, built modular with a plugin architecture so features can be tested, maintained, added, or removed cleanly.

For the project intent and priorities, see [`GOAL.md`](./GOAL.md).

## What it does

- **Connect AI models to MCP tools** — drive browser chat UIs (DeepSeek, Claude, ChatGPT, Gemini, Copilot, and more) as tool-capable agents via the Model Context Protocol.
- **Agent identity** — personality / identity initialization, integrity auditing.
- **Persistent memory** — storage, retrieval, migration, and context management tuned for token efficiency.
- **Skills & plugins** — modular, testable feature units.
- **Swarm orchestration** — a symmetric model router where leader, workers, and aggregator are each independently routed to a browser tab (`tab/<site>`), a cloud API (`openrouter/...`), or a local engine (`local/...`).
- **Workspace** — prompts, secrets, tools, config, and sync in one place.

## Architecture

- **Extension** — Manifest V3 (Chrome/Chromium + Firefox). Background service worker + content scripts.
- **Adapters** — per-site plugins that insert text, submit, read responses, and attach files. Robust selectors + DOM-walking fallbacks for UIs that mutate at runtime.
- **Cross-tab execution** — a browser model in any swarm slot is driven via `chrome.tabs` + `chrome.scripting`, with MV3-safe capture.
- **MCP client** — connects to `mcpnyx` (free) or `mcpnyx-u` (premium) for tools; any MCP server can be configured.

See [`docs/SWARM-ARCHITECTURE.md`](./docs/SWARM-ARCHITECTURE.md) for the swarm design.

## Build

```bash
pnpm install
pnpm build          # outputs to ./dist  (this is what Chrome loads)
```

Then load unpacked in `chrome://extensions` → select the repo's `dist/` directory.

## Development notes

- The extension loads from **`dist/`** (root build output) — not `chrome-extension/`, not `pages/content/dist/`.
- Content bundle is written by the root build (`pnpm build`, vite + turbo).
- Adapters live in `pages/content/src/plugins/adapters/`; per-site input handlers in `pages/content/src/components/websites/<site>/`.

## Credits

- Built by Alsania I/O — imagined by Sigma, powered by Echo.
- Lineage: Nyx Control → Nyx Mobile → Aegis Identity Hub.

## License

MIT — see [`LICENSE`](./LICENSE).
