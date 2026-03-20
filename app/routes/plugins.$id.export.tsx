import { data, redirect } from "react-router";
import { exportPlugin } from "../lib/exporter.server";
import type { Route } from "./+types/plugins.$id.export";

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(`/plugins/${params.id}`);
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const targetDir = formData.get("targetDir");
  const overwrite = formData.get("overwrite") === "on";

  if (!targetDir || typeof targetDir !== "string" || targetDir.trim() === "") {
    return data(
      { success: false, error: "Target directory is required" },
      { status: 400 },
    );
  }

  const result = await exportPlugin(params.id, {
    targetDir: targetDir.trim(),
    overwrite,
  });

  return data(result);
}
