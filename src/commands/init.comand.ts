import * as vscode from "vscode";

import { COMMANDS, PackageManager } from "../utils/constants";
import {
  detectPackageManagerByLockfile,
  executeTerminalCommand,
  getNuxtWorkspaceRoot,
  getOutputChannel,
  getWorkspaceConfigurations,
  packageManagerRunner,
  promptCreateNuxtProject,
} from "../utils/helpers";

/**
 * Command that initializes the UI Thing in a Nuxt project.
 *
 * This command ensures:
 *
 * 1. The current workspace contains a Nuxt project, prompting to create one if absent.
 * 2. Logs the initialization process to an output channel.
 * 3. Determines the package manager to use, either from user settings or by detecting lock files.
 *
 */
export const initCommand = vscode.commands.registerCommand(COMMANDS.INIT, async () => {
  // Get the current working directory
  const cwd = await getNuxtWorkspaceRoot();
  // If no cwd is found, prompt the user to create a new Nuxt project
  if (!cwd) {
    // Prompt the user to create a new Nuxt project
    return await promptCreateNuxtProject();
  }
  // Log action in output channel
  const out = getOutputChannel();
  out.appendLine(`🚀 Initializing UI Thing at: ${cwd}`);
  // Get the channel & package manager from user settings
  const { channel, packageManager } = getWorkspaceConfigurations();
  // Detect the package manager in use
  const detectedManager =
    packageManager === "auto"
      ? detectPackageManagerByLockfile(cwd)
      : (packageManager as PackageManager);
  // Get the package manager runner
  const runner = packageManagerRunner(detectedManager);
  // Construct the command to initialize the UI Thing
  const cmd = `${runner} ui-thing@${channel} init`;
  // Execute the command
  executeTerminalCommand({ command: cmd });
});
