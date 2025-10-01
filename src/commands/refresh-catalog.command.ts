import * as vscode from "vscode";

import { fetchComponentsFresh, setComponentsCache } from "../utils/catalog";
import { COMMANDS } from "../utils/constants";

/**
 * Command that is used to refresh the components catalog.
 *
 * This command fetches the latest components from the source, updates the cache,
 * and notifies the user of the result.
 */
export const refreshCatalogCommand = vscode.commands.registerCommand(
  COMMANDS.REFRESH_CATALOG,
  async () => {
    try {
      const fresh = await vscode.window.withProgress(
        {
          title: "Refreshing UI Thing components catalog...",
          location: vscode.ProgressLocation.Notification,
        },
        async () => {
          const fresh = await fetchComponentsFresh();
          await setComponentsCache(fresh);
          return fresh;
        }
      );
      vscode.window.showInformationMessage(
        `UI Thing: Catalog refreshed with ${fresh.length} components`
      );
    } catch (e: unknown) {
      vscode.window.showErrorMessage(
        `UI Thing: Refresh failed — ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
);
