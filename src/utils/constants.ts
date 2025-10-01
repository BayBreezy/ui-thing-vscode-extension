/**
 * Prefix for all extension commands
 */
const EXTENSION_PREFIX = "uithing";
/**
 * List of all commands used in the extension
 */
export const COMMANDS = {
  INIT: `${EXTENSION_PREFIX}.init`,
  CREATE_NUXT_PROJECT: `${EXTENSION_PREFIX}.createNuxtProject`,
  ADD_COMPONENTS: `${EXTENSION_PREFIX}.addComponents`,
  REFRESH_CATALOG: `${EXTENSION_PREFIX}.refreshCatalog`,
  THEME: `${EXTENSION_PREFIX}.theme`,
  PRETTIER: `${EXTENSION_PREFIX}.prettier`,
  SHORTCUTS: `${EXTENSION_PREFIX}.shortcuts`,
};

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";
export const CACHE_KEY = `${EXTENSION_PREFIX}.componentsCache`;
export const TS_KEY = `${EXTENSION_PREFIX}.componentsCache.ts`;
export const API_URL = "https://uithing.com/api/components";
export const CONFIG_NAME = "ui-thing.config";

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
