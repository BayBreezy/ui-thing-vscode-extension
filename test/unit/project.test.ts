import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Component } from "../../src/utils/types";

import {
  blockId,
  compareWithLocal,
  componentTargets,
  detectNuxtMajor,
  hasNuxtConfig,
  installedComponents,
  isRegistryRef,
  readLock,
  registryIndexUrls,
  resolvePaths,
} from "../../src/utils/project";

let dir: string;
const write = (file: string, content = "") => {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), content);
};

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "uithing-project-"));
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const file = (fileName: string, fileContent = `<!-- ${fileName} -->\n`) => ({
  fileName,
  dirPath: "app/components/Ui",
  fileContent,
});

const accordion: Component = {
  name: "Accordion",
  value: "accordion",
  docsPath: "/components/accordion",
  files: [file("Accordion/Accordion.vue"), file("Accordion/Item.vue")],
  utils: [],
  composables: [],
  plugins: [],
};

const toast: Component = {
  name: "Toast",
  value: "toast",
  files: [file("Toast/Toast.vue")],
  utils: [],
  composables: [file("useToast.ts", "export const useToast = () => {};\n")],
  plugins: [],
};

const button: Component = {
  name: "Button",
  value: "button",
  files: [file("Button.vue")],
  utils: [],
  composables: [],
  plugins: [],
};

describe("project paths", () => {
  it("finds nuxt.config files", () => {
    expect(hasNuxtConfig(dir)).toBe(false);
    write("nuxt.config.ts", "export default {}");
    expect(hasNuxtConfig(dir)).toBe(true);
  });

  it("detects Nuxt 3 and defaults to Nuxt 4", () => {
    expect(detectNuxtMajor(dir)).toBe(4);
    write("package.json", JSON.stringify({ dependencies: { nuxt: "^3.15.0" } }));
    expect(detectNuxtMajor(dir)).toBe(3);
    write("package.json", JSON.stringify({ dependencies: { nuxt: "^4.2.0" } }));
    expect(detectNuxtMajor(dir)).toBe(4);
  });

  it("uses the config, falling back to CLI defaults", () => {
    expect(resolvePaths(null, dir).componentsLocation).toBe("app/components/Ui");
    expect(resolvePaths({ componentsLocation: "src/ui" }, dir)).toMatchObject({
      componentsLocation: "src/ui",
      composablesLocation: "app/composables",
    });
    write("package.json", JSON.stringify({ devDependencies: { nuxt: "3.17.0" } }));
    expect(resolvePaths(null, dir).componentsLocation).toBe("components/Ui");
  });
});

describe("componentTargets", () => {
  it("maps each file group to its configured folder", () => {
    const targets = componentTargets(toast, resolvePaths({ composablesLocation: "lib" }, dir));
    expect(targets.map((t) => [t.kind, t.path])).toEqual([
      ["component", "app/components/Ui/Toast/Toast.vue"],
      ["composable", "lib/useToast.ts"],
    ]);
  });
});

describe("installed components", () => {
  it("counts a component as installed when its first component file exists", () => {
    const paths = resolvePaths(null, dir);
    write("app/components/Ui/Accordion/Accordion.vue");
    write("app/composables/useToast.ts");
    expect(installedComponents([accordion, toast, button], paths, dir).map((c) => c.value)).toEqual(
      ["accordion"]
    );
  });

  it("reports modified, missing and unchanged files", () => {
    const paths = resolvePaths(null, dir);
    write("app/components/Ui/Accordion/Accordion.vue", "<!-- Accordion/Accordion.vue -->\r\n");
    const changes = compareWithLocal(componentTargets(accordion, paths), dir);
    expect(changes.map((c) => c.status)).toEqual(["unchanged", "missing"]);

    write("app/components/Ui/Accordion/Accordion.vue", "<!-- edited -->\n");
    expect(compareWithLocal(componentTargets(accordion, paths), dir)[0].status).toBe("modified");
  });
});

describe("readLock", () => {
  it("returns registry items, or none when the lockfile is missing or broken", () => {
    expect(readLock(dir)).toEqual({ items: {} });
    write("ui-thing.lock.json", "{ nope");
    expect(readLock(dir)).toEqual({ items: {} });
    write(
      "ui-thing.lock.json",
      JSON.stringify({
        items: {
          HoloMosaic: {
            source: "https://vue-bits.dev/r/HoloMosaic.json",
            files: ["app/components/Ui/HoloMosaic/HoloMosaic.vue"],
          },
        },
      })
    );
    expect(Object.keys(readLock(dir).items)).toEqual(["HoloMosaic"]);
  });
});

describe("registryIndexUrls", () => {
  const registries = {
    "@vue-bits": "https://vue-bits.dev/r/{name}.json",
    "@private": {
      url: "https://private.dev/r/{name}.json",
      headers: { Authorization: "Bearer ${TOKEN}" },
      params: { v: "2" },
    },
  };

  it("resolves a namespace to its registry.json", () => {
    expect(registryIndexUrls("@vue-bits", registries)).toEqual([
      { url: "https://vue-bits.dev/r/registry.json", headers: {} },
    ]);
  });

  it("expands env vars in headers and adds params", () => {
    expect(registryIndexUrls("@private", registries, { TOKEN: "abc" })).toEqual([
      { url: "https://private.dev/r/registry.json?v=2", headers: { Authorization: "Bearer abc" } },
    ]);
  });

  it("tries /r/registry.json then /registry.json for a site URL", () => {
    expect(registryIndexUrls("https://nxui.geoql.in/", registries).map((c) => c.url)).toEqual([
      "https://nxui.geoql.in/r/registry.json",
      "https://nxui.geoql.in/registry.json",
    ]);
  });

  it("rejects unknown namespaces and other input", () => {
    expect(() => registryIndexUrls("@nope", registries)).toThrow(/Unknown registry/);
    expect(() => registryIndexUrls("button", registries)).toThrow(/namespace/);
  });
});

describe("refs", () => {
  it("recognises registry refs", () => {
    expect(isRegistryRef("@vue-bits/HoloMosaic")).toBe(true);
    expect(isRegistryRef("https://nxui.geoql.in/r/fluid-glass.json")).toBe(true);
    expect(isRegistryRef("./item.json")).toBe(true);
    expect(isRegistryRef("button")).toBe(false);
    expect(isRegistryRef("@vue-bits")).toBe(false);
  });

  it("turns block file names into CLI ids", () => {
    expect(blockId("BlockHero1.vue")).toBe("BlockHero1");
  });
});
