import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "test/e2e/**/*.test.cjs",
  workspaceFolder: "test/fixtures/nuxt-app",
  mocha: { ui: "bdd", timeout: 60000 },
});
