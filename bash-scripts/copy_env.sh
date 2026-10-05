#!/bin/bash

# Check if .env does not exist and .example.env exists
if [ ! -f ".env" ] && [ -f ".example.env" ]; then
    # Copy .example.env to .env
    cp .example.env .env
    echo ".example.env has been copied to .env"
fi

# Ensure workspace packages are symlinked in node_modules/@extension
mkdir -p node_modules/@extension
for pkg in packages/*; do
    if [ -d "$pkg" ]; then
        name=$(basename "$pkg")
        ln -sfn "../../$pkg" "node_modules/@extension/$name"
    fi
done
