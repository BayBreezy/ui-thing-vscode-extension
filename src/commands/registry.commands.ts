import * as vscode from "vscode";

import { fetchRegistryIndex } from "../utils/catalog";
import { COMMANDS } from "../utils/constants";
import { errorMessage, resolveInitializedProject, runCli } from "../utils/helpers";
import { allRegistries, isRegistryRef } from "../utils/project";
import { nodeCwd, nodesFromArgs } from "../views/nodes";

/**
 * Installs items from shadcn-style registries (Vue Bits, NXUI, your own) with `ui-thing add`.
 */
async function addFromRegistry(clicked?: unknown, selected?: unknown) {
  const project = await resolveInitializedProject(nodeCwd(nodesFromArgs(clicked, selected)[0]));
  if (!project) return;
  const { cwd, config } = project;
  const registries = allRegistries(config);

  const source = await vscode.window.showQuickPick(
    [
      {
        label: "$(link) Enter a URL or @namespace/name…",
        detail: "For example @vue-bits/HoloMosaic or https://nxui.geoql.in/r/fluid-glass.json",
        value: "",
      },
      { label: "Browse a registry", kind: vscode.QuickPickItemKind.Separator, value: "" },
      ...Object.entries(registries).map(([namespace, entry]) => ({
        label: `$(library) ${namespace}`,
        detail: typeof entry === "string" ? entry : entry.url,
        value: namespace,
      })),
    ],
    { title: "Add from a registry", ignoreFocusOut: true }
  );
  if (!source) return;

  if (!source.value) {
    const input = await vscode.window.showInputBox({
      title: "Add from a registry",
      prompt: "One or more registry items, separated by spaces",
      placeHolder: "@vue-bits/HoloMosaic https://nxui.geoql.in/r/fluid-glass.json",
      ignoreFocusOut: true,
      validateInput: (value) => {
        const refs = value.trim().split(/\s+/).filter(Boolean);
        if (!refs.length) return "Enter at least one item.";
        const bad = refs.find((r) => !isRegistryRef(r));
        return bad ? `"${bad}" is not a URL, @namespace/name or .json file.` : null;
      },
    });
    const refs = input?.trim().split(/\s+/).filter(Boolean);
    if (refs?.length) runCli(["add", ...refs], cwd);
    return;
  }

  const namespace = source.value;
  let items;
  try {
    items = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Loading ${namespace}…` },
      () => fetchRegistryIndex(namespace, registries)
    );
  } catch (e) {
    const answer = await vscode.window.showErrorMessage(
      `Could not load the ${namespace} index: ${errorMessage(e)}`,
      "List in Terminal"
    );
    if (answer) runCli(["registry", "list", namespace], cwd);
    return;
  }

  const picks = await vscode.window.showQuickPick(
    items.map((item) => ({
      label: item.title && item.title !== item.name ? `${item.title}` : item.name,
      description: `${namespace}/${item.name}${item.type ? ` · ${item.type.replace(/^registry:/, "")}` : ""}`,
      detail: item.description,
      ref: `${namespace}/${item.name}`,
    })),
    {
      title: `Add from ${namespace} (${items.length} items)`,
      canPickMany: true,
      matchOnDescription: true,
      matchOnDetail: true,
      ignoreFocusOut: true,
    }
  );
  if (picks?.length) runCli(["add", ...picks.map((p) => p.ref)], cwd);
}

/** Adds `@namespace` → URL template to ui-thing.config with `ui-thing registry add-namespace`. */
async function addRegistryNamespace(clicked?: unknown) {
  const project = await resolveInitializedProject(nodeCwd(nodesFromArgs(clicked, undefined)[0]));
  if (!project) return;

  const namespace = await vscode.window.showInputBox({
    title: "Add a registry namespace (1/2)",
    prompt: "The namespace you will type before item names",
    placeHolder: "@acme",
    ignoreFocusOut: true,
    validateInput: (value) =>
      /^@[a-z0-9][\w.-]*$/i.test(value.trim()) ? null : "Use the form @name, for example @acme.",
  });
  if (!namespace) return;

  const url = await vscode.window.showInputBox({
    title: "Add a registry namespace (2/2)",
    prompt: "URL template for one item. {name} is replaced with the item name.",
    placeHolder: "https://acme.dev/r/{name}.json",
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!/^https?:\/\//i.test(value.trim())) return "Start with https://";
      return value.includes("{name}") ? null : "Include {name} where the item name goes.";
    },
  });
  if (!url) return;
  runCli(["registry", "add-namespace", namespace.trim(), url.trim()], project.cwd);
}

export function registerRegistryCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.ADD_FROM_REGISTRY, addFromRegistry),
    vscode.commands.registerCommand(COMMANDS.ADD_REGISTRY_NAMESPACE, addRegistryNamespace)
  );
}
