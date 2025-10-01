import * as vscode from "vscode";

import { API_URL, CACHE_KEY, TS_KEY } from "./constants";
import { ContextContainer } from "./context-container";
import { getOutputChannel, getTTLms } from "./helpers";
import { Component } from "./types";

const out = getOutputChannel();

/**
 * Returns the cached components if present and not stale, otherwise null.
 */
function getComponentsFromCache(): Component[] | null {
  const context = ContextContainer.context;
  const cache = context.globalState.get<Component[]>(CACHE_KEY);
  const ts = context.globalState.get<number>(TS_KEY);
  if (!cache || !ts) return null;

  const age = Date.now() - ts;
  return age < getTTLms() ? cache : null;
}

/**
 * Accepts components and stores them in the global state cache with a timestamp.
 */
export async function setComponentsCache(components: Component[]): Promise<void> {
  const context = ContextContainer.context;
  await context.globalState.update(CACHE_KEY, components);
  await context.globalState.update(TS_KEY, Date.now());
}

/**
 * Fetch with timeout using AbortController.
 */
async function fetchWithTimeout(input: string | URL, init?: RequestInit & { timeoutMs?: number }) {
  const { timeoutMs = 10000, ...rest } = init || {};
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Gets the components from the API, throwing on any error.
 */
export async function fetchComponentsFresh() {
  const res = await fetchWithTimeout(API_URL, { timeoutMs: 12000 });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching components`);
  const data = await res.json();
  return data as Component[];
}

/**
 * Get components using cache w/ TTL; if stale or missing, refresh.
 * Returns the catalog (cached or fresh).
 */
export async function getComponentsCatalog(): Promise<Component[]> {
  const cached = getComponentsFromCache();
  if (cached) return cached;

  const fresh = await fetchComponentsFresh();
  await setComponentsCache(fresh);
  return fresh;
}

/**
 * Preload components into cache on extension activation.
 *
 * Logs to output channel on success/failure.
 */
export async function preloadComponentsCatalog() {
  try {
    // Only fetch if not fresh already
    if (getComponentsFromCache()) return out.appendLine("Components cache is fresh");
    const fresh = await fetchComponentsFresh();
    await setComponentsCache(fresh);
    out.appendLine(`Preloaded ${fresh.length} components into cache`);
  } catch (e) {
    out.appendLine(`Failed to preload components: ${e}`);
    // Keep activation resilient; log to output if you have one
    vscode.window.showWarningMessage(`Failed to preload components`);
  }
}
