import { isSafeFilename } from "../path-validation.server";
import type { GeneratedFile } from "./types";

interface ComponentFileData {
  id: string;
  role: string;
  filename: string;
  content: string;
}

/**
 * Generate support files (template.md, reference.md, etc.) for a component.
 * MAIN files are handled by skill/agent generators, so they are excluded here.
 *
 * @param componentDir - The directory path for this component (e.g., "skills/my-skill")
 * @param files - All ComponentFile records for the component
 * @param componentId - The component ID for traceability
 */
export function generateSupportFiles(
  componentDir: string,
  files: ComponentFileData[],
  componentId: string,
): GeneratedFile[] {
  return files
    .filter((f) => f.role !== "MAIN")
    .filter((f) => isSafeFilename(f.filename))
    .map((f) => ({
      path: `${componentDir}/${f.filename}`,
      content: f.content.endsWith("\n") ? f.content : f.content + "\n",
      componentId,
    }));
}
