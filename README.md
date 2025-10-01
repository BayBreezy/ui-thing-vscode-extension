<p align="center">
  <a href="https://uithing.com" target="_blank" rel="noopener noreferrer">
    <img src="https://uithing.com/icon.png" style="border-radius: 12px; border: 1px solid #eee;" alt="UI Thing Logo" width="100" />
  </a>
</p>

# UI Thing — VS Code Extension

Bring the UI Thing Nuxt component library into VS Code. This extension wraps the `ui-thing` CLI so you can scaffold projects, manage themes, pull components, and keep snippets close to hand without leaving the editor.

> UI Thing is a Nuxt-first component library focused on accessibility, TypeScript DX, and fast iteration. Learn more at [uithing.com](https://uithing.com/).

## Feature Highlights

- Detect Nuxt workspaces automatically (looks for `nuxt.config.*`) and guide you into project creation if one is missing.
- Run common UI Thing CLI workflows (`init`, `add`, `theme`, `prettier`, `shortcuts`) directly from the Command Palette with package-manager aware runners (`npx`, `pnpm dlx`, `yarn dlx`, `bunx`).
- Cache the hosted components catalog with a configurable TTL so catalog-driven pickers stay responsive.
- Preload catalog data on activation and expose a manual refresh to keep components up to date.
- Ship snippets for the full UI Thing component set so you can drop examples into `.vue` files instantly(WIP)
- Log extension actions to a dedicated **UI Thing** output channel for easy auditing.

## Commands

| Title (Palette)                     | Identifier                  | What it does                                                                                                 |
| ----------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| UI Thing: Create Nuxt project       | `uithing.createNuxtProject` | Prompts for a folder, then runs `npx nuxi@latest init <folder>` in a terminal.                               |
| UI Thing: Initialize                | `uithing.init`              | Detects/asks for a Nuxt workspace, chooses a package manager, and runs `ui-thing init` via the right runner. |
| UI Thing: Add Components            | `uithing.addComponents`     | Loads the catalog, lets you multi-select entries, and runs `ui-thing add ...` with your selections.          |
| UI Thing: Change Theme              | `uithing.theme`             | Lets you pick from predefined CSS themes and runs `ui-thing theme <value>`.                                  |
| UI Thing: Add .prettierrc           | `uithing.prettier`          | Adds the opinionated Prettier config by running `ui-thing prettier` in the workspace.                        |
| UI Thing: Add shortcuts composable  | `uithing.shortcuts`         | Executes `ui-thing shortcuts` to scaffold the shortcuts helpers.                                             |
| UI Thing: Refresh Cached Components | `uithing.refreshCatalog`    | Forces a refetch of the remote catalog and refreshes the global-state cache.                                 |

All commands open an integrated terminal named **UI Thing** with the extension icon so you can interact or cancel as needed.

## Configuration

Settings live under `ui-thing` in VS Code preferences:

- `uithing.packageManager` (`auto` \| `npm` \| `pnpm` \| `yarn` \| `bun`, default `auto`): choose the CLI runner shown in logs and used for commands.
- `uithing.cliChannel` (string, default `latest`): pin the CLI channel/version (for example `next` or a tagged release).
- `uithing.catalog.cacheTTL` (number, default `86400`): cache lifetime in seconds for the components catalog. Set `0` to disable caching.

## Activation

The extension activates when:

- A workspace contains a `nuxt.config.*` file (`ts`, `js`, `mjs`, or `cjs`), or
- You open a Vue file (`onLanguage:vue`).

On activation it preloads the catalog unless a fresh cache already exists.

## Requirements

- VS Code `^1.104.0`
- Node.js `>= 20`
- Nuxt project in the workspace (otherwise you can bootstrap one with the **Create Nuxt project** command).
- Network access to `https://uithing.com/api/components` for catalog operations.

## Quick Start

1. Open a Nuxt workspace (folder containing `nuxt.config.ts|js|mjs|cjs`).
2. Run **UI Thing: Initialize** from the Command Palette to scaffold UI Thing via the CLI.
3. Use **UI Thing: Add Components** to pull in components from the catalog.
4. Personalize the design with **UI Thing: Change Theme** and keep formatting consistent with **UI Thing: Add .prettierrc**.
5. Sync future catalog updates with **UI Thing: Refresh Cached Components**.

If no Nuxt config is detected, you’ll be prompted to create one using `nuxi`. Canceling leaves the workspace untouched.

## Component Catalog & Caching

- Catalog data is fetched from `https://uithing.com/api/components` and stored in the global extension state.
- The cache uses the configured TTL (`uithing.catalog.cacheTTL`). When stale, the next catalog access triggers a fresh fetch.
- Use **Refresh Cached Components** any time you want to force an update.
- Errors surface as VS Code notifications and log entries in the **UI Thing** output channel.

## Troubleshooting

- **Nuxt project not found**: ensure your workspace root contains a `nuxt.config.*` file or run **Create Nuxt project** to scaffold one.
- **Package manager mismatch**: set `uithing.packageManager` explicitly if you keep multiple lockfiles.
- **Catalog fetch errors**: verify network access to `uithing.com` and, if needed, lower `cacheTTL` to retry more frequently.
- **Commands not running**: confirm Node.js ≥ 20 is on your PATH and the chosen package manager is installed.

## Resources

- UI Thing website: <https://uithing.com>
- UI Thing CLI: install via your preferred package runner (`npx ui-thing`, `pnpm dlx ui-thing`, etc.).
- Follow progress and roadmap updates on social channels linked from the website.

## License

MIT © Behon Baker — see [LICENSE.md](LICENSE.md).
