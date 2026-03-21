import { data } from "react-router";
import { createDependency } from "../lib/plugins.server";
import { ValidationError } from "../lib/validations";
import type { Route } from "./+types/plugins.$id.dependencies.new";

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const sourceId = String(formData.get("sourceId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const orderStr = formData.get("order");
  const order =
    orderStr !== null && String(orderStr).trim() !== ""
      ? Number(orderStr)
      : undefined;

  try {
    await createDependency({ sourceId, targetId, order });
    return { success: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return data(
        { errors: { dependency: error.message } },
        { status: 400 },
      );
    }
    throw error;
  }
}
