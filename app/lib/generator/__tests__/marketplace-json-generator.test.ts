import { describe, expect, it } from "vitest";
import { generateMarketplaceJson } from "../marketplace-json-generator.server";
import type { MarketplaceDefinition } from "../../types/marketplace";
import type { MarketplacePluginInfo } from "../marketplace-json-generator.server";

// テスト用のヘルパー関数
function makeMarketplace(
  overrides: Partial<MarketplaceDefinition> = {},
): MarketplaceDefinition {
  return {
    name: overrides.name ?? "test-marketplace",
    description: overrides.description,
    owner: overrides.owner,
    pluginOverrides: overrides.pluginOverrides,
  };
}

function makePlugin(
  overrides: Partial<MarketplacePluginInfo> = {},
): MarketplacePluginInfo {
  return {
    dirName: overrides.dirName ?? "my-plugin",
    name: overrides.name ?? "my-plugin",
    description: overrides.description,
  };
}

describe("generateMarketplaceJson", () => {
  it("基本的なmarketplace.jsonを正しく生成すること", () => {
    const marketplace = makeMarketplace({
      name: "my-marketplace",
      description: "テスト用マーケットプレイス",
      owner: { name: "test-user" },
    });
    const plugins = [
      makePlugin({
        dirName: "plugin-a",
        name: "plugin-a",
        description: "プラグインA",
      }),
    ];

    const result = generateMarketplaceJson({ marketplace, plugins });
    const json = JSON.parse(result.file.content);

    expect(json.$schema).toBe(
      "https://anthropic.com/claude-code/marketplace.schema.json",
    );
    expect(json.name).toBe("my-marketplace");
    expect(json.description).toBe("テスト用マーケットプレイス");
    expect(json.owner).toEqual({ name: "test-user" });
    expect(json.plugins).toHaveLength(1);
    expect(json.plugins[0]).toEqual({
      name: "plugin-a",
      description: "プラグインA",
      source: "./plugins/plugin-a",
    });
  });

  it("出力パスが .claude-plugin/marketplace.json であること", () => {
    const result = generateMarketplaceJson({
      marketplace: makeMarketplace(),
      plugins: [makePlugin()],
    });

    expect(result.file.path).toBe(".claude-plugin/marketplace.json");
  });

  it("pluginOverridesのcategoryがプラグインエントリに反映されること", () => {
    const marketplace = makeMarketplace({
      pluginOverrides: {
        "plugin-a": { category: "development" },
        "plugin-b": { category: "productivity" },
      },
    });
    const plugins = [
      makePlugin({ dirName: "plugin-a", name: "plugin-a" }),
      makePlugin({ dirName: "plugin-b", name: "plugin-b" }),
    ];

    const result = generateMarketplaceJson({ marketplace, plugins });
    const json = JSON.parse(result.file.content);

    expect(json.plugins[0].category).toBe("development");
    expect(json.plugins[1].category).toBe("productivity");
  });

  it("pluginOverridesが未定義のプラグインにはcategoryが付与されないこと", () => {
    const marketplace = makeMarketplace({
      pluginOverrides: {
        "plugin-a": { category: "development" },
      },
    });
    const plugins = [
      makePlugin({ dirName: "plugin-a", name: "plugin-a" }),
      makePlugin({ dirName: "plugin-b", name: "plugin-b" }),
    ];

    const result = generateMarketplaceJson({ marketplace, plugins });
    const json = JSON.parse(result.file.content);

    expect(json.plugins[0].category).toBe("development");
    expect(json.plugins[1].category).toBeUndefined();
  });

  it("descriptionが未指定のプラグインではdescriptionフィールドが省略されること", () => {
    const result = generateMarketplaceJson({
      marketplace: makeMarketplace(),
      plugins: [makePlugin({ dirName: "no-desc", name: "no-desc" })],
    });
    const json = JSON.parse(result.file.content);

    expect(json.plugins[0].description).toBeUndefined();
  });

  it("ownerが未指定の場合にownerフィールドが省略されること", () => {
    const result = generateMarketplaceJson({
      marketplace: makeMarketplace({ name: "test" }),
      plugins: [makePlugin()],
    });
    const json = JSON.parse(result.file.content);

    expect(json.owner).toBeUndefined();
  });

  it("descriptionが未指定の場合にdescriptionフィールドが省略されること", () => {
    const result = generateMarketplaceJson({
      marketplace: makeMarketplace({ name: "test" }),
      plugins: [makePlugin()],
    });
    const json = JSON.parse(result.file.content);

    expect(json.description).toBeUndefined();
  });

  it("nameが空文字の場合にエラーを返すこと", () => {
    const result = generateMarketplaceJson({
      marketplace: makeMarketplace({ name: "" }),
      plugins: [makePlugin()],
    });

    const errors = result.errors.filter((e) => e.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("MARKETPLACE_NAME_REQUIRED");
  });

  it("プラグインが0件の場合に警告を返すこと", () => {
    const result = generateMarketplaceJson({
      marketplace: makeMarketplace(),
      plugins: [],
    });

    const warnings = result.errors.filter((e) => e.severity === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("MARKETPLACE_NO_PLUGINS");
  });

  it("複数プラグインが正しい順序で出力されること", () => {
    const plugins = [
      makePlugin({ dirName: "alpha", name: "alpha" }),
      makePlugin({ dirName: "beta", name: "beta" }),
      makePlugin({ dirName: "gamma", name: "gamma" }),
    ];

    const result = generateMarketplaceJson({
      marketplace: makeMarketplace(),
      plugins,
    });
    const json = JSON.parse(result.file.content);

    expect(json.plugins.map((p: { name: string }) => p.name)).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  it("出力JSONが末尾改行を含むこと", () => {
    const result = generateMarketplaceJson({
      marketplace: makeMarketplace(),
      plugins: [makePlugin()],
    });

    expect(result.file.content.endsWith("\n")).toBe(true);
  });

  it("sourceがdirNameから正しく生成されること", () => {
    const result = generateMarketplaceJson({
      marketplace: makeMarketplace(),
      plugins: [makePlugin({ dirName: "my-custom-plugin", name: "custom" })],
    });
    const json = JSON.parse(result.file.content);

    expect(json.plugins[0].source).toBe("./plugins/my-custom-plugin");
  });
});
