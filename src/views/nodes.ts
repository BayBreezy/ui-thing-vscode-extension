import type { BlockComponent, Component } from "../utils/types";

/** Items shown in the UI Thing sidebar. Commands receive them as their first argument. */
export type Node =
  | { type: "installed"; cwd: string; component: Component; file?: string }
  | { type: "registryItem"; cwd: string; name: string; source: string; files: string[] }
  | { type: "catalog"; cwd?: string; component: Component; installed: boolean }
  | { type: "blockCategory"; cwd?: string; category: string }
  | { type: "block"; cwd?: string; block: BlockComponent }
  | { type: "group"; id: string; label: string; icon: string; children: Node[] }
  | { type: "message"; label: string; icon?: string; command?: string };

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && "type" in value;

/**
 * Normalises the `(clicked, selected[])` arguments VS Code passes to view commands.
 * Returns an empty list when the command came from the Command Palette.
 */
export function nodesFromArgs(clicked: unknown, selected: unknown): Node[] {
  if (Array.isArray(selected) && selected.length && selected.every(isNode)) return selected;
  return isNode(clicked) ? [clicked] : [];
}

/** The project folder a view item belongs to, if any. */
export const nodeCwd = (node: Node | undefined): string | undefined =>
  node && "cwd" in node ? node.cwd : undefined;
