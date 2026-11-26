import type { RegistrySource } from "./types";

/**
 * Prefix for all extension commands
 */
const EXTENSION_PREFIX = "uithing";
/**
 * List of all commands used in the extension
 */
export const COMMANDS = {
  CREATE_NUXT_PROJECT: `${EXTENSION_PREFIX}.createNuxtProject`,
  INIT: `${EXTENSION_PREFIX}.init`,
  INFO: `${EXTENSION_PREFIX}.info`,
  ADD_COMPONENTS: `${EXTENSION_PREFIX}.addComponents`,
  ADD_BLOCKS: `${EXTENSION_PREFIX}.addBlocks`,
  ADD_FROM_REGISTRY: `${EXTENSION_PREFIX}.addFromRegistry`,
  ADD_REGISTRY_NAMESPACE: `${EXTENSION_PREFIX}.addRegistryNamespace`,
  DIFF: `${EXTENSION_PREFIX}.diff`,
  UPDATE: `${EXTENSION_PREFIX}.update`,
  REMOVE: `${EXTENSION_PREFIX}.remove`,
  VIEW_SOURCE: `${EXTENSION_PREFIX}.viewSource`,
  OPEN_DOCS: `${EXTENSION_PREFIX}.openDocs`,
  OPEN_FILE: `${EXTENSION_PREFIX}.openFile`,
  THEME: `${EXTENSION_PREFIX}.theme`,
  PRETTIER: `${EXTENSION_PREFIX}.prettier`,
  SHORTCUTS: `${EXTENSION_PREFIX}.shortcuts`,
  MCP_INIT: `${EXTENSION_PREFIX}.mcpInit`,
  INSTALL_SKILL: `${EXTENSION_PREFIX}.installSkill`,
  REFRESH_CATALOG: `${EXTENSION_PREFIX}.refreshCatalog`,
};

export const SITE_URL = "https://uithing.com";
export const API = {
  components: `${SITE_URL}/api/components`,
  blocks: `${SITE_URL}/api/blocks`,
  blockCategories: `${SITE_URL}/api/blocks/categories`,
};
export const MCP_URL = `${SITE_URL}/mcp`;
export const SKILL_SOURCE = "https://github.com/BayBreezy/ui-thing";

export const CONFIG_NAME = "ui-thing.config";
export const LOCK_FILE = "ui-thing.lock.json";

/** Registries the CLI knows without any config (mirrors the CLI's DEFAULT_REGISTRIES). */
export const DEFAULT_REGISTRIES: Record<string, RegistrySource> = {
  "@vue-bits": "https://vue-bits.dev/r/{name}.json",
  "@nxui": "https://nxui.geoql.in/r/{name}.json",
};

type ProjectPaths = {
  tailwindCSSLocation: string;
  componentsLocation: string;
  composablesLocation: string;
  pluginsLocation: string;
  utilsLocation: string;
};

/** Folders the CLI uses when `init --yes` runs in a Nuxt 4 project. */
export const DEFAULT_PATHS_NUXT4: ProjectPaths = {
  tailwindCSSLocation: "app/assets/css/tailwind.css",
  componentsLocation: "app/components/Ui",
  composablesLocation: "app/composables",
  pluginsLocation: "app/plugins",
  utilsLocation: "app/utils",
};

/** Folders the CLI uses when `init --yes` runs in a Nuxt 3 project. */
export const DEFAULT_PATHS_NUXT3: ProjectPaths = {
  tailwindCSSLocation: "assets/css/tailwind.css",
  componentsLocation: "components/Ui",
  composablesLocation: "composables",
  pluginsLocation: "plugins",
  utilsLocation: "utils",
};

/**
 * List of available CSS themes to choose from
 */
export const CSS_THEME_OPTIONS = [
  { title: "Zinc", value: "zinc" },
  { title: "Slate", value: "slate" },
  { title: "Stone", value: "stone" },
  { title: "Gray", value: "gray" },
  { title: "Neutral", value: "neutral" },
  { title: "Red", value: "red" },
  { title: "Rose", value: "rose" },
  { title: "Orange", value: "orange" },
  { title: "Green", value: "green" },
  { title: "Blue", value: "blue" },
  { title: "Yellow", value: "yellow" },
  { title: "Violet", value: "violet" },
];

/** Clients `ui-thing mcp init --client` accepts. */
export const MCP_CLIENTS = [
  { value: "vscode", label: "VS Code", detail: "Writes .vscode/mcp.json" },
  { value: "claude", label: "Claude Code", detail: "Writes .mcp.json" },
  { value: "cursor", label: "Cursor", detail: "Writes .cursor/mcp.json" },
  { value: "codex", label: "Codex", detail: "Prints the command to run" },
  { value: "windsurf", label: "Windsurf", detail: "Prints the config to paste" },
  { value: "claude-desktop", label: "Claude Desktop", detail: "Prints the config to paste" },
];
