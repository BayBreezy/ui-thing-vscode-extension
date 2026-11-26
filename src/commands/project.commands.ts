import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import { buildRunCommand, resolvePackageManager } from "../utils/cli";
import { COMMANDS, CSS_THEME_OPTIONS, MCP_CLIENTS, SKILL_SOURCE } from "../utils/constants";
import {
  createNuxtProject,
  executeTerminalCommand,
  getWorkspaceConfigurations,
  loadUIThingConfig,
  resolveInitializedProject,
  resolveProject,
  runCli,
} from "../utils/helpers";
import { resolvePaths } from "../utils/project";
import { nodeCwd, nodesFromArgs } from "../views/nodes";

/** `cwd` passed by another command, or the project of a clicked view item. */
const cwdFromArgs = (arg: unknown, selected?: unknown) =>
  typeof arg === "string" ? arg : nodeCwd(nodesFromArgs(arg, selected)[0]);

async function init(arg?: unknown) {
  const cwd = await resolveProject(cwdFromArgs(arg));
  if (!cwd) return;
  const initialized = Boolean(await loadUIThingConfig(cwd));

  const choices = initialized
    ? [
        {
          label: "Re-run setup with my config",
          detail:
            "ui-thing init --yes: re-installs dependencies and re-applies nuxt.config changes",
          args: ["init", "--yes"],
        },
        {
          label: "Start over",
          detail: "ui-thing init --force: answer the setup questions again and rewrite the config",
          args: ["init", "--force"],
        },
      ]
    : [
        {
          label: "Quick setup",
          detail:
            "ui-thing init --yes: Zinc theme, default folders, package manager from your lockfile",
          args: ["init", "--yes"],
        },
        {
          label: "Answer questions",
          detail: "ui-thing init: pick the theme, folders and package manager in the terminal",
          args: ["init"],
        },
      ];

  const pick = await vscode.window.showQuickPick(choices, {
    title: initialized ? "UI Thing is already set up here" : "Initialize UI Thing",
    ignoreFocusOut: true,
  });
  if (pick) runCli(pick.args, cwd);
}

async function info(arg?: unknown) {
  const cwd = await resolveProject(cwdFromArgs(arg));
  if (cwd) runCli(["info"], cwd);
}

async function theme(arg?: unknown) {
  const project = await resolveInitializedProject(cwdFromArgs(arg));
  if (!project) return;
  const { cwd, config } = project;

  const selected = await vscode.window.showQuickPick(
    CSS_THEME_OPTIONS.map((t) => ({
      label: t.title,
      description: t.value === config.theme ? "current" : undefined,
      value: t.value,
    })),
    { ignoreFocusOut: true, title: "Select a theme" }
  );
  if (!selected) return;

  const cssFile = resolvePaths(config, cwd).tailwindCSSLocation;
  if (fs.existsSync(path.join(cwd, cssFile))) {
    const answer = await vscode.window.showWarningMessage(
      `Replace ${cssFile} with the ${selected.label} theme?`,
      {
        modal: true,
        detail: "The whole file is rewritten. Any CSS you added to it will be lost.",
      },
      "Replace"
    );
    if (answer !== "Replace") return;
  }
  runCli(["theme", selected.value, "--yes"], cwd);
}

async function prettier(arg?: unknown) {
  const cwd = await resolveProject(cwdFromArgs(arg));
  if (cwd) runCli(["prettier"], cwd);
}

async function shortcuts(arg?: unknown) {
  const cwd = await resolveProject(cwdFromArgs(arg));
  if (cwd) runCli(["shortcuts", "--yes"], cwd);
}

async function mcpInit(arg?: unknown) {
  const cwd = await resolveProject(cwdFromArgs(arg));
  if (!cwd) return;
  const pick = await vscode.window.showQuickPick(
    MCP_CLIENTS.map((c) => ({
      label: c.label,
      detail:
        c.value === "vscode"
          ? `${c.detail}. Not needed for Copilot in VS Code: this extension already provides the server.`
          : c.detail,
      value: c.value,
    })),
    { title: "Connect the UI Thing MCP server to…", ignoreFocusOut: true }
  );
  if (pick) runCli(["mcp", "init", "--client", pick.value, "--yes"], cwd);
}

async function installSkill(arg?: unknown) {
  const cwd =
    cwdFromArgs(arg) ??
    (await resolveProject()) ??
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!cwd) {
    vscode.window.showErrorMessage("Open a folder first: the skill is installed into the project.");
    return;
  }
  const pm = resolvePackageManager(getWorkspaceConfigurations().packageManager, cwd);
  executeTerminalCommand({
    command: buildRunCommand("skills", ["add", SKILL_SOURCE, "--skill", "uithing"], { pm, cwd }),
    cwd,
  });
}

export function registerProjectCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.CREATE_NUXT_PROJECT, createNuxtProject),
    vscode.commands.registerCommand(COMMANDS.INIT, init),
    vscode.commands.registerCommand(COMMANDS.INFO, info),
    vscode.commands.registerCommand(COMMANDS.THEME, theme),
    vscode.commands.registerCommand(COMMANDS.PRETTIER, prettier),
    vscode.commands.registerCommand(COMMANDS.SHORTCUTS, shortcuts),
    vscode.commands.registerCommand(COMMANDS.MCP_INIT, mcpInit),
    vscode.commands.registerCommand(COMMANDS.INSTALL_SKILL, installSkill)
  );
}
