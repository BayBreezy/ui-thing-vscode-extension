import * as vscode from "vscode";
import type { BlockComponent } from "../utils/types";

import { getBlocksCatalog } from "../utils/catalog";
import { COMMANDS } from "../utils/constants";
import { errorMessage, resolveInitializedProject, runCli } from "../utils/helpers";
import { blockId } from "../utils/project";
import { nodeCwd, nodesFromArgs } from "../views/nodes";

async function loadBlocks(): Promise<BlockComponent[] | null> {
  try {
    return await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "UI Thing: loading blocks…" },
      () => getBlocksCatalog()
    );
  } catch (e) {
    vscode.window.showErrorMessage(`UI Thing: could not load blocks: ${errorMessage(e)}`);
    return null;
  }
}

/**
 * Adds blocks with `ui-thing block`: the clicked/selected Blocks view items, or a
 * category + block picker. A clicked category picks from that category.
 */
async function addBlocks(clicked?: unknown, selected?: unknown) {
  const nodes = nodesFromArgs(clicked, selected);
  const project = await resolveInitializedProject(nodeCwd(nodes[0]));
  if (!project) return;

  const chosen = nodes.flatMap((n) => (n.type === "block" ? [n.block] : []));
  if (chosen.length) {
    runCli(["block", ...chosen.map((b) => blockId(b.fileName))], project.cwd);
    return;
  }

  const blocks = await loadBlocks();
  if (!blocks?.length) return;

  let category = nodes.find((n) => n.type === "blockCategory")?.category;
  if (!category) {
    const counts = new Map<string, number>();
    for (const b of blocks) counts.set(b.category, (counts.get(b.category) ?? 0) + 1);
    const pick = await vscode.window.showQuickPick(
      [
        { label: "All categories", description: `${blocks.length} blocks`, value: "" },
        ...[...counts].map(([value, count]) => ({
          label: value,
          description: `${count} block${count === 1 ? "" : "s"}`,
          value,
        })),
      ],
      { title: "Add UI Thing blocks: pick a category", ignoreFocusOut: true }
    );
    if (!pick) return;
    category = pick.value;
  }

  const picks = await vscode.window.showQuickPick(
    blocks
      .filter((b) => !category || b.category === category)
      .map((b) => ({
        label: b.name,
        description: blockId(b.fileName),
        detail: b.description,
        id: blockId(b.fileName),
      })),
    {
      title: category ? `Add ${category} blocks` : "Add blocks",
      canPickMany: true,
      matchOnDescription: true,
      matchOnDetail: true,
      ignoreFocusOut: true,
    }
  );
  if (picks?.length) runCli(["block", ...picks.map((p) => p.id)], project.cwd);
}

export function registerBlockCommands(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand(COMMANDS.ADD_BLOCKS, addBlocks));
}
