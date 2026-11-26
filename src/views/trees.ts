import * as path from "path";
import * as vscode from "vscode";
import type { UiThingConfig } from "../utils/types";
import type { Node } from "./nodes";

import { getBlockCategories, getBlocksCatalog, getComponentsCatalog } from "../utils/catalog";
import { COMMANDS, SITE_URL } from "../utils/constants";
import { errorMessage, findNuxtRoots, loadUIThingConfig } from "../utils/helpers";
import {
  componentTargets,
  installedComponents,
  isComponentInstalled,
  ProjectPaths,
  readLock,
  resolvePaths,
} from "../utils/project";

type ProjectState = {
  cwd: string;
  config: UiThingConfig | null;
  paths: ProjectPaths;
};

/**
 * The project the sidebar shows: the first Nuxt folder in the workspace. Also updates the
 * `uithing.hasNuxtProject` / `uithing.initialized` context keys the welcome views use.
 */
export async function getProjectState(): Promise<ProjectState | null> {
  const cwd = findNuxtRoots()[0];
  const config = cwd ? await loadUIThingConfig(cwd) : null;
  void vscode.commands.executeCommand("setContext", "uithing.hasNuxtProject", Boolean(cwd));
  void vscode.commands.executeCommand("setContext", "uithing.initialized", Boolean(config));
  return cwd ? { cwd, config, paths: resolvePaths(config, cwd) } : null;
}

const message = (label: string, icon = "warning", command?: string): Node => ({
  type: "message",
  label,
  icon,
  command,
});

const catalogError = (e: unknown) =>
  message(`Could not load the catalog: ${errorMessage(e)}`, "warning", COMMANDS.REFRESH_CATALOG);

const docsUrl = (docsPath?: string) => (docsPath ? `${SITE_URL}${docsPath}` : undefined);

