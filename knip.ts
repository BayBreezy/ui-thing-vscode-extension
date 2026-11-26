import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: ["test/unit/**/*.test.ts", "test/e2e/**/*.test.cjs", ".vscode-test.mjs"],
  ignore: ["test/fixtures/**"],
  exclude: ["devDependencies", "binaries"],
};

export default config;
