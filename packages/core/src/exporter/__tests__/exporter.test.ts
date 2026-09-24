import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readdir, rm, stat, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { exportPlugin } from "../exporter.server";
import { ERROR_CODES, FILE_PATHS } from "../../types/constants";
import type { LoadedPluginDefinition } from "../../types/loaded";

describe("exportPlugin", () => {
  let targetDir: string;

  beforeEach(async () => {
    targetDir = await mkdtemp(path.join(tmpdir(), "skillsmith-exporter-test-"));
  });

  afterEach(async () => {
    await rm(targetDir, { recursive: true, force: true });
  });

  it("severity が error のバリデーション結果があればファイルを書き出さずに失敗すること", async () => {
    const plugin: LoadedPluginDefinition = {
      name: "bad-hooks",
      skills: [],
      hooks: {
        hooks: {
          // Stop はツール系イベントではないので if は使えない
          Stop: [
            { hooks: [{ type: "command", command: "echo", if: "Bash(*)" }] },
          ],
        },
      },
    };

    const result = await exportPlugin(plugin, { targetDir, overwrite: true });

    expect(result.success).toBe(false);
    expect(result.writtenFiles).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(ERROR_CODES.HOOK_IF_NOT_ALLOWED);
    expect(result.errors[0]).toContain("hooks.Stop[0].hooks[0].if");
    expect(result.validationErrors.map((e) => e.code)).toEqual([
      ERROR_CODES.HOOK_IF_NOT_ALLOWED,
    ]);
    // 出力先には何も書かれていない
    expect(existsSync(path.join(targetDir, FILE_PATHS.PLUGIN_JSON))).toBe(
      false,
    );
    expect(await readdir(targetDir)).toHaveLength(0);
  });

  it("severity が warning のみなら書き出しを行い、validationErrors に warning を含めること", async () => {
    const plugin: LoadedPluginDefinition = {
      name: "warn-hooks",
      skills: [],
      hooks: {
        hooks: {
          // 未知のイベント名は warning
          BrandNewEvent: [{ hooks: [{ type: "command", command: "echo" }] }],
        },
      },
    };

    const result = await exportPlugin(plugin, { targetDir, overwrite: true });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.writtenFiles).toContain(FILE_PATHS.HOOKS_JSON);
    expect(existsSync(path.join(targetDir, FILE_PATHS.HOOKS_JSON))).toBe(true);
    expect(result.validationErrors).toHaveLength(1);
    expect(result.validationErrors[0].severity).toBe("warning");
    expect(result.validationErrors[0].code).toBe(
      ERROR_CODES.HOOK_UNKNOWN_EVENT,
    );
  });

  it("hook スクリプトを実行権限付き（0o755）で書き出し、それ以外は 0o644 で書き出すこと", async () => {
    const plugin: LoadedPluginDefinition = {
      name: "exec-scripts",
      skills: [],
      hooks: {
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "${CLAUDE_PLUGIN_ROOT}/scripts/notify.sh",
                  args: ["done"],
                },
              ],
            },
          ],
        },
        scripts: [{ filename: "notify.sh", content: "#!/bin/bash\necho ok\n" }],
      },
    };

    const result = await exportPlugin(plugin, { targetDir, overwrite: true });

    expect(result.success).toBe(true);
    const scriptMode =
      (await stat(path.join(targetDir, "scripts/notify.sh"))).mode & 0o777;
    expect(scriptMode).toBe(0o755);
    const hooksJsonMode =
      (await stat(path.join(targetDir, FILE_PATHS.HOOKS_JSON))).mode & 0o777;
    expect(hooksJsonMode).toBe(0o644);
  });

  it("既存の非実行ファイルを上書きしても hook スクリプトは実行権限付きになること", async () => {
    const plugin: LoadedPluginDefinition = {
      name: "exec-scripts-overwrite",
      skills: [],
      hooks: {
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "${CLAUDE_PLUGIN_ROOT}/scripts/notify.sh",
                  args: ["done"],
                },
              ],
            },
          ],
        },
        scripts: [{ filename: "notify.sh", content: "#!/bin/bash\necho ok\n" }],
      },
    };
    await mkdir(path.join(targetDir, "scripts"), { recursive: true });
    await writeFile(path.join(targetDir, "scripts/notify.sh"), "old", {
      mode: 0o644,
    });

    const result = await exportPlugin(plugin, { targetDir, overwrite: true });

    expect(result.success).toBe(true);
    const scriptMode =
      (await stat(path.join(targetDir, "scripts/notify.sh"))).mode & 0o777;
    expect(scriptMode).toBe(0o755);
  });

  it("バリデーション結果がなければ validationErrors が空配列であること", async () => {
    const plugin: LoadedPluginDefinition = {
      name: "clean",
      skills: [],
    };

    const result = await exportPlugin(plugin, { targetDir, overwrite: true });

    expect(result.success).toBe(true);
    expect(result.validationErrors).toEqual([]);
  });
});
