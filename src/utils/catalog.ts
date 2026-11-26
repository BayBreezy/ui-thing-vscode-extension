import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import type { BlockComponent, Component, RegistryIndexItem, RegistrySource } from "./types";

import { API } from "./constants";
import { ContextContainer } from "./context-container";
import { getOutputChannel, getTTLms } from "./helpers";
import { registryIndexUrls } from "./project";

type Resources = {
  components: Component[];
  blocks: BlockComponent[];
  blockCategories: string[];
};
type ResourceKey = keyof Resources;

const URLS: Record<ResourceKey, string> = {
  components: API.components,
  blocks: API.blocks,
  blockCategories: API.blockCategories,
};

/** Old v0.0.1 globalState keys; the catalog now lives in files under globalStorage. */
const LEGACY_KEYS = ["uithing.componentsCache", "uithing.componentsCache.ts"];

type Entry<T> = { ts: number; data: T };

const memory = new Map<ResourceKey, Entry<unknown>>();
const inFlight = new Map<ResourceKey, Promise<unknown>>();

/** Fires with the resource that changed, so views can re-render. */
export const catalogChanged = new vscode.EventEmitter<ResourceKey>();

const cacheFile = (key: ResourceKey) =>
  path.join(ContextContainer.context.globalStorageUri.fsPath, `${key}.json`);

const isFresh = (entry: Entry<unknown> | undefined | null) =>
  Boolean(entry && Date.now() - entry.ts < getTTLms());

async function readDiskCache<T>(key: ResourceKey): Promise<Entry<T> | null> {
  try {
    return JSON.parse(await fs.readFile(cacheFile(key), "utf-8"));
  } catch {
    return null;
  }
}

async function writeDiskCache<T>(key: ResourceKey, entry: Entry<T>) {
  const file = cacheFile(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(entry));
}

/**
 * Fetch with timeout using AbortController.
 */
async function fetchJson<T>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 20000
): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`${url} did not return JSON`);
    }
  } finally {
    clearTimeout(id);
  }
}

/**
 * Returns a catalog resource from memory, then disk, then the network.
 * With `force`, always fetches. When the network fails, falls back to a stale copy if there is one.
 */
async function getResource<K extends ResourceKey>(
  key: K,
  { force = false } = {}
): Promise<Resources[K]> {
  if (!force) {
    const mem = memory.get(key);
    if (isFresh(mem)) return mem!.data as Resources[K];
    const disk = await readDiskCache<Resources[K]>(key);
    if (isFresh(disk)) {
      memory.set(key, disk!);
      return disk!.data;
    }
  }

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<Resources[K]>;

  const request = (async () => {
    try {
      const data = await fetchJson<Resources[K]>(URLS[key]);
      if (!Array.isArray(data)) throw new Error(`Unexpected response from ${URLS[key]}`);
      const entry = { ts: Date.now(), data };
      memory.set(key, entry);
      await writeDiskCache(key, entry).catch(() => undefined);
      catalogChanged.fire(key);
      return data;
    } catch (error) {
      const stale = (memory.get(key) as Entry<Resources[K]>) ?? (await readDiskCache(key));
      if (stale) {
        getOutputChannel().warn(`Using cached ${key}: ${error}`);
        return stale.data;
      }
      throw error;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, request);
  return request;
}

export const getComponentsCatalog = (options?: { force?: boolean }) =>
  getResource("components", options);
export const getBlocksCatalog = (options?: { force?: boolean }) => getResource("blocks", options);
export const getBlockCategories = (options?: { force?: boolean }) =>
  getResource("blockCategories", options);

/** Re-downloads every resource that has been loaded (components always). */
export async function refreshCatalog() {
  const keys = new Set<ResourceKey>(["components", ...memory.keys()]);
  const results = await Promise.all([...keys].map((key) => getResource(key, { force: true })));
  return { components: results[0] as Component[] };
}

/**
 * Preload components into cache on extension activation. Blocks are large, so they load on demand.
 */
export async function preloadComponentsCatalog() {
  const out = getOutputChannel();
  const context = ContextContainer.context;
  for (const key of LEGACY_KEYS) {
    if (context.globalState.get(key) !== undefined) void context.globalState.update(key, undefined);
  }
  try {
    const components = await getComponentsCatalog();
    out.info(`Components catalog ready (${components.length} components)`);
  } catch (e) {
    out.error(`Failed to preload components: ${e}`);
    vscode.window.showWarningMessage(
      "UI Thing: could not load the components catalog. Check your connection, then run UI Thing: Refresh Catalog."
    );
  }
}

/** The items of a shadcn-style registry (`@namespace` or URL). */
export async function fetchRegistryIndex(
  source: string,
  registries: Record<string, RegistrySource>
): Promise<RegistryIndexItem[]> {
  let lastError: unknown;
  for (const { url, headers } of registryIndexUrls(source, registries)) {
    try {
      const data = await fetchJson<{ items?: RegistryIndexItem[] }>(url, headers);
      if (Array.isArray(data?.items)) return data.items.filter((i) => i && i.name);
      lastError = new Error(`${url} is not a registry index`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
