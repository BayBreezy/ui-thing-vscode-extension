/**
 * Reads a UI Thing project from disk: folders, installed components, registry lockfile.
 *
 * Pure (no `vscode` import) so it can be unit tested.
 */
import * as fs from "fs";
import * as path from "path";
import type { Component, LockFile, RegistrySource, UiThingConfig } from "./types";

import {
  DEFAULT_PATHS_NUXT3,
  DEFAULT_PATHS_NUXT4,
  DEFAULT_REGISTRIES,
  LOCK_FILE,
} from "./constants";

export type ProjectPaths = typeof DEFAULT_PATHS_NUXT4;

const NUXT_CONFIG_FILES = [
  "nuxt.config.ts",
  "nuxt.config.js",
  "nuxt.config.mjs",
  "nuxt.config.cjs",
];

export const hasNuxtConfig = (cwd: string) =>
  NUXT_CONFIG_FILES.some((file) => fs.existsSync(path.join(cwd, file)));

/** Nuxt major version from package.json, defaulting to 4 like the CLI. */
export function detectNuxtMajor(cwd: string): 3 | 4 {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
    const spec: string | undefined = pkg.dependencies?.nuxt ?? pkg.devDependencies?.nuxt;
    if (spec && !/^[~^>=<\s]*4/.test(spec) && /^[~^>=<\s]*3/.test(spec)) return 3;
  } catch {
    // fall through
  }
  return 4;
}

/** The folders UI Thing writes to: from the config, falling back to the CLI defaults. */
export function resolvePaths(config: UiThingConfig | null, cwd: string): ProjectPaths {
  const defaults = detectNuxtMajor(cwd) === 3 ? DEFAULT_PATHS_NUXT3 : DEFAULT_PATHS_NUXT4;
  return {
    tailwindCSSLocation: config?.tailwindCSSLocation || defaults.tailwindCSSLocation,
    componentsLocation: config?.componentsLocation || defaults.componentsLocation,
    composablesLocation: config?.composablesLocation || defaults.composablesLocation,
    pluginsLocation: config?.pluginsLocation || defaults.pluginsLocation,
    utilsLocation: config?.utilsLocation || defaults.utilsLocation,
  };
}

type PlannedFile = {
  /** Path relative to the project root, where `ui-thing add` writes the file. */
  path: string;
  kind: "component" | "util" | "composable" | "plugin";
  content: string;
};

const toPosix = (p: string) => p.replace(/\\/g, "/");

/**
 * Every file `ui-thing add` writes for a catalog component, with its target path.
 * Mirrors `componentTargets` in the CLI.
 */
export function componentTargets(component: Component, paths: ProjectPaths): PlannedFile[] {
  const groups: Array<[PlannedFile["kind"], Component["files"] | undefined, string]> = [
    ["component", component.files, paths.componentsLocation],
    ["util", component.utils, paths.utilsLocation],
    ["composable", component.composables, paths.composablesLocation],
    ["plugin", component.plugins, paths.pluginsLocation],
  ];
  return groups.flatMap(([kind, files, dir]) =>
    (files ?? []).map((f) => ({
      kind,
      path: path.posix.join(toPosix(dir), toPosix(f.fileName)),
      content: f.fileContent,
    }))
  );
}

/**
 * Whether a catalog component is in the project. A component counts as installed when its
 * first component file (or, for util-only items, its first file) exists.
 */
export function isComponentInstalled(component: Component, paths: ProjectPaths, cwd: string) {
  const targets = componentTargets(component, paths);
  const probe = targets.find((t) => t.kind === "component") ?? targets[0];
  return Boolean(probe && fs.existsSync(path.join(cwd, probe.path)));
}

export function installedComponents(catalog: Component[], paths: ProjectPaths, cwd: string) {
  return catalog.filter((c) => isComponentInstalled(c, paths, cwd));
}

type FileChange = PlannedFile & { status: "modified" | "missing" | "unchanged" };

const normalize = (s: string) => s.replace(/\r\n/g, "\n");

/** Compares each upstream file with the local copy. */
export function compareWithLocal(targets: PlannedFile[], cwd: string): FileChange[] {
  return targets.map((t) => {
    const abs = path.join(cwd, t.path);
    if (!fs.existsSync(abs)) return { ...t, status: "missing" };
    const local = fs.readFileSync(abs, "utf-8");
    return { ...t, status: normalize(local) === normalize(t.content) ? "unchanged" : "modified" };
  });
}

/** Registry items the CLI recorded in `ui-thing.lock.json`. */
export function readLock(cwd: string): LockFile {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(cwd, LOCK_FILE), "utf-8"));
    return data && typeof data.items === "object" ? data : { items: {} };
  } catch {
    return { items: {} };
  }
}

/** Built-in registries plus the ones in the project's config. */
export function allRegistries(config: UiThingConfig | null): Record<string, RegistrySource> {
  return { ...DEFAULT_REGISTRIES, ...(config?.registries ?? {}) };
}

const expandEnv = (value: string, env: NodeJS.ProcessEnv) =>
  value.replace(/\$\{(\w+)\}/g, (_, name) => env[name] ?? "");

/**
 * Candidate URLs for a registry's index, as the CLI's `registry list` tries them.
 * `source` is a `@namespace` or a registry URL.
 */
export function registryIndexUrls(
  source: string,
  registries: Record<string, RegistrySource>,
  env: NodeJS.ProcessEnv = process.env
): { url: string; headers: Record<string, string> }[] {
  if (source.startsWith("@") && !source.includes("/")) {
    const entry = registries[source];
    if (!entry)
      throw new Error(`Unknown registry ${source}. Add it with "Add Registry Namespace".`);
    const template = typeof entry === "string" ? entry : entry.url;
    const url = new URL(expandEnv(template.replace("{name}", "registry"), env));
    if (typeof entry !== "string") {
      for (const [k, v] of Object.entries(entry.params ?? {})) {
        url.searchParams.set(k, expandEnv(v, env));
      }
    }
    const headers =
      typeof entry === "string"
        ? {}
        : Object.fromEntries(
            Object.entries(entry.headers ?? {}).map(([k, v]) => [k, expandEnv(v, env)])
          );
    return [{ url: url.toString(), headers }];
  }
  if (/^https?:\/\//i.test(source)) {
    if (source.endsWith(".json")) return [{ url: source, headers: {} }];
    const origin = source.replace(/\/+$/, "");
    return [
      { url: `${origin}/r/registry.json`, headers: {} },
      { url: `${origin}/registry.json`, headers: {} },
    ];
  }
  throw new Error(`"${source}" must be a namespace like @nxui or a URL.`);
}

/** What `ui-thing add` accepts as a registry item: a URL, `@ns/name` or a local `.json` file. */
export const isRegistryRef = (value: string) =>
  /^https?:\/\//i.test(value) || /^@[^/\s]+\/\S+$/.test(value) || /\.json$/i.test(value);

/** The id `ui-thing block` expects, for example `BlockHero1`. */
export const blockId = (fileName: string) => fileName.replace(/\.vue$/, "");
