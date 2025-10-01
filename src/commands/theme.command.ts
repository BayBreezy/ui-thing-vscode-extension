import { commands, window } from "vscode";

import { COMMANDS, CSS_THEME_OPTIONS, PackageManager } from "../utils/constants";
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
 * Command that allows users to select and set a CSS theme for their Nuxt project.
 */
export const themeCommand = commands.registerCommand(COMMANDS.THEME, async () => {
  // Ensure Nuxt workspace
  const cwd = await getNuxtWorkspaceRoot();
  // If no cwd is found, prompt the user to create a new Nuxt project
  if (!cwd) {
    // Prompt the user to create a new Nuxt project
    return await promptCreateNuxtProject();
  }

  // Ensure ui-thing.config present (offer to init)
  const uiThingConfig = await loadOrInitUIThing(cwd);
  if (!uiThingConfig) return; // user canceled or still missing

  // Allow user to pick theme they want to add
  const selectedTheme = await window.showQuickPick(
    CSS_THEME_OPTIONS.map((theme) => ({
      label: theme.title,
      description: `Set CSS theme to ${theme.title}`,
      theme,
    })),
    { ignoreFocusOut: true, title: "Select CSS theme" }
  );
  if (!selectedTheme)
    return window.showInformationMessage("No theme selected, operation cancelled.");

  // Get the channel & package manager from user settings
  const { channel, packageManager } = getWorkspaceConfigurations();
  // Detect the package manager in use
  const detectedManager =
    packageManager === "auto"
      ? detectPackageManagerByLockfile(cwd)
      : (packageManager as PackageManager);
  // Get the package manager runner
  const runner = packageManagerRunner(detectedManager);

  const cmd = `${runner} ui-thing@${channel} theme ${selectedTheme.theme.value}`;
  //  Run in integrated terminal
  executeTerminalCommand({ command: cmd });
});
