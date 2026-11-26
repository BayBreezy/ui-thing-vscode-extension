import { defineConfig } from "tsdown";

const watching = process.argv.includes("-w") || process.argv.includes("--watch");

export default defineConfig({
  entry: ["./src/extension.ts"],
  dts: false,
  format: "cjs",
  outDir: "dist",
  external: ["vscode"],
  noExternal: ["c12"],
  minify: false,
  // Reinstall into the local VS Code profile only while developing (`npm run dev`).
  onSuccess: watching ? "npm run install:local" : undefined,
});
