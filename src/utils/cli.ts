/**
 * Builds the shell commands the extension sends to the terminal.
 *
 * Pure (no `vscode` import) so it can be unit tested.
 */
import * as fs from "fs";
import * as path from "path";
import type { PackageManager } from "./types";

const LOCKFILES: Array<[string, PackageManager]> = [
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["deno.lock", "deno"],
];

const KNOWN = new Set<PackageManager>(["npm", "pnpm", "yarn", "bun", "deno"]);

const readPackageJson = (cwd: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf-8"));
  } catch {
    return null;
  }
};

/**
 * Works out which package manager a project uses: lockfile first, then the
 * `packageManager` field in package.json, then npm. Same order as the CLI.
 */
export function detectPackageManager(cwd: string): PackageManager {
  for (const [file, pm] of LOCKFILES) {
    if (fs.existsSync(path.join(cwd, file))) return pm;
  }
  const field = readPackageJson(cwd)?.packageManager;
  if (typeof field === "string") {
    const name = field.split("@")[0] as PackageManager;
    if (KNOWN.has(name)) return name;
  }
  return "npm";
}

/**
 * The package manager to use: the `uithing.packageManager` setting, or the detected one when it is `auto`.
 */
export function resolvePackageManager(setting: string, cwd: string): PackageManager {
  return KNOWN.has(setting as PackageManager)
    ? (setting as PackageManager)
    : detectPackageManager(cwd);
}

/** Yarn 2+ has `yarn dlx`; Yarn 1 does not. */
function isYarnBerry(cwd: string): boolean {
  if (fs.existsSync(path.join(cwd, ".yarnrc.yml"))) return true;
  const field = readPackageJson(cwd)?.packageManager;
  return typeof field === "string" && /^yarn@([2-9]|\d{2,})/.test(field);
}

/**
 * Quotes a shell argument only when it needs it, so commands stay readable.
 * POSIX shells get single quotes; Windows (PowerShell and cmd) gets double quotes.
 */
export function quoteArg(arg: string, platform: NodeJS.Platform = process.platform): string {
  if (/^[\w@%+=:,./-]+$/.test(arg)) return arg;
  if (platform === "win32") return `"${arg.replace(/"/g, '\\"')}"`;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

type RunOptions = {
  pm: PackageManager;
  /** Project folder, used to tell Yarn 1 from Yarn 2+. */
  cwd?: string;
  platform?: NodeJS.Platform;
};

/**
 * The command that downloads and runs an npm package with the project's package manager,
 * for example `pnpm dlx ui-thing@latest add button`.
 */
export function buildRunCommand(pkg: string, args: string[], options: RunOptions): string {
  const quoted = args.map((a) => quoteArg(a, options.platform)).join(" ");
  const tail = quoted ? ` ${quoted}` : "";
  switch (options.pm) {
    case "pnpm":
      return `pnpm dlx ${pkg}${tail}`;
    case "bun":
      return `bunx ${pkg}${tail}`;
    case "deno":
      return `deno run -A npm:${pkg}${tail}`;
    case "yarn":
      if (options.cwd && isYarnBerry(options.cwd)) return `yarn dlx ${pkg}${tail}`;
      return `npx -y ${pkg}${tail}`;
    default:
      return `npx -y ${pkg}${tail}`;
  }
}

/** `ui-thing@<channel> <args>` with the right runner. */
export function buildCliCommand(
  args: string[],
  options: RunOptions & { channel?: string }
): string {
  return buildRunCommand(`ui-thing@${options.channel || "latest"}`, args, options);
}

/** The command that scaffolds a new Nuxt app in `folder`. */
export function buildCreateNuxtCommand(
  folder: string,
  pm: PackageManager,
  platform: NodeJS.Platform = process.platform
): string {
  const dir = quoteArg(folder, platform);
  switch (pm) {
    case "pnpm":
      return `pnpm create nuxt@latest ${dir}`;
    case "bun":
      return `bun create nuxt@latest ${dir}`;
    case "yarn":
      return `yarn create nuxt ${dir}`;
    case "deno":
      return `deno -A npm:create-nuxt@latest ${dir}`;
    default:
      return `npm create nuxt@latest ${dir}`;
  }
}
