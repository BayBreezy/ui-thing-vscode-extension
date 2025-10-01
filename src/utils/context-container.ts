import { ExtensionContext } from "vscode";

export class ContextContainer {
  private static _context: ExtensionContext;

  public static initialize(context: ExtensionContext) {
    ContextContainer._context = context;
  }

  public static get context(): ExtensionContext {
    if (!ContextContainer._context) {
      throw new Error("ExtensionContext not initialized. Call initialize() first.");
    }
    return ContextContainer._context;
  }
}
