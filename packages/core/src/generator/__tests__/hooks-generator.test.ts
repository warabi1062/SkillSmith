import { describe, expect, it } from "vitest";
import { generateHooks, validateHooks } from "../hooks-generator.server";
import { ERROR_CODES, FILE_PATHS } from "../../types/constants";
import type { LoadedHookDefinition } from "../../types/loaded";

// テスト用ヘルパー: エラーコードで絞り込む
function findByCode(
  errors: { code: string }[],
  code: string,
): { code: string }[] {
  return errors.filter((e) => e.code === code);
}

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
                command: '"${CLAUDE_PLUGIN_ROOT}"/scripts/check-idle.sh',
                timeout: 30,
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

  it("schema が指定された場合に $schema を先頭キーとして出力すること", () => {
    const hookDef: LoadedHookDefinition = {
      schema: "https://example.com/hooks.schema.json",
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "echo done" }] }],
      },
    };

    const result = generateHooks(hookDef);
    const json = JSON.parse(result.files[0].content);
    expect(json.$schema).toBe("https://example.com/hooks.schema.json");
    expect(Object.keys(json)[0]).toBe("$schema");
  });

  it("schema が未指定の場合に $schema を出力しないこと", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "echo done" }] }],
      },
    };

    const result = generateHooks(hookDef);
    const json = JSON.parse(result.files[0].content);
    expect(json.$schema).toBeUndefined();
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
                command: "bash",
                args: ["${CLAUDE_PLUGIN_ROOT}/scripts/check-idle.sh"],
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
                command: '"${CLAUDE_PLUGIN_ROOT}"/scripts/a.sh',
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

  it("5種類の hook type と各フィールドをそのまま出力すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              {
                type: "command",
                command: "node",
                args: ["${CLAUDE_PLUGIN_ROOT}/scripts/check.js", "--strict"],
                async: true,
                asyncRewake: true,
                shell: "bash",
                statusMessage: "Checking...",
                if: "Bash(git *)",
              },
              {
                type: "http",
                url: "http://localhost:8080/hooks",
                headers: { Authorization: "Bearer $TOKEN" },
                allowedEnvVars: ["TOKEN"],
                timeout: 10,
              },
              {
                type: "mcp_tool",
                server: "security",
                tool: "scan",
                input: { path: "${tool_input.file_path}" },
              },
              {
                type: "prompt",
                prompt: "Is this safe? $ARGUMENTS",
                model: "claude-haiku-4-5-20251001",
                continueOnBlock: true,
              },
              {
                type: "agent",
                prompt: "Verify: $ARGUMENTS",
                model: "claude-sonnet-5",
                timeout: 60,
              },
            ],
          },
        ],
      },
      scripts: [{ filename: "check.js", content: "process.exit(0);\n" }],
    };

    const result = generateHooks(hookDef);
    expect(result.errors).toHaveLength(0);

    const json = JSON.parse(result.files[0].content);
    const [command, http, mcpTool, prompt, agent] =
      json.hooks.PreToolUse[0].hooks;
    expect(command).toEqual({
      type: "command",
      command: "node",
      args: ["${CLAUDE_PLUGIN_ROOT}/scripts/check.js", "--strict"],
      async: true,
      asyncRewake: true,
      shell: "bash",
      statusMessage: "Checking...",
      if: "Bash(git *)",
    });
    expect(http.type).toBe("http");
    expect(http.url).toBe("http://localhost:8080/hooks");
    expect(http.allowedEnvVars).toEqual(["TOKEN"]);
    expect(mcpTool).toEqual({
      type: "mcp_tool",
      server: "security",
      tool: "scan",
      input: { path: "${tool_input.file_path}" },
    });
    expect(prompt.model).toBe("claude-haiku-4-5-20251001");
    expect(prompt.continueOnBlock).toBe(true);
    expect(agent.model).toBe("claude-sonnet-5");
    expect(agent.timeout).toBe(60);
  });

  it("バリデーションエラーがあってもファイルは生成すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        Stop: [
          {
            hooks: [{ type: "command", command: "echo", if: "Bash(*)" }],
          },
        ],
      },
    };

    const result = generateHooks(hookDef);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.files).toHaveLength(1);
  });
});

