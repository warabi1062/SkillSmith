import { data, redirect } from "react-router";
import {
  generatePlugin,
  validateGeneratedPlugin,
} from "../lib/generator/index";
import type { Route } from "./+types/plugins.$id.generate";

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(`/plugins/${params.id}`);
}

export async function action({ params }: Route.ActionArgs) {
  const result = await generatePlugin(params.id);

  if (!result) {
    throw data("Plugin not found", { status: 404 });
  }

  const { plugin, components } = result;

  // Run post-generation validation with component data for dependency checks
  const postValidationErrors = validateGeneratedPlugin(plugin, components);
  plugin.validationErrors.push(...postValidationErrors);

  // Check for fatal errors
  const hasErrors = plugin.validationErrors.some(
    (e) => e.severity === "error",
  );

  // Return generation result as JSON for preview
  return data({
    success: !hasErrors,
    pluginName: plugin.pluginName,
    files: plugin.files.map((f) => ({
      path: f.path,
      content: f.content,
    })),
    validationErrors: plugin.validationErrors,
    fileCount: plugin.files.length,
  });
}
