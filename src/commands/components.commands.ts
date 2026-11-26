import * as path from "path";
import * as vscode from "vscode";
import type { Component, UiThingConfig } from "../utils/types";
import type { Node } from "../views/nodes";

import { getComponentsCatalog, refreshCatalog } from "../utils/catalog";
import { COMMANDS, SITE_URL } from "../utils/constants";
import { errorMessage, resolveInitializedProject, runCli } from "../utils/helpers";
import {
  compareWithLocal,
  componentTargets,
  installedComponents,
  isComponentInstalled,
  readLock,
  resolvePaths,
} from "../utils/project";
import { upstreamUri } from "../utils/upstream";
import { nodeCwd, nodesFromArgs } from "../views/nodes";

/** Loads the catalog with a progress notification, or shows the error and returns null. */
async function loadCatalog(): Promise<Component[] | null> {
  try {
    return await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: "UI Thing: loading components" },
      () => getComponentsCatalog()
    );
  } catch (e) {
    vscode.window.showErrorMessage(`UI Thing: could not load components: ${errorMessage(e)}`);
    return null;
  }
}

type Installed =
  | { kind: "component"; name: string; component: Component }
  | { kind: "registry"; name: string; source: string; files: string[] };

/** Installed components and registry items, for pickers. */
async function listInstalled(cwd: string, config: UiThingConfig): Promise<Installed[] | null> {
  const catalog = await loadCatalog();
  if (!catalog) return null;
  const paths = resolvePaths(config, cwd);
  const components: Installed[] = installedComponents(catalog, paths, cwd).map((component) => ({
    kind: "component",
    name: component.value,
    component,
  }));
  const registry: Installed[] = Object.entries(readLock(cwd).items).map(([name, entry]) => ({
    kind: "registry",
    name,
    source: entry.source,
    files: entry.files ?? [],
  }));
  return [...components, ...registry];
}

const nodeToInstalled = (node: Node): Installed | null => {
  if (node.type === "installed" || node.type === "catalog") {
    return { kind: "component", name: node.component.value, component: node.component };
  }
  if (node.type === "registryItem") {
    return { kind: "registry", name: node.name, source: node.source, files: node.files };
  }
  return null;
};

/**
 * Items a command acts on: the clicked/selected view items, or a QuickPick of what is installed.
 */
async function pickInstalled(
  clicked: unknown,
  selected: unknown,
  options: { title: string; canPickMany: boolean }
): Promise<{ cwd: string; config: UiThingConfig; items: Installed[] } | null> {
  const nodes = nodesFromArgs(clicked, selected);
  const project = await resolveInitializedProject(nodeCwd(nodes[0]));
  if (!project) return null;

  const fromNodes = nodes.map(nodeToInstalled).filter((i): i is Installed => Boolean(i));
  if (fromNodes.length) return { ...project, items: fromNodes };

  const installed = await listInstalled(project.cwd, project.config);
  if (!installed) return null;
  if (!installed.length) {
    vscode.window.showInformationMessage("UI Thing: no components installed yet.");
    return null;
  }
  const qpItems = installed.map((item) => ({
    label: item.kind === "component" ? item.component.name : item.name,
    description: item.kind === "component" ? item.name : item.source,
    item,
  }));
  const picked = options.canPickMany
    ? await vscode.window.showQuickPick(qpItems, {
        title: options.title,
        canPickMany: true,
        matchOnDescription: true,
        ignoreFocusOut: true,
      })
    : await vscode.window.showQuickPick(qpItems, {
        title: options.title,
        matchOnDescription: true,
        ignoreFocusOut: true,
      });
  const list = Array.isArray(picked) ? picked : picked ? [picked] : [];
  if (!list.length) return null;
  return { ...project, items: list.map((p) => p.item) };
}

