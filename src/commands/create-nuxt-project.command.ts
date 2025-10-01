import * as vscode from "vscode";

import { COMMANDS } from "../utils/constants";
import { createNuxtProject as promptCreateNuxtProject } from "../utils/helpers";

/**
 * Command that prompts the user to create a new Nuxt project.
 */
export const createNuxtProjectCommand = vscode.commands.registerCommand(
  COMMANDS.CREATE_NUXT_PROJECT,
  async () => promptCreateNuxtProject()
);
