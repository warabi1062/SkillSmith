import { z } from "zod";
import { SkillFrontmatterSchema, SkillBodySchema } from "./skill.js";

/**
 * Step execution mode
 */
export const StepExecutionMode = {
  Sequential: "sequential",
  Parallel: "parallel",
  Conditional: "conditional",
} as const;

export type StepExecutionMode =
  (typeof StepExecutionMode)[keyof typeof StepExecutionMode];

/**
 * File path relay between steps.
 *
 * Defines what a step produces (outputPath) and how it's referenced
 * semantically (semanticName) for the next step to consume.
 */
export const FilePathRelaySchema = z.object({
  /** Semantic name for orchestrator to reference (e.g., "implementation plan path") */
  semanticName: z.string().min(1),
  /** Description of what this file contains */
  description: z.string().optional(),
});

export type FilePathRelay = z.infer<typeof FilePathRelaySchema>;

/**
 * Condition for conditional step execution
 */
export const StepConditionSchema = z.object({
  /** Field or expression to evaluate */
  expression: z.string(),
  /** Expected value or pattern */
  expectedValue: z.string().optional(),
});

export type StepCondition = z.infer<typeof StepConditionSchema>;

/**
 * A single step in the orchestrator workflow
 */
export const OrchestratorStepSchema = z.object({
  /** Step identifier (e.g., "1", "2a", "2b") */
  id: z.string().min(1),
  /** Human-readable step name */
  name: z.string().min(1),
  /** Agent to invoke via Task(subagent_type: ...) */
  agentType: z.string().min(1),
  /** Semantic names of file paths this step receives from orchestrator */
  inputs: z.array(z.string()).default([]),
  /** File path relays this step produces */
  outputs: z.array(FilePathRelaySchema).default([]),
  /** Execution mode */
  executionMode: z
    .enum([
      StepExecutionMode.Sequential,
      StepExecutionMode.Parallel,
      StepExecutionMode.Conditional,
    ])
    .default(StepExecutionMode.Sequential),
  /** Condition for conditional execution */
  condition: StepConditionSchema.optional(),
  /** Step IDs that must complete before this step */
  dependsOn: z.array(z.string()).default([]),
  /** Maximum retry/iteration count (e.g., review cycles) */
  maxIterations: z.number().int().positive().optional(),
});

export type OrchestratorStep = z.infer<typeof OrchestratorStepSchema>;

/**
 * Orchestrator mode (e.g., Linear, Quick, Sentry)
 */
export const OrchestratorModeSchema = z.object({
  /** Mode name */
  name: z.string().min(1),
  /** Mode description */
  description: z.string().optional(),
  /** Steps included in this mode (by step ID) */
  steps: z.array(z.string()).min(1, "Mode must include at least one step"),
});

export type OrchestratorMode = z.infer<typeof OrchestratorModeSchema>;

/**
 * Orchestrator skill schema.
 *
 * Extends the base skill schema with orchestration-specific fields:
 * - Step definitions with ordering and dependencies
 * - Agent references per step
 * - File path relay definitions for type-safe inter-step communication
 * - Mode definitions for workflow variants
 *
 * Constraint: Orchestrator-type entry-points must be Skills, not Agents,
 * because sub-agents cannot spawn further sub-agents.
 */
export const OrchestratorSkillSchema = z
  .object({
    frontmatter: SkillFrontmatterSchema,
    body: SkillBodySchema,
    /** Workflow steps */
    steps: z.array(OrchestratorStepSchema).min(1, "At least one step is required"),
    /** Available workflow modes */
    modes: z.array(OrchestratorModeSchema).optional(),
    /** Default mode name */
    defaultMode: z.string().optional(),
  })
  .refine(
    (data) => {
      // Orchestrator must not have context: fork (it runs on main thread)
      return data.frontmatter.context !== "fork";
    },
    {
      message:
        "Orchestrator skill must not have context: fork. " +
        "Orchestrators run on the main thread to spawn sub-agents.",
      path: ["frontmatter", "context"],
    }
  )
  .refine(
    (data) => {
      // If modes are defined, defaultMode should reference an existing mode
      if (data.modes && data.defaultMode) {
        return data.modes.some((m) => m.name === data.defaultMode);
      }
      return true;
    },
    {
      message: "defaultMode must reference an existing mode name",
      path: ["defaultMode"],
    }
  )
  .refine(
    (data) => {
      // All mode step references must exist in steps
      if (!data.modes) return true;
      const stepIds = new Set(data.steps.map((s) => s.id));
      return data.modes.every((mode) =>
        mode.steps.every((stepId) => stepIds.has(stepId))
      );
    },
    {
      message: "Mode references step IDs that do not exist in steps",
      path: ["modes"],
    }
  )
  .refine(
    (data) => {
      // dependsOn references must point to existing step IDs
      const stepIds = new Set(data.steps.map((s) => s.id));
      return data.steps.every((step) =>
        step.dependsOn.every((depId) => stepIds.has(depId))
      );
    },
    {
      message: "Step dependsOn references non-existent step IDs",
      path: ["steps"],
    }
  )
  .refine(
    (data) => {
      // Each step's inputs must reference semantic names that exist in
      // the outputs of steps listed in its dependsOn.
      const stepMap = new Map(data.steps.map((s) => [s.id, s]));
      return data.steps.every((step) => {
        if (step.inputs.length === 0) return true;
        // Collect all semantic names from dependsOn steps' outputs
        const availableNames = new Set<string>();
        for (const depId of step.dependsOn) {
          const depStep = stepMap.get(depId);
          if (depStep) {
            for (const output of depStep.outputs) {
              availableNames.add(output.semanticName);
            }
          }
        }
        return step.inputs.every((input) => availableNames.has(input));
      });
    },
    {
      message:
        "Step inputs reference semantic names that do not exist in dependsOn steps' outputs",
      path: ["steps"],
    }
  );

export type OrchestratorSkill = z.infer<typeof OrchestratorSkillSchema>;
