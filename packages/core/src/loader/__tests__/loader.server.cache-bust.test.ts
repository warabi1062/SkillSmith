import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { loadPluginDefinition } from "../loader.server";

// mtime ベースのキャッシュバスターが効いていることを保証する回帰テスト。
// jiti / Node ESM ローダーのプロセス内キャッシュにより、ナイーブな実装では
// plugin.ts を上書きしても 2 回目の loadPluginDefinition が古い内容を返してしまう。

let tmpDir: string;

async function writePluginTs(description: string): Promise<void> {
  const src = `
    const plugin = {
      name: "cache-bust-plugin",
      description: ${JSON.stringify(description)},
      skills: [
        { skillType: "WORKER", name: "noop", content: "# noop" },
      ],
    };
    export default plugin;
  `;
  await fs.writeFile(path.join(tmpDir, "plugin.ts"), src);
}

describe("loadPluginDefinition: mtime キャッシュバスター", () => {
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "skillsmith-cache-bust-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("plugin.ts を上書きすると 2 回目の読み込みで新しい内容が返ること", async () => {
    await writePluginTs("初回の説明");
    const first = await loadPluginDefinition(tmpDir);
    expect(first.description).toBe("初回の説明");

    // mtime を確実にずらすため少し待ってから上書きする
    // （ファイルシステムの mtime 解像度が ms の OS でも安全側に倒す）
    await new Promise((r) => setTimeout(r, 20));
    await writePluginTs("更新後の説明");

    const second = await loadPluginDefinition(tmpDir);
    expect(second.description).toBe("更新後の説明");
  });
});
