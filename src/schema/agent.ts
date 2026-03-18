import { z } from "zod";

/**
 * Agent model options
 */
export const AgentModelSchema = z.enum([
  "inherit",
  "sonnet",
  "haiku",
  "opus",
]);

export type AgentModel = z.infer<typeof AgentModelSchema>;

/**
 * Agent permission mode
 */
export const PermissionModeSchema = z.enum([
  "default",
  "acceptEdits",
  "dontAsk",
  "bypassPermissions",
  "plan",
]);

export type PermissionMode = z.infer<typeof PermissionModeSchema>;

/**
 * Agent memory scope
 */
export const MemoryScopeSchema = z.enum(["user", "project", "local"]);

export type MemoryScope = z.infer<typeof MemoryScopeSchema>;

/**
 * Agent hooks schema
 */
const AgentHooksSchema = z
  .object({
    preInvoke: z.string().optional(),
    postInvoke: z.string().optional(),
  })
  .passthrough()
  .optional();

/**
 * Agent frontmatter schema (all 9 fields from reference.md)
 */
export const AgentFrontmatterSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  description: z.string().min(1, "Agent description is required"),
  model: AgentModelSchema.optional(),
  tools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  permissionMode: PermissionModeSchema.optional(),
  hooks: AgentHooksSchema,
  memory: MemoryScopeSchema.optional(),
});

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;

/**
 * A section in the agent body (Markdown)
 */
export const AgentSectionSchema = z.object({
  heading: z.string(),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  content: z.string(),
});

export type AgentSection = z.infer<typeof AgentSectionSchema>;

/**
 * Agent body schema
 */
export const AgentBodySchema = z.object({
  raw: z.string(),
  sections: z.array(AgentSectionSchema).optional(),
});

export type AgentBody = z.infer<typeof AgentBodySchema>;

/**
 * Complete agent schema (frontmatter + body)
 *
 * Naming convention: agent name must end with "-agent"
 */
export const AgentSchema = z
  .object({
    frontmatter: AgentFrontmatterSchema,
    body: AgentBodySchema,
  })
  .refine(
    (data) => data.frontmatter.name.endsWith("-agent"),
    {
      message: "Agent name must end with '-agent'",
      path: ["frontmatter", "name"],
    }
  );

export type Agent = z.infer<typeof AgentSchema>;
