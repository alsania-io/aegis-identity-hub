#!/bin/bash
# Build Aegis Identity Hub to dist folder

cd /home/sigma/Desktop/echo-lab/aegis-identity-hub

echo "Building Aegis Identity Hub v2.0.0 to dist folder..."

# Clean dist
rm -rf dist
mkdir -p dist
mkdir -p dist/addons

# Run the build
pnpm build

# Copy addons to dist
cp -r addons/*.js dist/addons/ 2>/dev/null || true

# Copy static assets to dist
cp chrome-extension/public/* dist/ 2>/dev/null || true

# Copy content files
if [ -d "pages/content/dist" ]; then
  cp -r pages/content/dist/* dist/content/ 2>/dev/null || true
fi

# Copy popup files if they exist
if [ -d "pages/popup/dist" ]; then
  cp -r pages/popup/dist/* dist/popup/ 2>/dev/null || true
fi

echo "✅ Build complete! Extension is in: dist/"
echo ""
echo "To load in Chrome:"
echo "1. Open chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked'"
echo "4. Select: $(pwd)/dist"
