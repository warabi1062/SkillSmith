import { z } from "zod";

/**
 * Skill classification
 */
export const SkillKind = {
  EntryPointStandalone: "entry-point-standalone",
  EntryPointOrchestrator: "entry-point-orchestrator",
  Worker: "worker",
  CrossCutting: "cross-cutting",
} as const;

export type SkillKind = (typeof SkillKind)[keyof typeof SkillKind];

export const SkillKindSchema = z.enum([
  SkillKind.EntryPointStandalone,
  SkillKind.EntryPointOrchestrator,
  SkillKind.Worker,
  SkillKind.CrossCutting,
]);

/**
 * allowed-tools accepts both comma-separated string and array formats.
 * Internally normalized to string array.
 */
const AllowedToolsSchema = z
  .union([
    z.string().transform((val) =>
      val
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    ),
    z.array(z.string()),
  ])
  .optional();

/**
 * Skill hooks schema
 */
const SkillHooksSchema = z
  .object({
    preInvoke: z.string().optional(),
    postInvoke: z.string().optional(),
  })
  .passthrough()
  .optional();

/**
 * Skill frontmatter schema (all 10 fields from reference.md)
 */
export const SkillFrontmatterSchema = z.object({
  name: z
    .string()
    .max(64)
    .regex(
      /^[a-z0-9-]+$/,
      "Must be lowercase alphanumeric with hyphens only"
    )
    .optional(),
  description: z.string().optional(),
  "argument-hint": z.string().optional(),
  "disable-model-invocation": z.boolean().optional(),
  "user-invocable": z.boolean().optional(),
  "allowed-tools": AllowedToolsSchema,
  context: z.enum(["fork"]).optional(),
  agent: z.string().optional(),
  model: z.string().optional(),
  hooks: SkillHooksSchema,
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

/**
 * A section in the skill body (Markdown)
 */
export const SkillSectionSchema = z.object({
  heading: z.string(),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  content: z.string(),
});

export type SkillSection = z.infer<typeof SkillSectionSchema>;

/**
 * Skill body schema (Markdown structure)
 *
 * At prototype stage, body validation is minimal:
 * - Raw markdown text is preserved (lossless)
 * - Sections are optional parsed structure
 */
export const SkillBodySchema = z.object({
  raw: z.string(),
  sections: z.array(SkillSectionSchema).optional(),
});

export type SkillBody = z.infer<typeof SkillBodySchema>;

/**
 * Complete skill schema (frontmatter + body + classification)
 */
export const SkillSchema = z.object({
  frontmatter: SkillFrontmatterSchema,
  body: SkillBodySchema,
  kind: SkillKindSchema,
  supportFiles: z
    .array(
      z.object({
        name: z.string(),
        content: z.string(),
      })
    )
    .default([]),
});

export type Skill = z.infer<typeof SkillSchema>;

/**
 * Determine skill kind based on frontmatter and body content.
 *
 * Heuristics:
 * - Has `context: fork` or `user-invocable: false` -> likely Worker or Cross-cutting
 * - Body contains `Task(subagent_type:` -> Orchestrator
 * - `user-invocable` is not explicitly false and no `context: fork` -> Entry-point
 */
export function classifySkill(
  frontmatter: SkillFrontmatter,
  bodyRaw: string,
  kind?: SkillKind
): SkillKind {
  // If explicitly provided, use it
  if (kind) return kind;

  // Worker: context: "fork" is the defining characteristic of Worker skills.
  // This check comes first because "fork" takes priority over user-invocable.
  // A skill with { user-invocable: false, context: "fork" } is a Worker,
  // not Cross-cutting, since "fork" indicates sub-agent execution context.
  if (frontmatter.context === "fork") {
    return SkillKind.Worker;
  }

  // Cross-cutting: user-invocable is false, no context fork
  if (frontmatter["user-invocable"] === false) {
    return SkillKind.CrossCutting;
  }

  // Orchestrator: body references Task(subagent_type:...)
  if (bodyRaw.includes("Task(subagent_type:") || bodyRaw.includes("Task(subagent_type :")) {
    return SkillKind.EntryPointOrchestrator;
  }

  // Default: standalone entry-point
  return SkillKind.EntryPointStandalone;
}
