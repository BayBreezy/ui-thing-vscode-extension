import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/extension.ts"],
  dts: false,
  format: "cjs",
  outDir: "dist",
  external: ["vscode"],
  noExternal: ["c12"],
  minify: false,
  onSuccess: "npm run install:local",
});
