import type { TerminalOptions } from "vscode";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "deno";

type CatalogFile = {
  fileName: string;
  dirPath: string;
  fileContent: string;
};

/** A component from https://uithing.com/api/components. */
export type Component = {
  name: string;
  value: string;
  description?: string;
  docsPath?: string;
  deps?: string[];
  devDeps?: string[];
  nuxtModules?: string[];
  instructions?: string[];
  files: CatalogFile[];
  utils: CatalogFile[];
  composables: CatalogFile[];
  plugins: CatalogFile[];
  components?: string[];
  askValidator?: boolean;
  overrides?: Record<string, unknown>;
};

/** A block from https://uithing.com/api/blocks. */
export type BlockComponent = {
  name: string;
  /** For example `BlockHero1.vue`. */
  fileName: string;
  file: string;
  category: string;
  description?: string;
  /** For example `Hero/BlockHero1.vue`. */
  path: string;
  components?: string[];
};

/** One item in a shadcn-style registry index (`/r/registry.json`). */
export type RegistryIndexItem = {
  name: string;
  type?: string;
  title?: string;
  description?: string;
};

export type RegistrySource =
  string | { url: string; headers?: Record<string, string>; params?: Record<string, string> };

export type ExecuteTerminalCommand = {
  command: string;
  cwd?: string;
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
  packageManager?: PackageManager;
  registries?: Record<string, RegistrySource>;
  [k: string]: unknown;
};

/** `ui-thing.lock.json`, written by the CLI for registry installs. */
export type LockFile = {
  items: Record<string, { source: string; files: string[]; installedAt?: string }>;
};
