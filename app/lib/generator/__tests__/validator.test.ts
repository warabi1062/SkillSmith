import { describe, expect, it } from "vitest";
import {
  validateGeneratedPlugin,
  type ValidatorComponentData,
} from "../validator.server";
import type { GeneratedPlugin } from "../types";

function makePlugin(
  files: { path: string; content: string; componentId?: string }[],
): GeneratedPlugin {
  return {
    pluginName: "test-plugin",
    files,
    validationErrors: [],
  };
}

function makeComponent(overrides: Partial<ValidatorComponentData> = {}): ValidatorComponentData {
  return {
    id: overrides.id ?? "comp-1",
    type: overrides.type ?? "SKILL",
    skillConfig: overrides.skillConfig ?? { name: "my-skill", skillType: "WORKER" },
    agentConfig: overrides.agentConfig ?? null,
    dependenciesFrom: overrides.dependenciesFrom ?? [],
  };
}

describe("validateGeneratedPlugin", () => {
  it("returns no errors for a valid plugin", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "skills/my-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("returns error when plugin.json is missing", () => {
    const plugin = makePlugin([
      { path: "skills/my-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === "DIRECTORY_STRUCTURE_MISMATCH")).toBe(
      true,
    );
  });

  it("returns error for empty plugin (no components)", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
    ]);
    const components: ValidatorComponentData[] = [];
    const errors = validateGeneratedPlugin(plugin, components);
    expect(errors.some((e) => e.code === "EMPTY_PLUGIN")).toBe(true);
  });

  it("returns error for empty plugin (no content files)", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === "EMPTY_PLUGIN")).toBe(true);
  });

  it("returns error for duplicate file paths", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "skills/a/SKILL.md", content: "# A" },
      { path: "skills/a/SKILL.md", content: "# A duplicate" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === "DUPLICATE_FILE_PATH")).toBe(true);
  });

  it("warns when SKILL.md is not under skills/ directory", () => {
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "other/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin);
    expect(errors.some((e) => e.code === "DIRECTORY_STRUCTURE_MISMATCH")).toBe(
      true,
    );
  });

  it("warns when dependency target is not in the same plugin", () => {
    const components: ValidatorComponentData[] = [
      makeComponent({
        id: "comp-1",
        dependenciesFrom: [
          {
            target: {
              id: "comp-external",
              type: "SKILL",
              skillConfig: { name: "ext", skillType: "WORKER" },
              agentConfig: null,
            },
          },
        ],
      }),
    ];
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "skills/my-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin, components);
    expect(errors.some((e) => e.code === "MISSING_DEPENDENCY_TARGET")).toBe(
      true,
    );
  });

  it("warns when agent depends on non-WORKER skill", () => {
    const components: ValidatorComponentData[] = [
      makeComponent({
        id: "comp-agent",
        type: "AGENT",
        skillConfig: null,
        agentConfig: { name: "my-agent" },
        dependenciesFrom: [
          {
            target: {
              id: "comp-skill",
              type: "SKILL",
              skillConfig: { name: "entry-skill", skillType: "ENTRY_POINT" },
              agentConfig: null,
            },
          },
        ],
      }),
      makeComponent({
        id: "comp-skill",
        type: "SKILL",
        skillConfig: { name: "entry-skill", skillType: "ENTRY_POINT" },
      }),
    ];
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "agents/my-agent.md", content: "# Agent" },
      { path: "skills/entry-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin, components);
    expect(
      errors.some((e) => e.code === "INVALID_SKILL_DEPENDENCY_TYPE"),
    ).toBe(true);
  });

  it("does not warn when agent depends on WORKER skill", () => {
    const components: ValidatorComponentData[] = [
      makeComponent({
        id: "comp-agent",
        type: "AGENT",
        skillConfig: null,
        agentConfig: { name: "my-agent" },
        dependenciesFrom: [
          {
            target: {
              id: "comp-skill",
              type: "SKILL",
              skillConfig: { name: "worker-skill", skillType: "WORKER" },
              agentConfig: null,
            },
          },
        ],
      }),
      makeComponent({
        id: "comp-skill",
        type: "SKILL",
        skillConfig: { name: "worker-skill", skillType: "WORKER" },
      }),
    ];
    const plugin = makePlugin([
      { path: ".claude-plugin/plugin.json", content: "{}" },
      { path: "agents/my-agent.md", content: "# Agent" },
      { path: "skills/worker-skill/SKILL.md", content: "# Skill" },
    ]);
    const errors = validateGeneratedPlugin(plugin, components);
    expect(
      errors.some((e) => e.code === "INVALID_SKILL_DEPENDENCY_TYPE"),
    ).toBe(false);
  });
});