async function addComponents(clicked?: unknown, selected?: unknown) {
  const nodes = nodesFromArgs(clicked, selected).filter(
    (n): n is Extract<Node, { type: "catalog" | "installed" }> =>
      n.type === "catalog" || n.type === "installed"
  );
  const project = await resolveInitializedProject(nodeCwd(nodes[0]));
  if (!project) return;
  const { cwd, config } = project;

  if (nodes.length) {
    runCli(["add", ...nodes.map((n) => n.component.value)], cwd);
    return;
  }

  const catalog = await loadCatalog();
  if (!catalog?.length) return;
  const paths = resolvePaths(config, cwd);

  type Item = vscode.QuickPickItem & { value?: string; all?: boolean };
  const items: Item[] = [
    { label: "$(layers) Add all components", detail: "ui-thing add --all", all: true },
    { label: "Components", kind: vscode.QuickPickItemKind.Separator },
    ...catalog.map((c) => ({
      label: c.name,
      description: isComponentInstalled(c, paths, cwd)
        ? `$(check) installed · ${c.value}`
        : c.value,
      detail: c.description,
      value: c.value,
    })),
  ];
  const picks = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    title: "Add UI Thing components",
    placeHolder: "Search and select components…",
    matchOnDescription: true,
    matchOnDetail: true,
    ignoreFocusOut: true,
  });
  if (!picks?.length) return;
  if (picks.some((p) => p.all)) {
    runCli(["add", "--all"], cwd);
    return;
  }
  const values = picks.map((p) => p.value).filter((v): v is string => Boolean(v));
  if (values.length) runCli(["add", ...values], cwd);
}

/** Opens VS Code's diff editor for each changed file: your copy on the left, the latest on the right. */
async function diffComponent(component: Component, cwd: string, config: UiThingConfig) {
  const paths = resolvePaths(config, cwd);
  const changes = compareWithLocal(componentTargets(component, paths), cwd).filter(
    (c) => c.status !== "unchanged"
  );
  if (!changes.length) {
    vscode.window.showInformationMessage(`${component.name} matches the latest version.`);
    return;
  }

  let files = changes;
  if (changes.length > 1) {
    const picked = await vscode.window.showQuickPick(
      changes.map((c) => ({ label: c.path, description: c.status, picked: true, c })),
      { title: `${component.name}: files that differ`, canPickMany: true, ignoreFocusOut: true }
    );
    if (!picked?.length) return;
    files = picked.map((p) => p.c);
  }

  for (const file of files) {
    const latest = upstreamUri(`latest/${component.value}`, file.path, file.content);
    const name = path.basename(file.path);
    const left =
      file.status === "missing"
        ? upstreamUri(`missing/${component.value}`, file.path, "")
        : vscode.Uri.file(path.join(cwd, file.path));
    const title =
      file.status === "missing"
        ? `${name} (missing locally ↔ latest)`
        : `${name} (yours ↔ latest)`;
    await vscode.commands.executeCommand("vscode.diff", left, latest, title, {
      preview: files.length === 1,
    });
  }

  const answer = await vscode.window.showInformationMessage(
    `${changes.length} file(s) in ${component.name} differ from the latest version. Updating replaces your copy.`,
    "Update",
    "Keep Mine"
  );
  if (answer === "Update") runCli(["update", component.value], cwd);
}

async function diff(clicked?: unknown, selected?: unknown) {
  const picked = await pickInstalled(clicked, selected, {
    title: "Compare with the latest version",
    canPickMany: false,
  });
  if (!picked) return;
  const [item] = picked.items;
  if (item.kind === "component") return diffComponent(item.component, picked.cwd, picked.config);
  runCli(["diff", item.name], picked.cwd);
}

async function update(clicked?: unknown, selected?: unknown) {
  const picked = await pickInstalled(clicked, selected, {
    title: "Update to the latest version",
    canPickMany: true,
  });
  if (!picked) return;
  const names = picked.items.map((i) => i.name);
  const answer = await vscode.window.showWarningMessage(
    names.length === 1 ? `Update ${names[0]}?` : `Update ${names.length} items?`,
    {
      modal: true,
      detail: `Update replaces the files of ${names.join(", ")} with the latest version. It does not merge: commit first, or check the diff, if you edited them.`,
    },
    "Update",
    "Show Diff"
  );
  if (answer === "Update") runCli(["update", ...names], picked.cwd);
  if (answer === "Show Diff") {
    const [first] = picked.items;
    if (picked.items.length === 1 && first.kind === "component") {
      return diffComponent(first.component, picked.cwd, picked.config);
    }
    runCli(["diff", ...names], picked.cwd);
  }
}

async function remove(clicked?: unknown, selected?: unknown) {
  const picked = await pickInstalled(clicked, selected, {
    title: "Remove from the project",
    canPickMany: true,
  });
  if (!picked) return;
  const names = picked.items.map((i) => i.name);
  const answer = await vscode.window.showWarningMessage(
    names.length === 1 ? `Remove ${names[0]}?` : `Remove ${names.length} items?`,
    { modal: true, detail: `This deletes the files of ${names.join(", ")} from your project.` },
    "Remove"
  );
  if (answer === "Remove") runCli(["remove", ...names], picked.cwd);
}

