import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  buildCliCommand,
  buildCreateNuxtCommand,
  buildRunCommand,
  detectPackageManager,
  quoteArg,
  resolvePackageManager,
} from "../../src/utils/cli";

let dir: string;
const touch = (file: string, content = "") => fs.writeFileSync(path.join(dir, file), content);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "uithing-cli-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("detectPackageManager", () => {
  it.each([
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["deno.lock", "deno"],
  ])("detects %s as %s", (lockfile, pm) => {
    touch(lockfile);
    expect(detectPackageManager(dir)).toBe(pm);
  });

  it("falls back to the packageManager field", () => {
    touch("package.json", JSON.stringify({ packageManager: "pnpm@10.0.0" }));
    expect(detectPackageManager(dir)).toBe("pnpm");
  });

  it("defaults to npm", () => {
    expect(detectPackageManager(dir)).toBe("npm");
  });

  it("uses the setting unless it is auto", () => {
    touch("pnpm-lock.yaml");
    expect(resolvePackageManager("bun", dir)).toBe("bun");
    expect(resolvePackageManager("auto", dir)).toBe("pnpm");
  });
});

describe("buildCliCommand", () => {
  it.each([
    ["npm", "npx -y ui-thing@latest add button"],
    ["pnpm", "pnpm dlx ui-thing@latest add button"],
    ["bun", "bunx ui-thing@latest add button"],
    ["deno", "deno run -A npm:ui-thing@latest add button"],
  ] as const)("uses the %s runner", (pm, expected) => {
    expect(buildCliCommand(["add", "button"], { pm })).toBe(expected);
  });

  it("uses npx for Yarn 1 and yarn dlx for Yarn 2+", () => {
    expect(buildCliCommand(["info"], { pm: "yarn", cwd: dir })).toBe("npx -y ui-thing@latest info");
    touch(".yarnrc.yml");
    expect(buildCliCommand(["info"], { pm: "yarn", cwd: dir })).toBe(
      "yarn dlx ui-thing@latest info"
    );
  });

  it("pins the CLI channel", () => {
    expect(buildCliCommand(["init", "--yes"], { pm: "npm", channel: "0.4.1" })).toBe(
      "npx -y ui-thing@0.4.1 init --yes"
    );
  });

  it("leaves registry refs and URLs unquoted when they are safe", () => {
    expect(
      buildCliCommand(["add", "@vue-bits/HoloMosaic", "https://nxui.geoql.in/r/fluid-glass.json"], {
        pm: "npm",
        platform: "darwin",
      })
    ).toBe(
      "npx -y ui-thing@latest add @vue-bits/HoloMosaic https://nxui.geoql.in/r/fluid-glass.json"
    );
  });

  it("quotes URL templates and query strings", () => {
    expect(
      buildCliCommand(["registry", "add-namespace", "@acme", "https://acme.dev/r/{name}.json"], {
        pm: "npm",
        platform: "linux",
      })
    ).toBe("npx -y ui-thing@latest registry add-namespace @acme 'https://acme.dev/r/{name}.json'");
  });

  it("runs other packages too", () => {
    expect(
      buildRunCommand("skills", ["add", "https://github.com/BayBreezy/ui-thing"], { pm: "bun" })
    ).toBe("bunx skills add https://github.com/BayBreezy/ui-thing");
  });
});

describe("quoteArg", () => {
  it("escapes single quotes on POSIX", () => {
    expect(quoteArg("it's here", "linux")).toBe(`'it'\\''s here'`);
  });
  it("uses double quotes on Windows", () => {
    expect(quoteArg("a b&c", "win32")).toBe('"a b&c"');
  });
});

describe("buildCreateNuxtCommand", () => {
  it.each([
    ["npm", "npm create nuxt@latest my-app"],
    ["pnpm", "pnpm create nuxt@latest my-app"],
    ["bun", "bun create nuxt@latest my-app"],
    ["yarn", "yarn create nuxt my-app"],
    ["deno", "deno -A npm:create-nuxt@latest my-app"],
  ] as const)("%s", (pm, expected) => {
    expect(buildCreateNuxtCommand("my-app", pm, "darwin")).toBe(expected);
  });

  it("quotes folders with spaces", () => {
    expect(buildCreateNuxtCommand("my app", "npm", "darwin")).toBe(
      "npm create nuxt@latest 'my app'"
    );
  });
});