describe("validateHooks", () => {
  it("公式イベント名のみを使った定義はエラーも警告も出さないこと", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        SessionStart: [
          { matcher: "startup", hooks: [{ type: "command", command: "echo" }] },
        ],
        Notification: [
          {
            matcher: "permission_prompt",
            hooks: [{ type: "command", command: "echo" }],
          },
        ],
        SubagentStop: [{ hooks: [{ type: "prompt", prompt: "$ARGUMENTS" }] }],
        FileChanged: [
          { matcher: ".envrc", hooks: [{ type: "command", command: "echo" }] },
        ],
      },
    };

    expect(validateHooks(hookDef)).toHaveLength(0);
  });

  it("未知のイベント名は警告として報告すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PreToolUsee: [{ hooks: [{ type: "command", command: "echo" }] }],
      },
    };

    const errors = validateHooks(hookDef);
    const found = findByCode(errors, ERROR_CODES.HOOK_UNKNOWN_EVENT);
    expect(found).toHaveLength(1);
    expect(errors[0].severity).toBe("warning");
    expect(errors[0].field).toBe("hooks.PreToolUsee");
  });

  it("フックアクションが空のエントリはエラーにすること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        Stop: [{ hooks: [] }],
      },
    };

    const errors = validateHooks(hookDef);
    const found = findByCode(errors, ERROR_CODES.HOOK_EMPTY_ENTRY);
    expect(found).toHaveLength(1);
    expect(errors[0].severity).toBe("error");
    expect(errors[0].field).toBe("hooks.Stop[0]");
  });

  it("ツール系イベント以外での if はエラーにすること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [{ type: "command", command: "echo", if: "Bash(git *)" }],
          },
        ],
      },
    };

    const errors = validateHooks(hookDef);
    const found = findByCode(errors, ERROR_CODES.HOOK_IF_NOT_ALLOWED);
    expect(found).toHaveLength(1);
    expect(errors[0].field).toBe("hooks.UserPromptSubmit[0].hooks[0].if");
  });

  it("ツール系イベント（PreToolUse / PostToolUse / PostToolUseFailure / PermissionRequest / PermissionDenied）では if を許可すること", () => {
    const events = [
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "PermissionRequest",
      "PermissionDenied",
    ] as const;
    for (const event of events) {
      const hookDef: LoadedHookDefinition = {
        hooks: {
          [event]: [
            {
              hooks: [{ type: "command", command: "echo", if: "Bash(git *)" }],
            },
          ],
        },
      };
      expect(
        findByCode(validateHooks(hookDef), ERROR_CODES.HOOK_IF_NOT_ALLOWED),
      ).toHaveLength(0);
    }
  });

  it("SessionStart / Setup での mcp_tool はエラーにすること", () => {
    for (const event of ["SessionStart", "Setup"] as const) {
      const hookDef: LoadedHookDefinition = {
        hooks: {
          [event]: [
            { hooks: [{ type: "mcp_tool", server: "memory", tool: "load" }] },
          ],
        },
      };
      const errors = validateHooks(hookDef);
      expect(
        findByCode(errors, ERROR_CODES.HOOK_MCP_TOOL_NOT_ALLOWED),
      ).toHaveLength(1);
      expect(errors[0].field).toBe(`hooks.${event}[0].hooks[0].type`);
    }
  });

  it("PreToolUse での mcp_tool は許可すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PreToolUse: [
          { hooks: [{ type: "mcp_tool", server: "memory", tool: "load" }] },
        ],
      },
    };
    expect(validateHooks(hookDef)).toHaveLength(0);
  });

  it("PermissionRequest での agent はエラーにすること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PermissionRequest: [
          { hooks: [{ type: "agent", prompt: "Check $ARGUMENTS" }] },
        ],
      },
    };
    const errors = validateHooks(hookDef);
    expect(findByCode(errors, ERROR_CODES.HOOK_AGENT_NOT_ALLOWED)).toHaveLength(
      1,
    );
    expect(errors[0].field).toBe("hooks.PermissionRequest[0].hooks[0].type");
  });

  it("PermissionRequest での prompt は許可すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PermissionRequest: [
          { hooks: [{ type: "prompt", prompt: "Check $ARGUMENTS" }] },
        ],
      },
    };
    expect(validateHooks(hookDef)).toHaveLength(0);
  });

  it("prompt / agent に対応していないイベント（SessionStart / PreCompact / PreModelSwitch 等）ではエラーにすること", () => {
    for (const event of [
      "SessionStart",
      "Setup",
      "SessionEnd",
      "Notification",
      "MessageDisplay",
      "PreCompact",
      "PostCompact",
      "PreModelSwitch",
      "PostModelSwitch",
      "SubagentStart",
      "ConfigChange",
    ] as const) {
      const hookDef: LoadedHookDefinition = {
        hooks: {
          [event]: [
            {
              hooks: [
                { type: "prompt", prompt: "Check $ARGUMENTS" },
                { type: "agent", prompt: "Check $ARGUMENTS" },
              ],
            },
          ],
        },
      };
      const errors = validateHooks(hookDef);
      expect(
        findByCode(errors, ERROR_CODES.HOOK_PROMPT_NOT_ALLOWED),
        event,
      ).toHaveLength(1);
      expect(
        findByCode(errors, ERROR_CODES.HOOK_AGENT_NOT_ALLOWED),
        event,
      ).toHaveLength(1);
    }
  });

  it("prompt / agent に対応しているイベント（PreToolUse / Stop / UserPromptSubmit 等）では許可すること", () => {
    for (const event of [
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "PostToolBatch",
      "PermissionDenied",
      "Stop",
      "SubagentStop",
      "TaskCreated",
      "TaskCompleted",
      "TeammateIdle",
      "UserPromptSubmit",
      "UserPromptExpansion",
    ] as const) {
      const hookDef: LoadedHookDefinition = {
        hooks: {
          [event]: [
            {
              hooks: [
                { type: "prompt", prompt: "Check $ARGUMENTS" },
                { type: "agent", prompt: "Check $ARGUMENTS" },
              ],
            },
          ],
        },
      };
      expect(validateHooks(hookDef), event).toHaveLength(0);
    }
  });

  it("未知のイベントでの prompt / agent は HOOK_UNKNOWN_EVENT の警告のみとし、型エラーにはしないこと", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        BrandNewEvent: [
          { hooks: [{ type: "prompt", prompt: "Check $ARGUMENTS" }] },
        ],
      },
    };
    const errors = validateHooks(hookDef);
    expect(findByCode(errors, ERROR_CODES.HOOK_UNKNOWN_EVENT)).toHaveLength(1);
    expect(
      findByCode(errors, ERROR_CODES.HOOK_PROMPT_NOT_ALLOWED),
    ).toHaveLength(0);
  });

  it("スクリプトファイルは executable フラグ付きで生成すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: "echo done" }] }],
      },
      scripts: [{ filename: "run.sh", content: "#!/bin/bash\nexit 0\n" }],
    };
    const result = generateHooks(hookDef);
    const script = result.files.find(
      (f) => f.path === `${FILE_PATHS.SCRIPTS_DIR}run.sh`,
    );
    expect(script?.executable).toBe(true);
    const hooksJson = result.files.find(
      (f) => f.path === FILE_PATHS.HOOKS_JSON,
    );
    expect(hooksJson?.executable).toBeUndefined();
  });

  it("command が参照するスクリプトが同梱されていなければエラーにすること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                type: "command",
                command: '"${CLAUDE_PLUGIN_ROOT}"/scripts/notify.sh done',
              },
            ],
          },
        ],
      },
      scripts: [{ filename: "other.sh", content: "" }],
    };

    const errors = validateHooks(hookDef);
    const found = findByCode(errors, ERROR_CODES.HOOK_MISSING_SCRIPT);
    expect(found).toHaveLength(1);
    expect(errors[0].message).toContain("notify.sh");
  });

  it("args 内のスクリプト参照も同梱チェックの対象にすること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                type: "command",
                command: "node",
                args: ["${CLAUDE_PLUGIN_ROOT}/scripts/format.js"],
              },
            ],
          },
        ],
      },
    };

    const errors = validateHooks(hookDef);
    expect(findByCode(errors, ERROR_CODES.HOOK_MISSING_SCRIPT)).toHaveLength(1);
  });

  it("shell form でクォートされていない ${CLAUDE_PLUGIN_ROOT} は警告にすること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                type: "command",
                command: "${CLAUDE_PLUGIN_ROOT}/scripts/notify.sh",
              },
            ],
          },
        ],
      },
      scripts: [{ filename: "notify.sh", content: "" }],
    };

    const errors = validateHooks(hookDef);
    const found = findByCode(errors, ERROR_CODES.HOOK_UNQUOTED_PLUGIN_ROOT);
    expect(found).toHaveLength(1);
    expect(errors[0].severity).toBe("warning");
  });

  it("クォート済み、または exec form の ${CLAUDE_PLUGIN_ROOT} は警告しないこと", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              {
                type: "command",
                command: '"${CLAUDE_PLUGIN_ROOT}"/scripts/a.sh',
              },
              {
                type: "command",
                command: '"${CLAUDE_PLUGIN_ROOT}/scripts/a.sh"',
              },
              {
                type: "command",
                command: "${CLAUDE_PLUGIN_ROOT}/scripts/a.sh",
                args: [],
              },
            ],
          },
        ],
      },
      scripts: [{ filename: "a.sh", content: "" }],
    };

    expect(
      findByCode(validateHooks(hookDef), ERROR_CODES.HOOK_UNQUOTED_PLUGIN_ROOT),
    ).toHaveLength(0);
  });

  it("複数の違反を全て報告すること", () => {
    const hookDef: LoadedHookDefinition = {
      hooks: {
        SessionStart: [
          {
            hooks: [
              { type: "mcp_tool", server: "s", tool: "t", if: "Bash(*)" },
            ],
          },
        ],
        Unknown: [{ hooks: [] }],
      },
    };

    const errors = validateHooks(hookDef);
    const codes = errors.map((e) => e.code).toSorted();
    expect(codes).toEqual(
      [
        ERROR_CODES.HOOK_EMPTY_ENTRY,
        ERROR_CODES.HOOK_IF_NOT_ALLOWED,
        ERROR_CODES.HOOK_MCP_TOOL_NOT_ALLOWED,
        ERROR_CODES.HOOK_UNKNOWN_EVENT,
      ].toSorted(),
    );
  });
});
