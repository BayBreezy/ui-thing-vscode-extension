import * as vscode from "vscode";

import { MCP_URL } from "./utils/constants";
import { getOutputChannel } from "./utils/helpers";

/** The servers this extension provides, based on the `uithing.mcp.*` settings. */
export function mcpServerDefinitions(): vscode.McpServerDefinition[] {
  const config = vscode.workspace.getConfiguration("uithing.mcp");
  if (!config.get<boolean>("enabled", true)) return [];
  const url = config.get<string>("url", MCP_URL) || MCP_URL;
  return [new vscode.McpHttpServerDefinition("UI Thing", vscode.Uri.parse(url))];
}

/**
 * Registers the UI Thing MCP server with VS Code, so Copilot agent mode can use its tools
 * (component source, docs, install plans) without a `.vscode/mcp.json` file.
 */
export function registerMcpServer(context: vscode.ExtensionContext) {
  // Older VS Code builds and some forks do not have the MCP API.
  if (typeof vscode.lm?.registerMcpServerDefinitionProvider !== "function") {
    getOutputChannel().info("This editor has no MCP provider API; skipping the MCP server.");
    return;
  }
  const changed = new vscode.EventEmitter<void>();
  context.subscriptions.push(
    changed,
    vscode.lm.registerMcpServerDefinitionProvider("uithing", {
      onDidChangeMcpServerDefinitions: changed.event,
      provideMcpServerDefinitions: mcpServerDefinitions,
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("uithing.mcp")) changed.fire();
    })
  );
}
