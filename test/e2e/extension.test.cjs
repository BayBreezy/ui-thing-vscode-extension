// Runs inside a VS Code extension host against test/fixtures/nuxt-app (see .vscode-test.mjs).
// Needs network access: the views load the catalog from uithing.com.
const assert = require("assert");
const vscode = require("vscode");

const EXTENSION_ID = "uithing.ui-thing-vscode-extension";

describe("UI Thing extension", () => {
  let api;
  let extension;

  before(async () => {
    extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} is not installed in the test host`);
    api = await extension.activate();
  });

  it("registers every contributed command", async () => {
    const registered = new Set(await vscode.commands.getCommands(true));
    const contributed = extension.packageJSON.contributes.commands.map((c) => c.command);
    const missing = contributed.filter((id) => !registered.has(id));
    assert.deepStrictEqual(missing, []);
  });

  it("lists installed components and registry items", async () => {
    const groups = await api.views.installed.getChildren();
    assert.deepStrictEqual(
      groups.map((g) => g.id),
      ["components", "registry"]
    );
    const [components, registry] = groups;
    assert.ok(
      components.children.some((n) => n.type === "installed" && n.component.value === "button"),
      "button should be installed"
    );
    assert.deepStrictEqual(
      registry.children.map((n) => n.name),
      ["HoloMosaic"]
    );
  });

  it("marks installed components in the catalog", async () => {
    const nodes = await api.views.components.getChildren();
    assert.ok(nodes.length > 50, `expected the full catalog, got ${nodes.length}`);
    const button = nodes.find((n) => n.component.value === "button");
    const dialog = nodes.find((n) => n.component.value === "dialog");
    assert.strictEqual(button.installed, true);
    assert.strictEqual(dialog.installed, false);
  });

  it("lists block categories and their blocks", async () => {
    const categories = await api.views.blocks.getChildren();
    const hero = categories.find((c) => c.category === "Hero");
    assert.ok(hero, "Hero category");
    const blocks = await api.views.blocks.getChildren(hero);
    assert.ok(blocks.some((b) => b.block.fileName === "BlockHero1.vue"));
  });

  it("provides the UI Thing MCP server, and stops when the setting is off", async () => {
    const [server] = api.mcpServerDefinitions();
    assert.strictEqual(server.label, "UI Thing");
    assert.strictEqual(server.uri.toString(), "https://uithing.com/mcp");

    const config = vscode.workspace.getConfiguration("uithing.mcp");
    await config.update("enabled", false, vscode.ConfigurationTarget.Global);
    try {
      assert.deepStrictEqual(api.mcpServerDefinitions(), []);
    } finally {
      await config.update("enabled", undefined, vscode.ConfigurationTarget.Global);
    }
  });

  it("opens upstream source as a read-only document", async () => {
    const nodes = await api.views.components.getChildren();
    const button = nodes.find((n) => n.component.value === "button");
    await vscode.commands.executeCommand("uithing.viewSource", button);
    const doc = vscode.window.activeTextEditor?.document;
    assert.strictEqual(doc?.uri.scheme, "uithing-upstream");
    assert.ok(doc.uri.path.endsWith("/Button.vue"));
    assert.ok(doc.getText().includes("<template"));
  });
});
