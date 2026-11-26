# Change Log

All notable changes to the UI Thing extension will be documented in this file.

## v0.1.0

[compare changes](https://github.com/BayBreezy/ui-thing-vscode-extension/compare/v0.0.1...v0.1.0)

### 🚀 Enhancements

- Add UI Thing sidebar and commands for CLI 0.4.1 ([946557c](https://github.com/BayBreezy/ui-thing-vscode-extension/commit/946557c))

### 🩹 Fixes

- Pin @types/vscode to the engines version so vsce can package ([1abd0d2](https://github.com/BayBreezy/ui-thing-vscode-extension/commit/1abd0d2))

### 📖 Documentation

- **readme:** Document the sidebar, new commands, MCP server and settings ([7463471](https://github.com/BayBreezy/ui-thing-vscode-extension/commit/7463471))

### 🏡 Chore

- Update dependencies and devDependencies to latest versions ([9870047](https://github.com/BayBreezy/ui-thing-vscode-extension/commit/9870047))
- Include CHANGELOG.md in the packaged extension ([4ac7e68](https://github.com/BayBreezy/ui-thing-vscode-extension/commit/4ac7e68))

### ✅ Tests

- Add unit tests and extension-host smoke tests ([580229b](https://github.com/BayBreezy/ui-thing-vscode-extension/commit/580229b))

### ❤️ Contributors

- Behon Baker ([@BayBreezy](https://github.com/BayBreezy))

## v0.0.1

### 🚀 Launched

- Add commands for managing UI Thing components and Nuxt projects ([e026099](https://github.com/BayBreezy/ui-thing-vscode-extension/commit/e026099))

A small list of what was done:

- Implemented `add-components` command to add components from the UI Thing catalog.
- Created `create-nuxt-project` command to prompt users for new Nuxt project creation.
- Added `init` command to initialize UI Thing in a Nuxt project.
- Introduced `prettier` command to add a Prettier configuration to the project.
- Developed `refresh-catalog` command to refresh the components catalog.
- Added `shortcuts` command to include shortcuts composables in the project.
- Implemented `theme` command to allow users to select and set a CSS theme.
- Created utility functions for managing components catalog and workspace configurations.
- Established context container for managing extension context.
- Added TypeScript configuration and build setup for the extension.

### ❤️ Contributors

- Behon Baker ([@BayBreezy](https://github.com/BayBreezy))
