#!/bin/bash
# Quick build script for Aegis Identity Hub

cd /home/sigma/Desktop/echo-lab/aegis-identity-hub

echo "Building Aegis Identity Hub..."

# Run the build
pnpm build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"

    # Copy addons to the build
    echo "Copying addons to build..."
    mkdir -p dist/addons
    cp addons/*.js dist/addons/ 2>/dev/null || echo "No addons to copy"

    echo ""
    echo "✅ Extension built to: dist/"
    echo "✅ Addons included in: dist/addons/"
    echo ""
    echo "To load the extension in Chrome:"
    echo "1. Open chrome://extensions/"
    echo "2. Enable Developer mode"
    echo "3. Click 'Load unpacked'"
    echo "4. Select: $(pwd)/dist"
else
    echo "❌ Build failed. Check the error messages above."
    exit 1
fi
