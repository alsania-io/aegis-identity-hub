# Nyx Mobile

## Mobile Browser Extension for AI Automation

Nyx Mobile is a mobile-optimized version of the Nyx Control browser extension, designed for Firefox Mobile and other mobile browsers that support extensions. It provides the same powerful AI automation capabilities with a touch-friendly interface.

## Features

### Mobile-Optimized UI
- **Touch-friendly interface** with 44px+ touch targets
- **Slide-out sidebar** with smooth animations
- **Floating action button** for quick access
- **Bottom navigation** for easy tab switching
- **Swipe to close** support
- **Safe area support** for notched phones

### Same Powerful Backend
- Full MCP (Model Context Protocol) support
- All AI platform integrations (ChatGPT, Claude, Gemini, etc.)
- Tool execution and automation
- Persistent memory and context
- Push content mode
- All existing features work exactly as before

## Installation

### Firefox Mobile
1. Download the `.xpi` file from the release
2. Open Firefox Mobile
3. Navigate to `about:addons`
4. Tap the gear icon → "Install Add-on From File"
5. Select the downloaded `.xpi` file

### Other Mobile Browsers
- Kiwi Browser (Android): Supports Chrome extensions
- Edge Canary: Supports some extensions
- Check your browser's extension documentation

## Development

### Project Structure
```
nyx-mobile/
├── addons/
│   ├── mobile-sidebar-fix.js    # Mobile touch optimizations
│   └── ... (other addons)
├── content/
│   └── mobile-sidebar-override.css
├── pages/content/src/
│   ├── components/sidebar/
│   │   ├── MobileSidebar.tsx    # Mobile-optimized sidebar
│   │   └── ...
│   └── mobile-entry.ts          # Mobile detection & loading
└── ...
```

### Key Mobile Components

#### MobileSidebar.tsx
Mobile-optimized sidebar with:
- Slide-in panel from the right
- Touch gesture support (swipe to close)
- Larger touch targets
- Bottom navigation tabs
- Floating action button for opening

#### mobile-sidebar-fix.js
Addon that provides:
- Touch event optimizations
- Mobile-specific CSS injection
- Touch feedback animations
- Double-tap zoom prevention

#### mobile-entry.ts
Entry point that:
- Detects mobile devices
- Conditionally loads mobile sidebar
- Falls back to desktop version if needed

## Building

```bash
# Install dependencies
pnpm install

# Build for all browsers
pnpm build

# Build specifically for Firefox
pnpm build:firefox

# Create .zip/.xpi package
pnpm zip
pnpm zip:firefox
```

## Differences from Desktop Version

### Changed
- Sidebar slides in from the right instead of being always visible
- Floating action button instead of always-visible sidebar toggle
- Bottom navigation for tabs
- Larger touch targets throughout
- Swipe gestures for closing

### Unchanged
- All backend functionality
- All AI platform integrations
- Tool execution
- Memory and context
- Push content mode
- Settings and preferences

## Mobile Detection

The extension automatically detects mobile devices based on:
- User agent string
- Screen size (< 768px)
- Touch support

## Browser Compatibility

### Fully Supported
- Firefox Mobile (Android)
- Firefox for iOS (limited extension support)

### Partial Support
- Kiwi Browser (Android)
- Edge Canary (Android)

### Not Supported
- Safari (no extension support on iOS)
- Chrome Mobile (limited extension support)

## Known Issues

1. Some AI platforms may have mobile-specific UI differences
2. Push content mode may behave differently on mobile layouts
3. Very small screens (< 320px) may cause layout issues
4. Some browsers may not support all extension APIs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on mobile devices
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Links

- [GitHub Repository](https://github.com/alsania-dev/nyx-mobile)
- [Documentation](https://alsania-io.com/tools/nyx-mobile)
- [Issues](https://github.com/alsania-dev/nyx-mobile/issues)

---

**Built with ❤️ by Alsania I/O**