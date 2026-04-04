import { describe, expect, it } from "vitest";
import { generateMarketplaceJson } from "../marketplace-json-generator.server";
import type { MarketplaceDefinition } from "../../types/marketplace";
import type { PluginDefinition } from "../../types/plugin";
import { ERROR_CODES, FILE_PATHS } from "../../types/constants";

// テスト用のヘルパー関数
function makeMarketplace(
  overrides: Partial<MarketplaceDefinition> = {},
): MarketplaceDefinition {
  return {
    name: overrides.name ?? "test-marketplace",
    description: overrides.description,
    owner: overrides.owner,
    plugins: overrides.plugins ?? [],
  };
}

function makePlugin(
  overrides: Partial<PluginDefinition> = {},
): PluginDefinition {
  return {
    name: overrides.name ?? "my-plugin",
    description: overrides.description,
    category: overrides.category,
    skills: overrides.skills ?? [],
  };
}

describe("generateMarketplaceJson", () => {
  it("基本的なmarketplace.jsonを正しく生成すること", () => {
    const marketplace = makeMarketplace({
      name: "my-marketplace",
      description: "テスト用マーケットプレイス",
      owner: { name: "test-user" },
      plugins: [
        makePlugin({ name: "plugin-a", description: "プラグインA" }),
      ],
    });

    const result = generateMarketplaceJson(marketplace);
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
    const result = generateMarketplaceJson(
      makeMarketplace({ plugins: [makePlugin()] }),
    );

    expect(result.file.path).toBe(FILE_PATHS.MARKETPLACE_JSON);
  });

  it("categoryがプラグインエントリに反映されること", () => {
    const marketplace = makeMarketplace({
      plugins: [
        makePlugin({ name: "plugin-a", category: "development" }),
        makePlugin({ name: "plugin-b", category: "productivity" }),
      ],
    });

    const result = generateMarketplaceJson(marketplace);
    const json = JSON.parse(result.file.content);

    expect(json.plugins[0].category).toBe("development");
    expect(json.plugins[1].category).toBe("productivity");
  });

  it("categoryが未指定のプラグインにはcategoryが付与されないこと", () => {
    const marketplace = makeMarketplace({
      plugins: [
        makePlugin({ name: "plugin-a", category: "development" }),
        makePlugin({ name: "plugin-b" }),
      ],
    });

    const result = generateMarketplaceJson(marketplace);
    const json = JSON.parse(result.file.content);

    expect(json.plugins[0].category).toBe("development");
    expect(json.plugins[1].category).toBeUndefined();
  });

  it("descriptionが未指定のプラグインではdescriptionフィールドが省略されること", () => {
    const result = generateMarketplaceJson(
      makeMarketplace({ plugins: [makePlugin({ name: "no-desc" })] }),
    );
    const json = JSON.parse(result.file.content);

    expect(json.plugins[0].description).toBeUndefined();
  });

  it("ownerが未指定の場合にownerフィールドが省略されること", () => {
    const result = generateMarketplaceJson(
      makeMarketplace({ name: "test", plugins: [makePlugin()] }),
    );
    const json = JSON.parse(result.file.content);

    expect(json.owner).toBeUndefined();
  });

  it("descriptionが未指定の場合にdescriptionフィールドが省略されること", () => {
    const result = generateMarketplaceJson(
      makeMarketplace({ name: "test", plugins: [makePlugin()] }),
    );
    const json = JSON.parse(result.file.content);

    expect(json.description).toBeUndefined();
  });

  it("nameが空文字の場合にエラーを返すこと", () => {
    const result = generateMarketplaceJson(
      makeMarketplace({ name: "", plugins: [makePlugin()] }),
    );

    const errors = result.errors.filter((e) => e.severity === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe(ERROR_CODES.MARKETPLACE_NAME_REQUIRED);
  });

  it("プラグインが0件の場合に警告を返すこと", () => {
    const result = generateMarketplaceJson(makeMarketplace({ plugins: [] }));

    const warnings = result.errors.filter((e) => e.severity === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe(ERROR_CODES.MARKETPLACE_NO_PLUGINS);
  });

  it("plugins配列の順序が維持されること", () => {
    const marketplace = makeMarketplace({
      plugins: [
        makePlugin({ name: "gamma" }),
        makePlugin({ name: "alpha" }),
        makePlugin({ name: "beta" }),
      ],
    });

    const result = generateMarketplaceJson(marketplace);
    const json = JSON.parse(result.file.content);

    expect(json.plugins.map((p: { name: string }) => p.name)).toEqual([
      "gamma",
      "alpha",
      "beta",
    ]);
  });

  it("出力JSONが末尾改行を含むこと", () => {
    const result = generateMarketplaceJson(
      makeMarketplace({ plugins: [makePlugin()] }),
    );

    expect(result.file.content.endsWith("\n")).toBe(true);
  });

  it("sourceがplugin名から正しく生成されること", () => {
    const result = generateMarketplaceJson(
      makeMarketplace({
        plugins: [makePlugin({ name: "my-custom-plugin" })],
      }),
    );
    const json = JSON.parse(result.file.content);

    expect(json.plugins[0].source).toBe("./plugins/my-custom-plugin");
  });
});
