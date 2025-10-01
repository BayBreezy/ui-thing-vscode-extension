import * as vscode from "vscode";

import { addComponentsCommand } from "./commands/add-components.command";
import { createNuxtProjectCommand } from "./commands/create-nuxt-project.command";
import { initCommand } from "./commands/init.comand";
import { prettierCommand } from "./commands/prettier.command";
import { refreshCatalogCommand } from "./commands/refresh-catalog.command";
import { shortcutsCommand } from "./commands/shortcuts.command";
import { themeCommand } from "./commands/theme.command";
import { preloadComponentsCatalog } from "./utils/catalog";
import { ContextContainer } from "./utils/context-container";
import { Component } from "./utils/types";

export const cachedComponents: Component[] | undefined = undefined;

export async function activate(context: vscode.ExtensionContext) {
  ContextContainer.initialize(context);

  context.subscriptions.push(
    createNuxtProjectCommand,
    initCommand,
    addComponentsCommand,
    refreshCatalogCommand,
    themeCommand,
    prettierCommand,
    shortcutsCommand
  );
  preloadComponentsCatalog();
}
