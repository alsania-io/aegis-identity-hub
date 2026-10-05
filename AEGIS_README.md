# 🛡️ Aegis Identity Hub v2.0.0

> Cross-Device Automation & Memory Extension — Merged from Nyx-Mobile + Aegis-Identity-Hub

## Overview

Aegis Identity Hub is a mobile-optimized browser extension that combines:
- **Nyx-Mobile's** working mobile UI, dynamic tool loading, and MCP integration
- **Aegis-Identity-Hub's** feature-rich tabs: Prompts, Memory, Swarm, MCP, Instructions, Sync, Profiles, Settings
- **Cross-device sync** via backend server
- **1-tap prompt injection** into any AI input field

## Features

### 🧠 Prompt Library
- Drag-and-drop prompt management
- Favorites, tags, search filtering
- AI enhancement via backend API
- 1-tap injection into active browser inputs

### 💾 Memory Store
- Key-value memory for persistent AI context
- Category tagging and search
- Copy/delete management

### 🤖 Swarm & Cron
- Multi-agent task orchestration
- Cron scheduling (5-field cron syntax)
- Manual task execution
- Execution history with search
- Task pause/resume

### 🔌 MCP Control
- Configure MCP server connections
- SSE, WebSocket, Streamable HTTP transport
- Custom JSON configuration

### 📝 Instructions Hub
- Custom instruction injection
- **Uses Nyx's real system prompt generator**
- Live system prompt preview with tool schemas
- Auto-inject toggle

### 🔄 Cloud Sync
- Cross-device synchronization
- Sync key management
- QR code for mobile pairing
- Local JSON backup download
- Device management

### 👤 Profiles
- Multiple configuration profiles
- Per-profile settings (theme, model, tools)
- Quick activation switching
- Profile management (create, edit, delete)

### ⚙️ Settings
- Theme: System, Dark, Light, Glass
- Sync interval configuration
- Auto-inject prompts
- OpenRouter model & temperature settings

### 📦 Extension Export
- Download .xpi for Firefox Mobile
- Download .zip for Chrome/Edge
- Sync key management

## Installation

### Firefox Mobile
1. Build: `pnpm zip:firefox`
2. Navigate to `about:addons` in Firefox Mobile
3. Tap gear icon → "Install Add-on From File"
4. Select the `.xpi` file from `dist/`

### Chrome / Edge
1. Build: `pnpm zip`
2. Extract the `.zip` file
3. Open `chrome://extensions` / `edge://extensions`
4. Enable Developer Mode
5. Load unpacked extension

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Build for Firefox
pnpm build:firefox

# Development mode
pnpm dev

# Create packages
pnpm zip
pnpm zip:firefox

# Lint
pnpm lint
```

## Project Structure

```
aegis-identity-hub/
├── pages/content/src/
│   ├── components/
│   │   ├── identity-tabs/
│   │   │   ├── App.tsx              # Main identity app
│   │   │   ├── Header.tsx           # Nyx logo + controls
│   │   │   ├── Navigation.tsx       # Tab navigation
│   │   │   ├── PromptsTab.tsx       # Prompt library
│   │   │   ├── MemoryTab.tsx        # Memory store
│   │   │   ├── SwarmTab.tsx         # Multi-agent + cron
│   │   │   ├── McpTab.tsx           # MCP config
│   │   │   ├── InstructionsTab.tsx  # Uses Nyx's generator
│   │   │   ├── SyncTab.tsx          # Cross-device sync
│   │   │   ├── ConfigTab.tsx        # Profiles
│   │   │   ├── SettingsTab.tsx      # Settings
│   │   │   ├── ExtensionExportModal.tsx
│   │   │   └── index.ts
│   │   └── sidebar/Instructions/
│   │       └── instructionGenerator.ts  # Nyx's real generator
│   ├── types/
│   │   └── identity.ts             # Full types
│   ├── lib/
│   │   ├── identity-storage.ts    # Storage
│   │   └── identity-api.ts        # API client
│   └── identity-entry.tsx          # Entry point
├── content/
│   ├── mcp-button-injector.js     # Kept for reference
│   └── mcp-button-styles.css      # Kept for reference
├── package.json                    # aegis-identity-hub v2.0.0
└── AEGIS_README.md                 # This file
```

## Sync Backend

The identity hub connects to a backend server for cross-device sync:

- **Default URL:** `https://ais-dev-3oug745mnyn3cn5iilw6os-658524861020.us-east1.run.app`
- **Configuration:** Store in `chrome.storage.local` key `aegis_hub_url`

## Built With

- React 19
- TypeScript 5.8
- Tailwind CSS 3.4
- Vite 6.1
- Turbo + pnpm workspace

## License

MIT — See [LICENSE](LICENSE)

---

**Built with ❤️ by Alsania I/O**

[Website](https://alsania-io.com) · [GitHub](https://github.com/alsania-dev/aegis-identity-hub)