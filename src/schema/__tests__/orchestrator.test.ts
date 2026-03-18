import { describe, it, expect } from "vitest";
import { OrchestratorSkillSchema } from "../index.js";

/**
 * Helper: minimal valid orchestrator skill data
 */
function makeValidOrchestrator(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    frontmatter: {
      name: "dev",
      description: "Development workflow orchestrator",
      "allowed-tools": ["Read", "Write", "Grep", "Glob", "Task"],
    },
    body: {
      raw: "# Dev\n\nOrchestrator for development workflow.",
    },
    steps: [
      {
        id: "1",
        name: "Triage ticket",
        agentType: "triage-agent",
        inputs: [],
        outputs: [
          {
            semanticName: "triage result path",
            description: "Triage analysis result",
          },
        ],
      },
      {
        id: "2",
        name: "Plan implementation",
        agentType: "plan-agent",
        inputs: ["triage result path"],
        outputs: [
          {
            semanticName: "implementation plan path",
            description: "Approved implementation plan",
          },
        ],
        dependsOn: ["1"],
      },
      {
        id: "3",
        name: "Implement",
        agentType: "implement-agent",
        inputs: ["implementation plan path"],
        outputs: [
          {
            semanticName: "implementation result path",
            description: "Implementation result",
          },
        ],
        dependsOn: ["2"],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Basic validation
// ---------------------------------------------------------------------------
describe("OrchestratorSkillSchema", () => {
  it("parses a valid orchestrator skill", () => {
    const result = OrchestratorSkillSchema.safeParse(makeValidOrchestrator());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps).toHaveLength(3);
      expect(result.data.steps[0].agentType).toBe("triage-agent");
      expect(result.data.steps[1].inputs).toEqual(["triage result path"]);
      expect(result.data.steps[2].dependsOn).toEqual(["2"]);
    }
  });

  it("rejects empty steps array", () => {
    const result = OrchestratorSkillSchema.safeParse(
      makeValidOrchestrator({ steps: [] })
    );
    expect(result.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Constraint: no context: fork
  // ---------------------------------------------------------------------------
  it("rejects orchestrator with context: fork", () => {
    const data = makeValidOrchestrator({
      frontmatter: {
        name: "dev",
        description: "Dev orchestrator",
        context: "fork",
      },
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("context: fork"))).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // File path relay
  // ---------------------------------------------------------------------------
  it("validates file path relay between steps", () => {
    const result = OrchestratorSkillSchema.safeParse(makeValidOrchestrator());
    expect(result.success).toBe(true);
    if (result.success) {
      // Step 1 outputs "triage result path"
      expect(result.data.steps[0].outputs[0].semanticName).toBe(
        "triage result path"
      );
      // Step 2 receives "triage result path" as input
      expect(result.data.steps[1].inputs).toContain("triage result path");
      // Step 2 outputs "implementation plan path"
      expect(result.data.steps[1].outputs[0].semanticName).toBe(
        "implementation plan path"
      );
      // Step 3 receives "implementation plan path"
      expect(result.data.steps[2].inputs).toContain(
        "implementation plan path"
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Step dependencies
  // ---------------------------------------------------------------------------
  it("rejects dependsOn referencing non-existent step", () => {
    const data = makeValidOrchestrator({
      steps: [
        {
          id: "1",
          name: "First step",
          agentType: "triage-agent",
          dependsOn: ["999"],
        },
      ],
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.some((m) => m.includes("non-existent step"))
      ).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Input semantic name validation
  // ---------------------------------------------------------------------------
  it("rejects inputs referencing non-existent semantic names in dependsOn outputs", () => {
    const data = makeValidOrchestrator({
      steps: [
        {
          id: "1",
          name: "Triage",
          agentType: "triage-agent",
          outputs: [
            { semanticName: "triage result path", description: "Triage result" },
          ],
        },
        {
          id: "2",
          name: "Plan",
          agentType: "plan-agent",
          inputs: ["nonexistent semantic name"],
          dependsOn: ["1"],
        },
      ],
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.some((m) => m.includes("semantic names that do not exist"))
      ).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Modes
  // ---------------------------------------------------------------------------
  it("parses orchestrator with modes", () => {
    const data = makeValidOrchestrator({
      modes: [
        {
          name: "full",
          description: "Full development workflow",
          steps: ["1", "2", "3"],
        },
        {
          name: "quick",
          description: "Skip triage, go straight to implementation",
          steps: ["2", "3"],
        },
      ],
      defaultMode: "full",
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modes).toHaveLength(2);
      expect(result.data.defaultMode).toBe("full");
    }
  });

  it("rejects defaultMode referencing non-existent mode", () => {
    const data = makeValidOrchestrator({
      modes: [
        { name: "full", description: "Full", steps: ["1", "2", "3"] },
      ],
      defaultMode: "turbo",
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.some((m) => m.includes("defaultMode"))
      ).toBe(true);
    }
  });

  it("rejects mode referencing non-existent step IDs", () => {
    const data = makeValidOrchestrator({
      modes: [
        {
          name: "broken",
          description: "References invalid step",
          steps: ["1", "99"],
        },
      ],
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.some((m) => m.includes("step IDs that do not exist"))
      ).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Execution modes
  // ---------------------------------------------------------------------------
  it("supports parallel execution mode", () => {
    const data = makeValidOrchestrator({
      steps: [
        {
          id: "1",
          name: "Triage",
          agentType: "triage-agent",
        },
        {
          id: "2a",
          name: "Plan A",
          agentType: "plan-agent",
          executionMode: "parallel",
          dependsOn: ["1"],
        },
        {
          id: "2b",
          name: "Plan B",
          agentType: "review-agent",
          executionMode: "parallel",
          dependsOn: ["1"],
        },
      ],
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps[1].executionMode).toBe("parallel");
      expect(result.data.steps[2].executionMode).toBe("parallel");
    }
  });

  it("supports conditional execution mode", () => {
    const data = makeValidOrchestrator({
      steps: [
        {
          id: "1",
          name: "Triage",
          agentType: "triage-agent",
          outputs: [{ semanticName: "triage result path" }],
        },
        {
          id: "2",
          name: "Bug reproduction",
          agentType: "bug-reproduction-agent",
          executionMode: "conditional",
          condition: {
            expression: "issueType",
            expectedValue: "bug",
          },
          dependsOn: ["1"],
        },
      ],
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps[1].executionMode).toBe("conditional");
      expect(result.data.steps[1].condition?.expression).toBe("issueType");
    }
  });

  // ---------------------------------------------------------------------------
  // Max iterations (review cycles)
  // ---------------------------------------------------------------------------
  it("supports maxIterations for review cycles", () => {
    const data = makeValidOrchestrator({
      steps: [
        {
          id: "1",
          name: "Implement",
          agentType: "implement-agent",
        },
        {
          id: "2",
          name: "Review",
          agentType: "review-agent",
          maxIterations: 3,
          dependsOn: ["1"],
        },
      ],
    });
    const result = OrchestratorSkillSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps[1].maxIterations).toBe(3);
    }
  });

  // ---------------------------------------------------------------------------
  // Realistic inline test data: dev workflow
  // ---------------------------------------------------------------------------
  it("validates a realistic dev workflow orchestrator", () => {
    const devWorkflow = {
      frontmatter: {
        name: "dev",
        description: "Full development workflow from ticket to PR",
        "argument-hint": "[ticket-id]",
        "allowed-tools": [
          "Read",
          "Write",
          "Grep",
          "Glob",
          "Task",
          "ToolSearch",
        ],
      },
      body: {
        raw: [
          "# Dev Workflow",
          "",
          "## Input",
          "- Ticket ID (e.g., LIN-123)",
          "",
          "## Steps",
          "### Step 1: Triage",
          "Call Task(subagent_type: triage-agent) to analyze the ticket.",
          "### Step 2: Plan",
          "Call Task(subagent_type: plan-agent) with triage results.",
          "### Step 3: Implement",
          "Call Task(subagent_type: implement-agent) with approved plan.",
          "### Step 4: Review",
          "Call Task(subagent_type: review-agent) to review changes.",
          "### Step 5: Create PR",
          "Call Task(subagent_type: create-pr-agent) to create PR.",
        ].join("\n"),
      },
      steps: [
        {
          id: "1",
          name: "Triage ticket",
          agentType: "triage-agent",
          outputs: [{ semanticName: "triage result path" }],
        },
        {
          id: "2",
          name: "Plan implementation",
          agentType: "plan-agent",
          inputs: ["triage result path"],
          outputs: [{ semanticName: "implementation plan path" }],
          dependsOn: ["1"],
        },
        {
          id: "3",
          name: "Implement changes",
          agentType: "implement-agent",
          inputs: ["implementation plan path"],
          outputs: [{ semanticName: "implementation result path" }],
          dependsOn: ["2"],
        },
        {
          id: "4",
          name: "Review changes",
          agentType: "review-agent",
          inputs: ["implementation result path"],
          outputs: [{ semanticName: "review result path" }],
          dependsOn: ["3"],
          maxIterations: 3,
        },
        {
          id: "5",
          name: "Create pull request",
          agentType: "create-pr-agent",
          inputs: ["implementation result path", "review result path"],
          outputs: [{ semanticName: "PR URL" }],
          dependsOn: ["3", "4"],
        },
      ],
      modes: [
        {
          name: "full",
          description: "Complete workflow with triage and review",
          steps: ["1", "2", "3", "4", "5"],
        },
        {
          name: "quick",
          description: "Skip triage, minimal review",
          steps: ["2", "3", "5"],
        },
      ],
      defaultMode: "full",
    };

    const result = OrchestratorSkillSchema.safeParse(devWorkflow);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.steps).toHaveLength(5);
      expect(result.data.modes).toHaveLength(2);
      expect(result.data.defaultMode).toBe("full");
      // Verify file path relay chain
      expect(result.data.steps[0].outputs[0].semanticName).toBe(
        "triage result path"
      );
      expect(result.data.steps[1].inputs).toContain("triage result path");
      expect(result.data.steps[4].inputs).toContain(
        "implementation result path"
      );
    }
  });
});
