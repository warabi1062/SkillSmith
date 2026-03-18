import { z } from "zod";

/**
 * Plugin metadata schema (plugin.json)
 */
export const PluginMetadataSchema = z.object({
  name: z.string().min(1, "Plugin name is required"),
  description: z.string().min(1, "Plugin description is required"),
});

export type PluginMetadata = z.infer<typeof PluginMetadataSchema>;

/**
 * Support file within a skill directory
 */
export const SupportFileSchema = z.object({
  name: z.string(),
  content: z.string(),
});

export type SupportFile = z.infer<typeof SupportFileSchema>;

/**
 * Full plugin structure including skills, agents, and docs
 */
export const PluginSchema = z.object({
  metadata: PluginMetadataSchema,
  skills: z.array(z.lazy(() => SkillNameRefSchema)).default([]),
  agents: z.array(z.lazy(() => AgentNameRefSchema)).default([]),
});

export type Plugin = z.infer<typeof PluginSchema>;

/**
 * Lightweight reference to a skill by name (for plugin-level listing)
 */
const SkillNameRefSchema = z.object({
  name: z.string(),
});

/**
 * Lightweight reference to an agent by name (for plugin-level listing)
 */
const AgentNameRefSchema = z.object({
  name: z.string(),
});
