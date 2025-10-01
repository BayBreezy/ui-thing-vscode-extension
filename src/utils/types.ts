import type { TerminalOptions } from "vscode";

export type Component = {
  name: string;
  value: string;
  deps?: string[];
  devDeps?: string[];
  nuxtModules?: string[];
  instructions?: string[];
  files: Composable[];
  utils: Composable[];
  composables: Composable[];
  plugins: Composable[];
  components?: string[];
  askValidator?: boolean;
  overrides?: Record<string, unknown>;
};

type Composable = {
  fileName: string;
  dirPath: string;
  fileContent: string;
};

export type ExecuteTerminalCommand = {
  command: string;
  options?: TerminalOptions;
};

export type UiThingConfig = {
  theme?: string;
  tailwindCSSLocation?: string;
  componentsLocation?: string;
  composablesLocation?: string;
  pluginsLocation?: string;
  utilsLocation?: string;
  force?: boolean;
  useDefaultFilename?: boolean;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  [k: string]: unknown;
};
