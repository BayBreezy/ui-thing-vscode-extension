import { commands } from "vscode";

import { COMMANDS, PackageManager } from "../utils/constants";
import {
  detectPackageManagerByLockfile,
  executeTerminalCommand,
  getNuxtWorkspaceRoot,
  getWorkspaceConfigurations,
  packageManagerRunner,
  promptCreateNuxtProject,
} from "../utils/helpers";

/**
 * Command that allows you to add an opinionated prettier config to your project.
 */
export const prettierCommand = commands.registerCommand(COMMANDS.PRETTIER, async () => {
  // Ensure Nuxt workspace
  const cwd = await getNuxtWorkspaceRoot();
  // If no cwd is found, prompt the user to create a new Nuxt project
  if (!cwd) {
    // Prompt the user to create a new Nuxt project
    return await promptCreateNuxtProject();
  }

  // Get the channel & package manager from user settings
  const { channel, packageManager } = getWorkspaceConfigurations();
  // Detect the package manager in use
  const detectedManager =
    packageManager === "auto"
      ? detectPackageManagerByLockfile(cwd)
      : (packageManager as PackageManager);
  // Get the package manager runner
  const runner = packageManagerRunner(detectedManager);

  const cmd = `${runner} ui-thing@${channel} prettier`;
  //  Run in integrated terminal
  executeTerminalCommand({ command: cmd });
});
