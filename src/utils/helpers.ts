import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "c12";
import * as vscode from "vscode";
import type { ExecuteTerminalCommand, UiThingConfig } from "./types";

import { COMMANDS, CONFIG_NAME, PackageManager } from "./constants";
import { ContextContainer } from "./context-container";

export const getWorkspaceConfigurations = () => {
  const config = vscode.workspace.getConfiguration();
  return {
    channel: config.get<string>("uithing.cliChannel", "latest"),
    cacheTTL: config.get<number>("uithing.catalog.cacheTTL", 86400),
    packageManager: config.get<string>("uithing.packageManager", "auto"),
  };
};

/**
 * Returns the TTL in milliseconds from workspace configuration.
 */
export function getTTLms(): number {
  const { cacheTTL } = getWorkspaceConfigurations();
  return cacheTTL * 1000;
}

export const getOutputChannel = () => {
  return vscode.window.createOutputChannel("UI Thing", { log: true });
};

/**
 * Returns the CLI command prefix based on the package manager.
 *
 * @example
 * ```ts
 * packageManagerRunner('npm'); // 'npx -y'
 * packageManagerRunner('yarn'); // 'yarn dlx'
 * packageManagerRunner('pnpm'); // 'pnpm dlx'
 * packageManagerRunner('bun'); // 'bunx'
 * ```
 */
export const packageManagerRunner = (pm: PackageManager): string => {
  switch (pm) {
    case "pnpm":
      return "pnpm dlx";
    case "yarn":
      return "yarn dlx";
    case "bun":
      return "bunx";
    default:
      return "npx -y";
  }
};

/**
 * Check if the current workspace has a Nuxt config file.
 *
 * Returns the `cwd` if found, otherwise shows an error and returns null.
 */
export async function getNuxtWorkspaceRoot() {
  // Find the first workspace folder
  let folder = vscode.workspace.workspaceFolders?.[0];
  // If there are multiple workspace folders, prompt the user to select one
  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1) {
    const selection = await vscode.window.showWorkspaceFolderPick({
      placeHolder: "Select the Nuxt workspace to initialize UI Thing in",
    });
    folder = selection ?? folder;
  }
  // If no folder is found or selected, return null
  if (!folder) return null;
  // Get the current working directory
  const cwd = folder.uri.fsPath;
  // Check for Nuxt config files
  const possibleConfigs = [
    "nuxt.config.ts",
    "nuxt.config.js",
    "nuxt.config.mjs",
    "nuxt.config.cjs",
  ];
  // Check if any of the possible config files exist
  const hasNuxtConfig = possibleConfigs.some((file) => fs.existsSync(path.join(cwd, file)));
  // If no config file is found, return null
  if (!hasNuxtConfig) return null;
  // If a config file is found, return the current working directory
  return cwd;
}

/**
 * Executes a command in the terminal.
 */
export const executeTerminalCommand = ({ command, options = {} }: ExecuteTerminalCommand) => {
  const iconPath = vscode.Uri.joinPath(
    ContextContainer.context.extensionUri,
    "assets",
    "icons",
    "ui-thing-logo.svg"
  );

  const terminal = vscode.window.createTerminal({
    name: "UI Thing",
    iconPath,
    ...options,
  });

  terminal.show(false);
  terminal.sendText(command);
};

/**
 * Prompts the user to create a new Nuxt project.
 */
export const createNuxtProject = async () => {
  // ask user for the folder they want to create the project in
  const folder = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    placeHolder: "Enter the folder path to create the Nuxt project in",
    value: ".",
    prompt: "This value will be passed to the `init` command",
    title: "Folder Path",
    validateInput(value) {
      return value ? null : "Folder path is required.";
    },
  });
  if (folder === undefined)
    return vscode.window.showErrorMessage("Project creation cancelled. No folder path provided.");
  vscode.window.showInformationMessage("🚀 Creating a new Nuxt project");
  const out = getOutputChannel();
  out.appendLine("🚀 Creating a new Nuxt project");
  executeTerminalCommand({ command: `npx nuxi@latest init ${folder}` });
};

/**
 * Detects the package manager used in the given directory by checking for lock files.
 *
 * If no known lock file is found, defaults to 'npm'.
 */
export function detectPackageManagerByLockfile(cwd: string): PackageManager {
  const P = (f: string) => fs.existsSync(path.join(cwd, f));
  if (P("pnpm-lock.yaml")) return "pnpm";
  if (P("yarn.lock")) return "yarn";
  if (P("bun.lockb")) return "bun";
  if (P("package-lock.json")) return "npm";
  return "npm";
}

/**
 * Prompts the user to create a new Nuxt project if none is found in the workspace.
 */
export async function promptCreateNuxtProject() {
  const res = await vscode.window.showInformationMessage(
    "Nuxt project not found in the workspace.",
    "Create One",
    "Cancel"
  );
  if (res !== "Create One") return false;
  await createNuxtProject();
  return true;
}

/**
 * Loads the UI Thing configuration or as the user to initialize it if not found.
 */
export async function loadOrInitUIThing(cwd: string) {
  const { config } = await loadConfig<UiThingConfig>({ cwd, name: CONFIG_NAME });
  if (config) return config;
  // If we reach here, no config found
  const pick = await vscode.window.showWarningMessage(
    "No config found. Initialize UI Thing now?",
    "Yes, run Init",
    "Cancel"
  );
  if (pick === "Yes, run Init") {
    await vscode.commands.executeCommand(COMMANDS.INIT);
  }
  return null;
}
