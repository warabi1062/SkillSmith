import { data, redirect } from "react-router";
import {
  generatePlugin,
  validateGeneratedPlugin,
} from "../lib/generator/index";
import type { Route } from "./+types/plugins.$id.generate";

export async function action({ params }: Route.ActionArgs) {
  const result = await generatePlugin(params.id);

  if (!result) {
    throw data("Plugin not found", { status: 404 });
  }

  // Run post-generation validation
  const postValidationErrors = validateGeneratedPlugin(result);
  result.validationErrors.push(...postValidationErrors);

  // Check for fatal errors
  const hasErrors = result.validationErrors.some(
    (e) => e.severity === "error",
  );

  // Return generation result as JSON for preview
  return data({
    success: !hasErrors,
    pluginName: result.pluginName,
    files: result.files.map((f) => ({
      path: f.path,
      content: f.content,
    })),
    validationErrors: result.validationErrors,
    fileCount: result.files.length,
  });
}