function toTreeItem(node: Node): vscode.TreeItem {
  switch (node.type) {
    case "installed": {
      const item = new vscode.TreeItem(node.component.name);
      item.id = `installed:${node.component.value}`;
      item.description = node.component.value;
      item.tooltip = node.component.description;
      item.iconPath = new vscode.ThemeIcon("symbol-class");
      item.contextValue = node.component.docsPath ? "installed.docs" : "installed";
      if (node.file) {
        item.resourceUri = vscode.Uri.file(path.join(node.cwd, node.file));
        item.command = { command: COMMANDS.OPEN_FILE, title: "Open", arguments: [node] };
      }
      return item;
    }
    case "registryItem": {
      const item = new vscode.TreeItem(node.name);
      item.id = `registry:${node.name}`;
      let host = node.source;
      try {
        host = new URL(node.source).host;
      } catch {
        // local file source
      }
      item.description = host;
      item.tooltip = `${node.source}\n\n${node.files.join("\n")}`;
      item.iconPath = new vscode.ThemeIcon("cloud");
      item.contextValue = "registryItem";
      if (node.files[0]) {
        item.command = { command: COMMANDS.OPEN_FILE, title: "Open", arguments: [node] };
      }
      return item;
    }
    case "catalog": {
      const item = new vscode.TreeItem(node.component.name);
      item.id = `catalog:${node.component.value}`;
      item.description = node.installed ? "installed" : undefined;
      const tooltip = new vscode.MarkdownString(
        `**${node.component.name}** \`${node.component.value}\``
      );
      if (node.component.description) tooltip.appendMarkdown(`\n\n${node.component.description}`);
      const docs = docsUrl(node.component.docsPath);
      if (docs) tooltip.appendMarkdown(`\n\n[Docs](${docs})`);
      item.tooltip = tooltip;
      item.iconPath = new vscode.ThemeIcon(node.installed ? "pass-filled" : "symbol-class");
      item.contextValue = `catalog${node.component.docsPath ? ".docs" : ""}`;
      item.command = { command: COMMANDS.VIEW_SOURCE, title: "View Source", arguments: [node] };
      return item;
    }
    case "blockCategory": {
      const item = new vscode.TreeItem(node.category, vscode.TreeItemCollapsibleState.Collapsed);
      item.id = `blockCategory:${node.category}`;
      item.iconPath = new vscode.ThemeIcon("layout");
      item.contextValue = "blockCategory";
      return item;
    }
    case "block": {
      const item = new vscode.TreeItem(node.block.name);
      item.id = `block:${node.block.fileName}`;
      item.description = node.block.fileName.replace(/\.vue$/, "");
      item.tooltip = node.block.description;
      item.iconPath = new vscode.ThemeIcon("symbol-file");
      item.contextValue = "block";
      item.command = { command: COMMANDS.VIEW_SOURCE, title: "View Source", arguments: [node] };
      return item;
    }
    case "group": {
      const item = new vscode.TreeItem(
        `${node.label} (${node.children.length})`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      item.id = `group:${node.id}`;
      item.iconPath = new vscode.ThemeIcon(node.icon);
      return item;
    }
    case "message": {
      const item = new vscode.TreeItem(node.label);
      item.iconPath = new vscode.ThemeIcon(node.icon ?? "info");
      if (node.command) item.command = { command: node.command, title: node.label };
      return item;
    }
  }
}

abstract class BaseTree implements vscode.TreeDataProvider<Node> {
  private readonly changed = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.changed.event;

  refresh() {
    this.changed.fire(undefined);
  }

  getTreeItem(node: Node) {
    return toTreeItem(node);
  }

  abstract getChildren(node?: Node): Promise<Node[]>;
}

/** Components and registry items in the project. */
export class InstalledTree extends BaseTree {
  async getChildren(node?: Node): Promise<Node[]> {
    if (node) return node.type === "group" ? node.children : [];
    const state = await getProjectState();
    if (!state?.config) return [];
    const { cwd, paths } = state;

    let components: Node[];
    try {
      const catalog = await getComponentsCatalog();
      components = installedComponents(catalog, paths, cwd)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((component) => {
          const targets = componentTargets(component, paths);
          const file = (targets.find((t) => t.kind === "component") ?? targets[0])?.path;
          return { type: "installed", cwd, component, file };
        });
    } catch (e) {
      components = [catalogError(e)];
    }

    const registryItems: Node[] = Object.entries(readLock(cwd).items)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, entry]) => ({
        type: "registryItem",
        cwd,
        name,
        source: entry.source,
        files: entry.files ?? [],
      }));

    if (!registryItems.length) return components;
    return [
      { type: "group", id: "components", label: "UI Thing", icon: "package", children: components },
      {
        type: "group",
        id: "registry",
        label: "Registry items",
        icon: "cloud",
        children: registryItems,
      },
    ];
  }
}

/** The UI Thing component catalog, marking what is installed. */
export class ComponentsTree extends BaseTree {
  async getChildren(node?: Node): Promise<Node[]> {
    if (node) return [];
    const state = await getProjectState();
    try {
      const catalog = await getComponentsCatalog();
      return catalog.map((component) => ({
        type: "catalog",
        cwd: state?.cwd,
        component,
        installed: Boolean(
          state?.config && isComponentInstalled(component, state.paths, state.cwd)
        ),
      }));
    } catch (e) {
      return [catalogError(e)];
    }
  }
}

/** Block categories, expanding to their blocks. */
export class BlocksTree extends BaseTree {
  async getChildren(node?: Node): Promise<Node[]> {
    const cwd = findNuxtRoots()[0];
    try {
      if (!node) {
        const categories = await getBlockCategories();
        return categories.map((category) => ({ type: "blockCategory", cwd, category }));
      }
      if (node.type !== "blockCategory") return [];
      const blocks = await getBlocksCatalog();
      return blocks
        .filter((block) => block.category === node.category)
        .map((block) => ({ type: "block", cwd, block }));
    } catch (e) {
      return [catalogError(e)];
    }
  }
}
