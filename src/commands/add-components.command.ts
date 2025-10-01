import * as vscode from "vscode";

import { getComponentsCatalog } from "../utils/catalog";
import { COMMANDS, PackageManager } from "../utils/constants";
import {
  detectPackageManagerByLockfile,
  executeTerminalCommand,
  getNuxtWorkspaceRoot,
  getWorkspaceConfigurations,
  loadOrInitUIThing,
  packageManagerRunner,
  promptCreateNuxtProject,
} from "../utils/helpers";

/**
 * Command that adds components from the UI Thing catalog to the Nuxt project.
 *
 * This command ensures:
 *
 * 1. The current workspace contains a Nuxt project, prompting to create one if absent.
 * 2. Ensures the `ui-thing.config` file is present, offering to initialize if missing.
 * 3. Loads the components catalog, utilizing caching with TTL.
 * 4. Presents a multi-select QuickPick for users to choose components to add.
 * 5. Constructs the appropriate CLI command based on user selections and package manager.
 * 6. Executes the command in the integrated terminal.
 */
export const addComponentsCommand = vscode.commands.registerCommand(
  COMMANDS.ADD_COMPONENTS,
  async () => {
    // 1) Ensure Nuxt workspace
    const cwd = await getNuxtWorkspaceRoot();
    // If no cwd is found, prompt the user to create a new Nuxt project
    if (!cwd) {
      // Prompt the user to create a new Nuxt project
      return await promptCreateNuxtProject();
    }

    // 2) Ensure ui-thing.config present (offer to init)
    const uiThingConfig = await loadOrInitUIThing(cwd);
    if (!uiThingConfig) return; // user canceled or still missing

    // 3) Load catalog (cached by TTL)
    const catalog = await getComponentsCatalog();

    if (!Array.isArray(catalog) || catalog.length === 0) {
      vscode.window.showWarningMessage("No components found in catalog.");
      return;
    }

    // 4) Multi-select QuickPick
    const picks = await vscode.window.showQuickPick(
      catalog.map((c) => ({
        label: c.name,
        description: `${c.value} • ${c.files.length} files will be added/updated`,
        picked: false,
        c,
      })),
      {
        canPickMany: true,
        title: "Add UI Thing components",
        matchOnDescription: true,
        placeHolder: "Search and select components...",
        ignoreFocusOut: true,
      }
    );
    if (!picks || picks.length === 0) return;

    const selected = picks.map((p) => p.c.value).filter(Boolean);
    if (selected.length === 0)
      return vscode.window.showInformationMessage("No components selected.");

    // 5) Build CLI command
    // Get the channel & package manager from user settings
    const { channel, packageManager } = getWorkspaceConfigurations();
    // Detect the package manager in use
    const detectedManager =
      packageManager === "auto"
        ? detectPackageManagerByLockfile(cwd)
        : (packageManager as PackageManager);
    // Get the package manager runner
    const runner = packageManagerRunner(detectedManager);

    const cmd = `${runner} ui-thing@${channel} add ${selected.join(" ")}`;

    // 6) Run in integrated terminal
    executeTerminalCommand({ command: cmd });
  }
);