async function openTextDocuments(uris: vscode.Uri[]) {
  for (const [index, uri] of uris.entries()) {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, {
      preview: uris.length === 1,
      preserveFocus: index > 0,
    });
  }
}

/** Shows the latest upstream source of a component or block in read-only editors. */
async function viewSource(clicked?: unknown) {
  const [node] = nodesFromArgs(clicked, undefined);

  if (node?.type === "block") {
    return openTextDocuments([upstreamUri("blocks", node.block.path, node.block.file)]);
  }
  if (node?.type === "registryItem") return openFile(node);

  let component: Component | undefined =
    node?.type === "catalog" || node?.type === "installed" ? node.component : undefined;
  if (!component) {
    const catalog = await loadCatalog();
    if (!catalog) return;
    const pick = await vscode.window.showQuickPick(
      catalog.map((c) => ({ label: c.name, description: c.value, detail: c.description, c })),
      { title: "View component source", matchOnDescription: true }
    );
    component = pick?.c;
  }
  if (!component) return;

  const project = nodeCwd(node);
  const paths = resolvePaths(null, project ?? "");
  const targets = componentTargets(component, paths);
  let files = targets;
  if (targets.length > 3) {
    const picked = await vscode.window.showQuickPick(
      targets.map((t) => ({
        label: t.path,
        description: t.kind,
        picked: t.kind === "component",
        t,
      })),
      { title: `${component.name}: files to open`, canPickMany: true }
    );
    if (!picked?.length) return;
    files = picked.map((p) => p.t);
  }
  await openTextDocuments(
    files.map((t) => upstreamUri(`latest/${component!.value}`, t.path, t.content))
  );
}

async function openDocs(clicked?: unknown) {
  const [node] = nodesFromArgs(clicked, undefined);
  let docsPath: string | undefined;
  if (node?.type === "catalog" || node?.type === "installed") docsPath = node.component.docsPath;
  else {
    const catalog = await loadCatalog();
    if (!catalog) return;
    const pick = await vscode.window.showQuickPick(
      catalog
        .filter((c) => c.docsPath)
        .map((c) => ({ label: c.name, description: c.value, docsPath: c.docsPath })),
      { title: "Open component docs", matchOnDescription: true }
    );
    docsPath = pick?.docsPath;
  }
  if (docsPath) await vscode.env.openExternal(vscode.Uri.parse(`${SITE_URL}${docsPath}`));
}

/** Opens the local file behind an Installed view item. */
async function openFile(clicked?: unknown) {
  const [node] = nodesFromArgs(clicked, undefined);
  if (node?.type === "installed" && node.file) {
    return openTextDocuments([vscode.Uri.file(path.join(node.cwd, node.file))]);
  }
  if (node?.type === "registryItem" && node.files.length) {
    return openTextDocuments(
      node.files.slice(0, 5).map((f) => vscode.Uri.file(path.join(node.cwd, f)))
    );
  }
}

async function refresh(onRefreshed: () => void) {
  try {
    const { components } = await vscode.window.withProgress(
      { title: "Refreshing the UI Thing catalog…", location: vscode.ProgressLocation.Notification },
      () => refreshCatalog()
    );
    onRefreshed();
    vscode.window.showInformationMessage(
      `UI Thing: catalog refreshed (${components.length} components).`
    );
  } catch (e) {
    vscode.window.showErrorMessage(`UI Thing: refresh failed: ${errorMessage(e)}`);
  }
}

export function registerComponentCommands(
  context: vscode.ExtensionContext,
  { onRefreshed }: { onRefreshed: () => void }
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.ADD_COMPONENTS, addComponents),
    vscode.commands.registerCommand(COMMANDS.DIFF, diff),
    vscode.commands.registerCommand(COMMANDS.UPDATE, update),
    vscode.commands.registerCommand(COMMANDS.REMOVE, remove),
    vscode.commands.registerCommand(COMMANDS.VIEW_SOURCE, viewSource),
    vscode.commands.registerCommand(COMMANDS.OPEN_DOCS, openDocs),
    vscode.commands.registerCommand(COMMANDS.OPEN_FILE, openFile),
    vscode.commands.registerCommand(COMMANDS.REFRESH_CATALOG, () => refresh(onRefreshed))
  );
}
