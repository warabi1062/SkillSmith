import { describe, expect, it } from "vitest";
import { generateAgentMd } from "../agent-generator.server";

function makeAgentComponent(overrides: {
  name?: string;
  description?: string;
  content?: string;
  model?: string | null;
  tools?: string | null;
  disallowedTools?: string | null;
  permissionMode?: string | null;
  hooks?: string | null;
  memory?: string | null;
  dependenciesFrom?: {
    target: { skillConfig: { name: string } | null };
    order: number;
  }[];
}) {
  return {
    id: "comp-1",
    agentConfig: {
      id: "ac-1",
      componentId: "comp-1",
      name: overrides.name ?? "my-agent",
      description: overrides.description ?? "An agent",
      model: overrides.model ?? null,
      tools: overrides.tools ?? null,
      disallowedTools: overrides.disallowedTools ?? null,
      permissionMode: overrides.permissionMode ?? null,
      hooks: overrides.hooks ?? null,
      memory: overrides.memory ?? null,
      content: overrides.content ?? "# Agent body",
    },
    dependenciesFrom: overrides.dependenciesFrom ?? [],
  };
}

describe("generateAgentMd", () => {
  it("generates a valid agent markdown", () => {
    const { file, errors } = generateAgentMd(makeAgentComponent({}));
    expect(file).not.toBeNull();
    expect(file!.path).toBe("agents/my-agent.md");
    expect(file!.content).toContain("name: my-agent");
    expect(file!.content).toContain("description: An agent");
    expect(file!.content).toContain("# Agent body");
    expect(errors.filter((e) => e.severity === "error")).toHaveLength(0);
  });

  it("warns when agent name does not end with -agent", () => {
    const { file, errors } = generateAgentMd(
      makeAgentComponent({ name: "my-worker" }),
    );
    expect(file).not.toBeNull();
    expect(errors.some((e) => e.code === "AGENT_NAME_CONVENTION")).toBe(true);
  });

  it("does not warn when agent name ends with -agent", () => {
    const { errors } = generateAgentMd(
      makeAgentComponent({ name: "my-agent" }),
    );
    expect(errors.some((e) => e.code === "AGENT_NAME_CONVENTION")).toBe(false);
  });

  it("returns error when content is empty", () => {
    const { file, errors } = generateAgentMd(
      makeAgentComponent({ content: "" }),
    );
    expect(file).toBeNull();
    expect(errors.some((e) => e.code === "EMPTY_CONTENT")).toBe(true);
  });

  it("includes model in frontmatter when set", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ model: "sonnet" }),
    );
    expect(file!.content).toContain("model: sonnet");
  });

  it("includes tools as YAML list", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ tools: '["Read", "Grep"]' }),
    );
    expect(file!.content).toContain("tools:");
    expect(file!.content).toContain("  - Read");
    expect(file!.content).toContain("  - Grep");
  });

  it("derives skills from dependencies sorted by order", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({
        dependenciesFrom: [
          { target: { skillConfig: { name: "skill-b" } }, order: 2 },
          { target: { skillConfig: { name: "skill-a" } }, order: 1 },
        ],
      }),
    );
    expect(file!.content).toContain("skills:");
    const skillsIndex = file!.content.indexOf("  - skill-a");
    const skillBIndex = file!.content.indexOf("  - skill-b");
    expect(skillsIndex).toBeLessThan(skillBIndex);
  });

  it("skips non-skill dependencies", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({
        dependenciesFrom: [
          { target: { skillConfig: null }, order: 1 },
        ],
      }),
    );
    expect(file!.content).not.toContain("skills:");
  });

  it("includes permissionMode when set", () => {
    const { file } = generateAgentMd(
      makeAgentComponent({ permissionMode: "bypassPermissions" }),
    );
    expect(file!.content).toContain("permissionMode: bypassPermissions");
  });

  it("returns warning when hooks field is set", () => {
    const { errors } = generateAgentMd(
      makeAgentComponent({ hooks: "some-hook" }),
    );
    expect(errors.some((e) => e.code === "HOOKS_NOT_SUPPORTED")).toBe(true);
  });
});
