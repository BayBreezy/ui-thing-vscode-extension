import * as vscode from "vscode";

import { registerBlockCommands } from "./commands/blocks.commands";
import { registerComponentCommands } from "./commands/components.commands";
import { registerProjectCommands } from "./commands/project.commands";
import { registerRegistryCommands } from "./commands/registry.commands";
import { mcpServerDefinitions, registerMcpServer } from "./mcp";
import { catalogChanged, preloadComponentsCatalog } from "./utils/catalog";
import { ContextContainer } from "./utils/context-container";
import { trackTerminals } from "./utils/helpers";
import { UPSTREAM_SCHEME, upstreamProvider } from "./utils/upstream";
import { BlocksTree, ComponentsTree, getProjectState, InstalledTree } from "./views/trees";

export async function activate(context: vscode.ExtensionContext) {
  ContextContainer.initialize(context);
  trackTerminals(context);

  const installed = new InstalledTree();
  const components = new ComponentsTree();
  const blocks = new BlocksTree();

  // Debounced so a CLI run that writes many files refreshes the views once.
  let timer: NodeJS.Timeout | undefined;
  const refreshProjectViews = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      installed.refresh();
      components.refresh();
    }, 400);
  };

  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/{ui-thing.config.*,ui-thing.lock.json,nuxt.config.*,components/**}"
  );
  watcher.onDidCreate(refreshProjectViews);
  watcher.onDidDelete(refreshProjectViews);
  watcher.onDidChange((uri) => {
    if (/ui-thing\.(config\.\w+|lock\.json)$/.test(uri.path)) refreshProjectViews();
  });

  context.subscriptions.push(
    watcher,
    { dispose: () => clearTimeout(timer) },
    vscode.window.createTreeView("uithing.installed", {
      treeDataProvider: installed,
      canSelectMany: true,
    }),
    vscode.window.createTreeView("uithing.components", {
      treeDataProvider: components,
      canSelectMany: true,
    }),
    vscode.window.createTreeView("uithing.blocks", {
      treeDataProvider: blocks,
      canSelectMany: true,
    }),
    vscode.workspace.registerTextDocumentContentProvider(UPSTREAM_SCHEME, upstreamProvider),
    vscode.workspace.onDidChangeWorkspaceFolders(refreshProjectViews),
    catalogChanged.event((key) => (key === "components" ? refreshProjectViews() : blocks.refresh()))
  );

  registerProjectCommands(context);
  registerComponentCommands(context, {
    onRefreshed: () => {
      refreshProjectViews();
      blocks.refresh();
    },
  });
  registerBlockCommands(context);
  registerRegistryCommands(context);
  registerMcpServer(context);

  void getProjectState();
  void preloadComponentsCatalog();

  // Exposed for the extension-host tests.
  return { views: { installed, components, blocks }, mcpServerDefinitions };
}
