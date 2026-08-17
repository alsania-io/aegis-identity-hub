#!/bin/bash
# Copy addons to build directory for Aegis Identity Hub

echo "Copying addons to build..."

# Ensure addons directory exists in build
mkdir -p dist/addons

# Copy all adapter files
cp addons/*.js dist/addons/

echo "Addons copied successfully to dist/addons/"
ls -la dist/addons/
