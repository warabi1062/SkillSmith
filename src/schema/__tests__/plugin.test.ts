import { describe, it, expect } from "vitest";
import {
  PluginMetadataSchema,
  PluginSchema,
  SkillFrontmatterSchema,
  AgentFrontmatterSchema,
  AgentSchema,
  classifySkill,
  SkillKind,
} from "../index.js";

// ---------------------------------------------------------------------------
// PluginMetadataSchema
// ---------------------------------------------------------------------------
describe("PluginMetadataSchema", () => {
  it("parses valid plugin metadata", () => {
    const data = {
      name: "dev-workflow",
      description: "Development workflow plugin",
    };
    const result = PluginMetadataSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("dev-workflow");
      expect(result.data.description).toBe("Development workflow plugin");
    }
  });

  it("rejects missing name", () => {
    const data = { description: "Some plugin" };
    const result = PluginMetadataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects missing description", () => {
    const data = { name: "my-plugin" };
    const result = PluginMetadataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const data = { name: "", description: "desc" };
    const result = PluginMetadataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PluginSchema
// ---------------------------------------------------------------------------
describe("PluginSchema", () => {
  it("parses plugin with skills and agents", () => {
    const data = {
      metadata: { name: "dev-workflow", description: "Dev plugin" },
      skills: [{ name: "implement" }, { name: "create-pr" }],
      agents: [{ name: "implement-agent" }],
    };
    const result = PluginSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toHaveLength(2);
      expect(result.data.agents).toHaveLength(1);
    }
  });

  it("defaults skills and agents to empty arrays", () => {
    const data = {
      metadata: { name: "simple", description: "Simple plugin" },
    };
    const result = PluginSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual([]);
      expect(result.data.agents).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// SkillFrontmatterSchema
// ---------------------------------------------------------------------------
describe("SkillFrontmatterSchema", () => {
  it("parses all 10 frontmatter fields", () => {
    const data = {
      name: "dev",
      description: "Development workflow orchestrator",
      "argument-hint": "[ticket-id]",
      "disable-model-invocation": true,
      "user-invocable": true,
      "allowed-tools": ["Read", "Write", "Grep", "Glob", "Task"],
      context: "fork" as const,
      agent: "implement-agent",
      model: "opus",
      hooks: { preInvoke: "echo starting" },
    };
    const result = SkillFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("dev");
      expect(result.data["argument-hint"]).toBe("[ticket-id]");
      expect(result.data["disable-model-invocation"]).toBe(true);
      expect(result.data["allowed-tools"]).toEqual([
        "Read",
        "Write",
        "Grep",
        "Glob",
        "Task",
      ]);
      expect(result.data.context).toBe("fork");
      expect(result.data.agent).toBe("implement-agent");
      expect(result.data.model).toBe("opus");
    }
  });

  it("parses with all optional fields omitted", () => {
    const data = {};
    const result = SkillFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("parses allowed-tools as comma-separated string", () => {
    const data = { "allowed-tools": "Read, Write, Grep, Glob" };
    const result = SkillFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data["allowed-tools"]).toEqual([
        "Read",
        "Write",
        "Grep",
        "Glob",
      ]);
    }
  });

  it("parses allowed-tools as YAML list (array)", () => {
    const data = { "allowed-tools": ["Read", "Write", "Grep"] };
    const result = SkillFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data["allowed-tools"]).toEqual(["Read", "Write", "Grep"]);
    }
  });

  it("rejects name with uppercase characters", () => {
    const data = { name: "MySkill" };
    const result = SkillFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 64 characters", () => {
    const data = { name: "a".repeat(65) };
    const result = SkillFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("accepts name with hyphens and numbers", () => {
    const data = { name: "my-skill-123" };
    const result = SkillFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid context value", () => {
    const data = { context: "invalid" };
    const result = SkillFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// classifySkill
// ---------------------------------------------------------------------------
describe("classifySkill", () => {
  it("returns explicit kind when provided", () => {
    const result = classifySkill({}, "", SkillKind.Worker);
    expect(result).toBe(SkillKind.Worker);
  });

  it("classifies as cross-cutting when user-invocable is false", () => {
    const result = classifySkill({ "user-invocable": false }, "");
    expect(result).toBe(SkillKind.CrossCutting);
  });

  it("classifies as worker when context is fork", () => {
    const result = classifySkill({ context: "fork" }, "");
    expect(result).toBe(SkillKind.Worker);
  });

  it("classifies as orchestrator when body contains Task(subagent_type:...)", () => {
    const body =
      'Step 1: Call Task(subagent_type: implement-agent) with the plan.';
    const result = classifySkill({}, body);
    expect(result).toBe(SkillKind.EntryPointOrchestrator);
  });

  it("classifies as standalone entry-point by default", () => {
    const result = classifySkill({ description: "Review a PR" }, "## Steps\n");
    expect(result).toBe(SkillKind.EntryPointStandalone);
  });
});

// ---------------------------------------------------------------------------
// AgentFrontmatterSchema
// ---------------------------------------------------------------------------
describe("AgentFrontmatterSchema", () => {
  it("parses all 9 frontmatter fields", () => {
    const data = {
      name: "implement-agent",
      description: "Implements code changes",
      model: "inherit" as const,
      tools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash", "Task"],
      disallowedTools: ["ToolSearch"],
      skills: ["implement"],
      permissionMode: "acceptEdits" as const,
      hooks: { preInvoke: "echo start" },
      memory: "project" as const,
    };
    const result = AgentFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("implement-agent");
      expect(result.data.model).toBe("inherit");
      expect(result.data.tools).toHaveLength(7);
      expect(result.data.disallowedTools).toEqual(["ToolSearch"]);
      expect(result.data.skills).toEqual(["implement"]);
      expect(result.data.permissionMode).toBe("acceptEdits");
      expect(result.data.memory).toBe("project");
    }
  });

  it("requires name and description", () => {
    const result = AgentFrontmatterSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("parses with only required fields", () => {
    const data = {
      name: "review-agent",
      description: "Reviews code changes",
    };
    const result = AgentFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects invalid permissionMode", () => {
    const data = {
      name: "test-agent",
      description: "Test",
      permissionMode: "superAdmin",
    };
    const result = AgentFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("validates all permissionMode values", () => {
    const validModes = [
      "default",
      "acceptEdits",
      "dontAsk",
      "bypassPermissions",
      "plan",
    ];
    for (const mode of validModes) {
      const data = {
        name: "test-agent",
        description: "Test",
        permissionMode: mode,
      };
      const result = AgentFrontmatterSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it("validates all model values", () => {
    const validModels = ["inherit", "sonnet", "haiku", "opus"];
    for (const model of validModels) {
      const data = {
        name: "test-agent",
        description: "Test",
        model,
      };
      const result = AgentFrontmatterSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid model value", () => {
    const data = {
      name: "test-agent",
      description: "Test",
      model: "gpt-4",
    };
    const result = AgentFrontmatterSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("validates memory scope values", () => {
    const validScopes = ["user", "project", "local"];
    for (const scope of validScopes) {
      const data = {
        name: "test-agent",
        description: "Test",
        memory: scope,
      };
      const result = AgentFrontmatterSchema.safeParse(data);
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// AgentSchema (with naming convention validation)
// ---------------------------------------------------------------------------
describe("AgentSchema", () => {
  it("accepts agent name ending with -agent", () => {
    const data = {
      frontmatter: {
        name: "implement-agent",
        description: "Implements code",
      },
      body: { raw: "Implementation agent." },
    };
    const result = AgentSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("rejects agent name not ending with -agent", () => {
    const data = {
      frontmatter: {
        name: "implement",
        description: "Implements code",
      },
      body: { raw: "Implementation agent." },
    };
    const result = AgentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
