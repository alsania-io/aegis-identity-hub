#!/bin/bash

# Aegis Identity Hub Build Script
# Builds the mobile-optimized Aegis Identity Hub

set -e

echo "📱 Building Aegis Identity Hub..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed. Please install pnpm first.${NC}"
    exit 1
fi

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
pnpm clean:bundle 2>/dev/null || true

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    pnpm install
fi

# Build for Firefox (recommended for mobile)
echo -e "${YELLOW}🔨 Building for Firefox Mobile...${NC}"
pnpm build:firefox

# Check if build was successful
if [ -f "dist/aegis-identity-firefox.zip" ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo -e "${GREEN}📁 Package: dist/aegis-identity-firefox.zip${NC}"

    # Rename for mobile
    cp dist/aegis-identity-hub-firefox.zip dist/aegis-identity-firefox.xpi
    echo -e "${GREEN}📁 Mobile package: dist/aegis-identity-firefox.xpi${NC}"

    # Show file size
    SIZE=$(du -h dist/aegis-identity-firefox.xpi | cut -f1)
    echo -e "${GREEN}📊 Package size: ${SIZE}${NC}"

    echo ""
    echo -e "${GREEN}🎉 Aegis Identity Hub build complete!${NC}"
    echo ""
    echo "📋 Installation instructions:"
    echo "  1. Transfer dist/aegis-identity-firefox.xpi to your mobile device"
    echo "  2. Open Firefox Mobile"
    echo "  3. Navigate to about:addons"
    echo "  4. Tap the gear icon → 'Install Add-on From File'"
    echo "  5. Select the .xpi file"
    echo ""
    echo "📚 For more details, see README.md"
else
    echo -e "${RED}❌ Build failed. Please check the errors above.${NC}"
    exit 1
fi