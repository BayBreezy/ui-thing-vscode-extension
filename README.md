<p align="center">
  <a href="https://uithing.com" target="_blank" rel="noopener noreferrer">
    <img src="https://uithing.com/icon.png" style="border-radius: 12px; border: 1px solid #eee;" alt="UI Thing Logo" width="100" />
  </a>
</p>

# UI Thing — VS Code Extension

Use [UI Thing](https://uithing.com) without leaving VS Code. Browse and add components and blocks, install items from shadcn-style registries such as Vue Bits and NXUI, compare your copies with the latest version in VS Code's diff editor, and give Copilot the UI Thing MCP server.

The extension drives the [`ui-thing` CLI](https://www.npmjs.com/package/ui-thing), so everything it does is what the CLI does. Commands run in a **UI Thing** terminal, where you can watch and answer any prompts.

## Install

Download `ui-thing-vscode-extension-<version>.vsix` from the [latest release](https://github.com/BayBreezy/ui-thing-vscode-extension/releases/latest), then in VS Code open the **Extensions** view, click `···` and choose **Install from VSIX…**. Or from a terminal:

```bash
code --install-extension ui-thing-vscode-extension-0.1.0.vsix
```

Use `cursor` or `windsurf` instead of `code` for Cursor and Windsurf. Extensions installed this way don't update themselves, so check the [releases](https://github.com/BayBreezy/ui-thing-vscode-extension/releases) for new versions.

## Features

- **UI Thing sidebar** in the Activity Bar:
  - **Installed**: the components and registry items in your project. Hover an item to open its docs, compare it with the latest version, update it or remove it. Click it to open the file.
  - **Components**: the whole catalog, with installed components marked. Click one to read its source, or add it with the `+` button.
  - **Blocks**: ready-made page sections by category (heroes, pricing, dashboards, sign-in pages and more). Click one to read its source, or add it.
- **Native diffs.** **Compare with Latest Version** opens your file next to the latest upstream source in VS Code's diff editor, then offers to update.
- **Registries.** **Add from Registry** browses `@vue-bits`, `@nxui` and any namespace in your `ui-thing.config.ts`. You can also paste a URL or `@namespace/name`.
- **MCP for Copilot.** The extension registers the UI Thing MCP server (`https://uithing.com/mcp`) with VS Code. Copilot agent mode gets the exact source, docs and install plans for every component and block, with no `mcp.json` to write.
- **Agent setup.** Connect the MCP server to Claude Code, Cursor, Codex, Windsurf or Claude Desktop, and install the UI Thing agent skill.
- **Package manager aware.** Commands run with `npx`, `pnpm dlx`, `yarn dlx`, `bunx` or `deno run`, detected from your lockfile.
- **Snippets** for UI Thing component examples in `.vue` files (work in progress).

## Commands

Open the Command Palette and type **UI Thing**.

| Command                       | What it runs                       | Notes                                                                                     |
| ----------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Create Nuxt Project           | `npm create nuxt@latest <dir>`     | Uses your package manager setting.                                                        |
| Initialize                    | `ui-thing init [--yes]`            | Quick setup with defaults, or answer the questions. Already set up? Re-run or start over. |
| Project Info                  | `ui-thing info`                    | Versions, folders, installed components and setup warnings.                               |
| Add Components                | `ui-thing add <names>` / `--all`   | Searchable multi-select; installed components are marked.                                 |
| Add Blocks                    | `ui-thing block <ids>`             | Pick a category, then the blocks.                                                         |
| Add from Registry             | `ui-thing add @ns/name <url>`      | Browse a registry index or paste refs.                                                    |
| Add Registry Namespace        | `ui-thing registry add-namespace`  | Saves `@ns` and its URL template to `ui-thing.config.ts`.                                 |
| Compare with Latest Version   | (diff editor) / `ui-thing diff`    | UI Thing components open in the diff editor; registry items diff in the terminal.         |
| Update Components             | `ui-thing update <names>`          | Asks first: update replaces files and does not merge.                                     |
| Remove Components             | `ui-thing remove <names>`          | Asks first.                                                                               |
| View Component Source         | (read-only editor)                 | The latest upstream files.                                                                |
| Open Component Docs           | (browser)                          | Opens the component's page on uithing.com.                                                |
| Change Theme                  | `ui-thing theme <name> --yes`      | Asks before replacing your Tailwind CSS file.                                             |
| Add Prettier Config           | `ui-thing prettier`                |                                                                                           |
| Add Shortcuts Composable      | `ui-thing shortcuts`               |                                                                                           |
| Connect MCP Server to Project | `ui-thing mcp init --client <c>`   | Claude Code, Cursor, VS Code, Codex, Windsurf, Claude Desktop.                            |
| Install Agent Skill           | `npx skills add … --skill uithing` | Teaches coding agents how to build with UI Thing.                                         |
| Refresh Catalog               |                                    | Re-downloads the components and blocks catalogs.                                          |

The sidebar buttons run the same commands for the item you clicked, or for every item you selected.

## Settings

| Setting                    | Default                   | Description                                                                                      |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `uithing.packageManager`   | `auto`                    | `auto`, `npm`, `pnpm`, `yarn`, `bun` or `deno`. `auto` reads your lockfile.                      |
| `uithing.cliChannel`       | `latest`                  | Version or dist-tag of the CLI to run, for example `0.4.1`.                                      |
| `uithing.catalog.cacheTTL` | `86400`                   | Seconds to cache the components and blocks catalogs. `0` always fetches.                         |
| `uithing.mcp.enabled`      | `true`                    | Provide the UI Thing MCP server to VS Code. Turn off if you configure it yourself in `mcp.json`. |
| `uithing.mcp.url`          | `https://uithing.com/mcp` | Server URL. Use `http://localhost:3000/mcp` when working on the UI Thing site locally.           |

## Quick start

1. Open a Nuxt project (a folder with `nuxt.config.*`), or run **UI Thing: Create Nuxt Project**.
2. Open the **UI Thing** sidebar and click **Initialize UI Thing** (or run **UI Thing: Initialize**).
3. Add components from the **Components** view or with **UI Thing: Add Components**, and page sections from **Blocks**.
4. Edited a component and want the latest fixes? Hover it in **Installed** and click **Compare with Latest Version**.
5. In Copilot Chat, switch to agent mode and ask it to build a page with UI Thing. The UI Thing MCP tools are already available.

## Requirements

- VS Code `1.104` or newer (the MCP integration needs VS Code's MCP API; other editors skip it).
- Node.js 20 or newer, and the package manager your project uses.
- `ui-thing` CLI 0.4.1 or newer. The extension runs `ui-thing@latest` by default, so there is nothing to install.
- Network access to `uithing.com` for the catalog, and to any registry you use.

## Troubleshooting

- **"No Nuxt project found"**: the extension looks for `nuxt.config.*` at the root of each workspace folder.
- **Wrong runner**: set `uithing.packageManager` if your project has more than one lockfile.
- **Catalog errors**: check your connection, then run **UI Thing: Refresh Catalog**. A cached copy is used while offline.
- **A registry will not load**: private registries that need headers are loaded by the CLI. Choose **List in Terminal** when prompted.
- Every command the extension runs is logged in the **UI Thing** output channel.

## Development

```bash
npm install
npm run dev        # rebuild on change and reinstall into your local VS Code profile
npm run typecheck && npm run lint && npm run knip
npm test           # unit tests (vitest)
npm run test:e2e   # extension-host tests against test/fixtures/nuxt-app (downloads VS Code, needs network)
npm run package    # build the .vsix
```

## License

MIT © Behon Baker — see [LICENSE.md](LICENSE.md).
