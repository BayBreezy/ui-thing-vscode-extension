import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "c12";
import * as vscode from "vscode";
import type { ExecuteTerminalCommand, UiThingConfig } from "./types";

import { buildCliCommand, buildCreateNuxtCommand, resolvePackageManager } from "./cli";
import { COMMANDS, CONFIG_NAME } from "./constants";
import { ContextContainer } from "./context-container";
import { hasNuxtConfig } from "./project";

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

let outputChannel: vscode.LogOutputChannel | undefined;

/** The single "UI Thing" output channel. */
export const getOutputChannel = () => {
  outputChannel ??= vscode.window.createOutputChannel("UI Thing", { log: true });
  return outputChannel;
};

/** Workspace folders that contain a `nuxt.config.*` file. */
export function findNuxtRoots(): string[] {
  return (vscode.workspace.workspaceFolders ?? [])
    .map((folder) => folder.uri.fsPath)
    .filter((cwd) => hasNuxtConfig(cwd));
}

/**
 * Check if the current workspace has a Nuxt config file.
 *
 * Returns the `cwd` if found (asking which one when there are several), otherwise null.
 */
async function getNuxtWorkspaceRoot(): Promise<string | null> {
  const roots = findNuxtRoots();
  if (roots.length <= 1) return roots[0] ?? null;
  const pick = await vscode.window.showQuickPick(
    roots.map((root) => ({ label: path.basename(root), description: root, root })),
    { placeHolder: "Select the Nuxt project", ignoreFocusOut: true }
  );
  return pick?.root ?? null;
}

const terminals = new Map<string, vscode.Terminal>();
const busy = new Set<vscode.Terminal>();

/** Keeps the terminal map in sync; call once on activation. */
export function trackTerminals(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((terminal) => {
      busy.delete(terminal);
      for (const [key, t] of terminals) if (t === terminal) terminals.delete(key);
    }),
    vscode.window.onDidStartTerminalShellExecution((e) => busy.add(e.terminal)),
    vscode.window.onDidEndTerminalShellExecution((e) => busy.delete(e.terminal))
  );
}

/**
 * Runs a command in the "UI Thing" terminal for `cwd`, reusing it unless a command is still running there.
 */
export const executeTerminalCommand = ({ command, cwd, options = {} }: ExecuteTerminalCommand) => {
  const key = cwd ?? "";
  let terminal = terminals.get(key);
  if (!terminal || terminal.exitStatus !== undefined || busy.has(terminal)) {
    const iconPath = vscode.Uri.joinPath(
      ContextContainer.context.extensionUri,
      "assets",
      "icons",
      "ui-thing-logo.svg"
    );
    const multiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
    terminal = vscode.window.createTerminal({
      name: multiRoot && cwd ? `UI Thing (${path.basename(cwd)})` : "UI Thing",
      iconPath,
      cwd,
      ...options,
    });
    terminals.set(key, terminal);
  }
  getOutputChannel().info(`${cwd ? `[${cwd}] ` : ""}${command}`);
  terminal.show(false);
  terminal.sendText(command);
};

/** Runs `ui-thing <args>` in the project with the configured runner and CLI channel. */
export function runCli(args: string[], cwd: string) {
  const { channel, packageManager } = getWorkspaceConfigurations();
  const pm = resolvePackageManager(packageManager, cwd);
  executeTerminalCommand({ command: buildCliCommand(args, { pm, channel, cwd }), cwd });
}

/**
 * Prompts the user to create a new Nuxt project.
 */
export const createNuxtProject = async () => {
  const folder = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    placeHolder: "my-app",
    prompt: "Folder to create the Nuxt project in (relative to the open folder, or . for here)",
    title: "Create Nuxt project",
    value: vscode.workspace.workspaceFolders?.length ? "." : "my-app",
    validateInput(value) {
      return value.trim() ? null : "Folder path is required.";
    },
  });
  if (folder === undefined) return;
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const { packageManager } = getWorkspaceConfigurations();
  const pm = packageManager === "auto" ? "npm" : resolvePackageManager(packageManager, cwd ?? "");
  getOutputChannel().info(`Creating a new Nuxt project in ${folder}`);
  executeTerminalCommand({ command: buildCreateNuxtCommand(folder.trim(), pm), cwd });
};

/**
 * Prompts the user to create a new Nuxt project if none is found in the workspace.
 */
async function promptCreateNuxtProject() {
  const res = await vscode.window.showInformationMessage(
    "Nuxt project not found in the workspace.",
    "Create One",
    "Cancel"
  );
  if (res !== "Create One") return false;
  await createNuxtProject();
  return true;
}

const CONFIG_EXTENSIONS = [".ts", ".mts", ".js", ".mjs", ".cjs", ".json"];

const hasUIThingConfig = (cwd: string) =>
  CONFIG_EXTENSIONS.some((ext) => fs.existsSync(path.join(cwd, `${CONFIG_NAME}${ext}`)));

/** Reads `ui-thing.config.*`, or null when the project is not initialized. */
export async function loadUIThingConfig(cwd: string): Promise<UiThingConfig | null> {
  if (!hasUIThingConfig(cwd)) return null;
  try {
    const { config } = await loadConfig<UiThingConfig>({ cwd, name: CONFIG_NAME });
    return config ?? {};
  } catch (error) {
    getOutputChannel().error(`Could not read ${CONFIG_NAME}: ${error}`);
    return {};
  }
}

/**
 * Loads the UI Thing configuration or asks the user to initialize it if not found.
 */
async function loadOrInitUIThing(cwd: string) {
  const config = await loadUIThingConfig(cwd);
  if (config) return config;
  const pick = await vscode.window.showWarningMessage(
    "UI Thing is not initialized in this project. Initialize it now?",
    "Initialize",
    "Cancel"
  );
  if (pick === "Initialize") {
    await vscode.commands.executeCommand(COMMANDS.INIT, cwd);
  }
  return null;
}

/**
 * The Nuxt project a command acts on: `cwd` when a view item supplied it, otherwise the
 * workspace's Nuxt folder (asking when there are several). Offers to create one when missing.
 */
export async function resolveProject(cwd?: string): Promise<string | null> {
  if (cwd && hasNuxtConfig(cwd)) return cwd;
  const root = await getNuxtWorkspaceRoot();
  if (root) return root;
  await promptCreateNuxtProject();
  return null;
}

/** Like `resolveProject`, but also requires `ui-thing.config.*` (offering to run init). */
export async function resolveInitializedProject(
  cwd?: string
): Promise<{ cwd: string; config: UiThingConfig } | null> {
  const root = await resolveProject(cwd);
  if (!root) return null;
  const config = await loadOrInitUIThing(root);
  return config ? { cwd: root, config } : null;
}

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));
