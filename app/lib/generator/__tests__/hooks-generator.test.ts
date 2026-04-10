import { describe, expect, it } from "vitest";
import { generateHooks } from "../hooks-generator.server";
import { FILE_PATHS } from "../../types/constants";
import type { LoadedHookDefinition } from "../../types/loaded";

describe("generateHooks", () => {
  it("hooks.json を正しく生成すること", () => {
    const hookDef: LoadedHookDefinition = {
      description: "テスト用フック",
      hooks: {
        TeammateIdle: [
          {
            hooks: [
              {
                type: "command",
                command: "${CLAUDE_PLUGIN_ROOT}/scripts/check-idle.sh",
                timeout: 30,
              },
            ],
          },
        ],
      },
    };

    const result = generateHooks(hookDef);

    expect(result.errors).toHaveLength(0);
    expect(result.files).toHaveLength(1);

    const hooksJsonFile = result.files.find(
      (f) => f.path === FILE_PATHS.HOOKS_JSON,
    );
    expect(hooksJsonFile).toBeDefined();

    const json = JSON.parse(hooksJsonFile!.content);
    expect(json.description).toBe("テスト用フック");
    expect(json.hooks.TeammateIdle).toHaveLength(1);
    expect(json.hooks.TeammateIdle[0].hooks[0].type).toBe("command");
    expect(json.hooks.TeammateIdle[0].hooks[0].timeout).toBe(30);
  });

  it("description が未指定の場合に省略されること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PostToolUse: [
          {
            matcher: "Write|Edit",
            hooks: [{ type: "command", command: "echo done" }],
          },
        ],
      },
    };

    const result = generateHooks(hookDef);
    const json = JSON.parse(result.files[0].content);
    expect(json.description).toBeUndefined();
    expect(json.hooks.PostToolUse).toHaveLength(1);
  });

  it("スクリプトファイルを生成すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        TeammateIdle: [
          {
            hooks: [
              {
                type: "command",
                command: "${CLAUDE_PLUGIN_ROOT}/scripts/check-idle.sh",
              },
            ],
          },
        ],
      },
      scripts: [
        { filename: "check-idle.sh", content: "#!/bin/bash\nexit 0\n" },
      ],
    };

    const result = generateHooks(hookDef);

    expect(result.errors).toHaveLength(0);
    expect(result.files).toHaveLength(2);

    const scriptFile = result.files.find(
      (f) => f.path === `${FILE_PATHS.SCRIPTS_DIR}check-idle.sh`,
    );
    expect(scriptFile).toBeDefined();
    expect(scriptFile!.content).toBe("#!/bin/bash\nexit 0\n");
  });

  it("複数のスクリプトファイルを生成できること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        TeammateIdle: [
          {
            hooks: [
              {
                type: "command",
                command: "${CLAUDE_PLUGIN_ROOT}/scripts/a.sh",
              },
            ],
          },
        ],
      },
      scripts: [
        { filename: "a.sh", content: "#!/bin/bash\nexit 0\n" },
        { filename: "b.sh", content: "#!/bin/bash\nexit 1\n" },
      ],
    };

    const result = generateHooks(hookDef);

    expect(result.files).toHaveLength(3); // hooks.json + 2 scripts
    expect(
      result.files.find((f) => f.path === `${FILE_PATHS.SCRIPTS_DIR}a.sh`),
    ).toBeDefined();
    expect(
      result.files.find((f) => f.path === `${FILE_PATHS.SCRIPTS_DIR}b.sh`),
    ).toBeDefined();
  });

  it("scripts が未指定の場合に hooks.json のみ生成すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: "echo check" }],
          },
        ],
      },
    };

    const result = generateHooks(hookDef);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe(FILE_PATHS.HOOKS_JSON);
  });

  it("出力 JSON が末尾改行を含むこと", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        TeammateIdle: [{ hooks: [{ type: "command", command: "echo" }] }],
      },
    };

    const result = generateHooks(hookDef);
    expect(result.files[0].content.endsWith("\n")).toBe(true);
  });

  it("matcher 付きフックエントリを正しく出力すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PostToolUse: [
          {
            matcher: "Write|Edit",
            hooks: [{ type: "command", command: "format.sh" }],
          },
        ],
      },
    };

    const result = generateHooks(hookDef);
    const json = JSON.parse(result.files[0].content);
    expect(json.hooks.PostToolUse[0].matcher).toBe("Write|Edit");
  });
});
