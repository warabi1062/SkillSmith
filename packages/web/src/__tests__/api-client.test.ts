import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchMarketplace,
  fetchMarketplaces,
  fetchPlugin,
} from "../api-client";

describe("api-client", () => {
  // グローバル fetch をモック対象にする
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockFetch.mockReset();
  });

  it("fetchMarketplaces は /api/marketplaces を GET する", async () => {
    const body = [{ dirName: "example", pluginCount: 2 }];
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchMarketplaces();

    expect(mockFetch).toHaveBeenCalledWith("/api/marketplaces");
    expect(result).toEqual(body);
  });

  it("fetchMarketplace は /api/marketplaces/:id を GET し id を URL エンコードする", async () => {
    const body = { marketplaceId: "a/b", plugins: [] };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await fetchMarketplace("a/b");

    expect(mockFetch).toHaveBeenCalledWith("/api/marketplaces/a%2Fb");
    expect(result).toEqual(body);
  });

  it("fetchPlugin は /api/marketplaces/:id/plugins/:name を GET する", async () => {
    const body = {
      plugin: { name: "hello-world", skills: [] },
      pluginId: "hello-world",
      marketplaceId: "example",
    };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status: 200 }),
    );

    const result = await fetchPlugin("example", "hello-world");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/marketplaces/example/plugins/hello-world",
    );
    expect(result).toEqual(body);
  });

  it("fetchPlugin は id / name の両方を encodeURIComponent で URL エスケープする", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          plugin: { name: "x", skills: [] },
          pluginId: "pl/b",
          marketplaceId: "mp/a",
        }),
        { status: 200 },
      ),
    );

    await fetchPlugin("mp/a", "pl/b");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/marketplaces/mp%2Fa/plugins/pl%2Fb",
    );
  });

  it("非 200 応答では Response を throw する", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("Not Found", { status: 404, statusText: "Not Found" }),
    );

    await expect(fetchMarketplaces()).rejects.toBeInstanceOf(Response);
  });
});
