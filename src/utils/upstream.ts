import * as vscode from "vscode";

/** Read-only documents holding the latest upstream source, used for diffs and "View Source". */
export const UPSTREAM_SCHEME = "uithing-upstream";

const contents = new Map<string, string>();
const changed = new vscode.EventEmitter<vscode.Uri>();

export const upstreamProvider: vscode.TextDocumentContentProvider = {
  onDidChange: changed.event,
  provideTextDocumentContent: (uri) => contents.get(uri.toString()) ?? "",
};

/**
 * A URI whose document shows `content`. The path ends with the file name, so VS Code picks
 * the right language (`.vue`, `.ts`).
 */
export function upstreamUri(group: string, filePath: string, content: string): vscode.Uri {
  const uri = vscode.Uri.from({
    scheme: UPSTREAM_SCHEME,
    path: `/${group}/${filePath.replace(/^\/+/, "")}`,
  });
  const key = uri.toString();
  const previous = contents.get(key);
  contents.set(key, content);
  if (previous !== undefined && previous !== content) changed.fire(uri);
  return uri;
}
