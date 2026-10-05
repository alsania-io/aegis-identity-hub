# Nyx Mobile - Changes Summary

## v1.0.2 Rebuild Notes (current)

Earlier attempts left two competing mobile code paths: a standalone
`mobile-entry.ts` / `mobile-init.ts` bootstrap that rendered `MobileSidebar`
into its own `#nyx-mobile-sidebar-root` (outside the Shadow DOM, and never
actually wired into the built content script), and the real path used in
production — `SidebarManager.createSidebarContent()` detecting mobile and
rendering `<MobileSidebar>` inside the same Shadow DOM as the desktop
sidebar. The dead path has been removed (see `.deprecated/pages-content-src/`).

The bigger bug: `content/mobile-sidebar-override.css` and the inline styles
injected by `addons/mobile-sidebar-fix.js` were added to the **page**
(`document.head`), but the sidebar renders inside a closed-scope **Shadow
DOM** — page-level CSS cannot cross that boundary, so none of that styling
ever applied. Those files are now in `.deprecated/`. `mobile-sidebar.css` is
fixed: it's imported directly by `MobileSidebar.tsx`, which puts it in the
same Vite bundle (`content/index.css`) that `injectTailwindToShadowDom()`
loads into the Shadow DOM, so the touch-target/scroll/safe-area rules now
actually take effect.

`MobileSidebar.tsx` was reworked: primary navigation moved to a real bottom
nav bar (icon + label, thumb-reachable) instead of top tabs, touch targets
bumped to 44px+, swipe-to-close made panel-wide instead of edge-only, and
the FAB respects `env(safe-area-inset-*)`. Backend (MCP client, stores,
adapters, tool execution) is untouched.

## Overview
This document summarizes all changes made to create the mobile-friendly version of Nyx Control.

## Project Renaming
- **Old Name:** `nyx-control`
- **New Name:** `nyx-mobile`
- **Repository:** `https://github.com/alsania-dev/nyx-mobile.git`
- **Homepage:** `https://alsania-io.com/tools/nyx-mobile`

## Files Modified

### 1. package.json
- `name`: `nyx-mobile`, `version`: `1.0.2`
- `description`: "Nyx Mobile - Mobile Browser Extension for AI Automation"
- Repository/homepage point at `nyx-mobile`

### 2. chrome-extension/manifest.ts
- Extension name "Nyx Mobile", `browser_specific_settings.gecko.id` = `nyx-mobile@alsania-io.com`
- Version is read live from `package.json`, so it tracks automatically
- Dropped the `addons/mobile-detection.js` and `addons/mobile-sidebar-fix.js` content-script entries and the `content/mobile-sidebar-override.css` reference (all dead — see below)

### 3. pages/content/src/index.ts
- Unchanged. Desktop and mobile both boot through the same content script; `SidebarManager` picks the UI at render time.

## Active Mobile Files

### pages/content/src/components/sidebar/MobileSidebar.tsx
**Purpose:** Mobile-optimized sidebar component, rendered by `SidebarManager` inside the same Shadow DOM as desktop.
**Features:**
- Slide-in panel from the right, swipeable from anywhere on the panel
- Floating action button (FAB), safe-area aware, pulse animation
- Bottom navigation bar (icon + label) for Tools / Instructions / Settings — replaces the old top-tab layout for better thumb reach
- 44px+ touch targets throughout
- Overlay with blur backdrop
- Push Content and Auto-Submit toggles side-by-side under the header

### pages/content/src/mobile-sidebar.css
**Purpose:** Touch-target, scroll, safe-area, and FAB-pulse styling for the mobile sidebar.
**Note:** Imported directly by `MobileSidebar.tsx` — required, since anything injected at the page level (`document.head`) never reaches content inside a Shadow DOM.

### mobile-icon.svg
Mobile-specific icon asset (gradient background, phone icon, "MOBILE" badge).

## Deprecated (moved to `.deprecated/`)

| File | Why |
|---|---|
| `pages/content/src/mobile-entry.ts` | Dead — never imported by the actual build entry (`index.ts`); duplicate mobile-bootstrap path |
| `pages/content/src/mobile-init.ts` | Same — dead duplicate path |
| `addons/mobile-detection.js` | Injected a page-level flag nothing else consumed once the dead path above was removed |
| `addons/mobile-sidebar-fix.js` | Injected page-level `<style>` targeting `.sidebar`/`.nyx-sidebar` — can't reach Shadow DOM content, never had any effect |
| `content/mobile-sidebar-override.css` | Same problem — page-level CSS targeting Shadow DOM content |
| `chrome-extension/manifest.mobile.ts` | Unreferenced anywhere in the build (confirmed via full-repo search) |
| `BUILD_SUCCESS.md`, stray `dist/`, `nyx-mobile-1.0.2/` build output, `.xpi` files, `npm-debug.log`s | Build artifacts that shouldn't have been committed |

## Backend Components (Unchanged)

MCP client, tool execution, all AI platform adapters (ChatGPT, Claude, Gemini, DeepSeek, Perplexity, Grok, OpenRouter, Copilot, etc.), memory/context handling, event system, store management, and the plugin system are untouched. Mobile and desktop share this backend entirely — only the sidebar UI component differs.

## Mobile Detection Logic

`SidebarManager`'s `isMobileDevice()` (the one active detector now) checks:
1. User agent string (Android, iOS, etc.)
2. Screen width (< 768px)
3. Touch support (`ontouchstart`, `maxTouchPoints`)

## Mobile UI Changes

| Desktop | Mobile |
|---|---|
| Always visible (when toggled), resizable | Slides in from right, fixed width (max 88vw) |
| Minimize option | Swipe to close, or tap the X |
| Header with minimize button | Header with theme/refresh/close |
| Top tabs | Bottom navigation (icon + label) |

## Build Instructions

```bash
# Clean build
pnpm clean

# Install dependencies
pnpm install

# Build for Firefox (recommended for mobile)
pnpm build:firefox

# Package for distribution
pnpm zip:firefox
```

## Testing Checklist

- [ ] Build, load into Firefox Mobile, confirm FAB appears on a supported site
- [ ] Tap FAB, verify panel slides in and bottom nav switches tabs
- [ ] Swipe right anywhere on the panel to close
- [ ] Toggle theme, Push Content, Auto-Submit
- [ ] Confirm desktop sidebar is unaffected on a desktop browser

## Browser Support

| Browser | Support | Notes |
|---|---|---|
| Firefox Mobile | ✅ Full | Primary target |
| Kiwi Browser | ✅ Full | Android only |
| Edge Canary | ⚠️ Partial | Android only |
| Chrome Mobile | ❌ Limited | Extension support limited |
| Safari | ❌ None | No extension support |

## Version History

### v1.0.2 — Shadow DOM CSS fix + bottom nav rework
- Fixed mobile CSS never applying (page-level injection couldn't reach the Shadow DOM)
- Removed the dead duplicate mobile-init code path
- Real bottom navigation (icon + label) replacing top tabs
- Larger touch targets, safe-area-aware FAB
- Repo cleanup: build artifacts and unreferenced files moved to `.deprecated/`

### v1.0.1 — Initial Mobile Release
- Touch-optimized UI, mobile-specific sidebar, FAB, bottom navigation, swipe to close, safe area support

## Credits

- Original Nyx Control by Alsania I/O
- Mobile adaptation by Alsania I/O
- Touch guidelines from WCAG 2.1

---

**Last Updated:** 2026-08-08
**Status:** ✅ Mobile-ready (pending a local `pnpm build:firefox` verification)
