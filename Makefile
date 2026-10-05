# Aegis Identity Hub Makefile
PROJECT_NAME=aegis-identity-hub
NPM=pnpm
 
# Default target
all: install build test
 
# Init and set global environment
init:
	@echo "Initializing..."
	$(NPM) install
	$(NPM) run copy_env
 
# Install dependencies (run at root for monorepo)
install:
	@echo "Installing dependencies for $(PROJECT_NAME)..."
	$(NPM) install

# Build the project (using turbo for monorepo)
build:
	@echo "Building $(PROJECT_NAME)..."
	$(NPM) run base-build

# Run tests (using turbo for monorepo)
test:
	@echo "Running tests for $(PROJECT_NAME)..."
	$(NPM) run type-check

# Run e2e tests
e2e:
	@echo "Running e2e tests..."
	$(NPM) run e2e

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	$(NPM) run clean

# Lint the code (using turbo for monorepo)
lint:
	@echo "Linting code..."
	$(NPM) run lint

# Format code (using turbo for monorepo)
format:
	@echo "Formatting code..."
	$(NPM) run prettier

# Dev mode
dev:
	@echo "Starting development mode..."
	$(NPM) run dev

# Package extension
package:
	@echo "Packaging Chrome Extension..."
	$(NPM) run zip

# Help
help:
	@echo "Available targets for $(PROJECT_NAME):"
	@echo "  all       - Install, build, and test everything"
	@echo "  init      - Initialize"
	@echo "  install   - Install dependencies"
	@echo "  build     - Build the project"
	@echo "  test      - Run type-check"
	@echo "  e2e       - Run e2e tests"
	@echo "  clean     - Clean build artifacts"
	@echo "  lint      - Lint code"
	@echo "  format    - Format code"
	@echo "  dev       - Start development mode"
	@echo "  package   - Package the extension"
	@echo "  help      - Show this help"

.PHONY: all init install build test e2e clean lint format dev package help
