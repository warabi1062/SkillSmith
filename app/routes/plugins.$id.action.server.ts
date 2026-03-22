import { data, redirect } from "react-router";
import {
  getPlugin,
  deletePlugin,
  getComponent,
  createComponent,
  updateComponent,
  deleteComponent,
  addAgentTeamMember,
  removeAgentTeamMember,
  getDependency,
  createDependency,
  deleteDependency,
  reorderDependency,
  deleteDependenciesBatch,
  verifyDependenciesOwnership,
  createComponentFile,
  getComponentFile,
  updateComponentFile,
  deleteComponentFile,
} from "../lib/plugins.server";
import {
  generatePlugin,
  validateGeneratedPlugin,
} from "../lib/generator/index";
import {
  validateComponentData,
  ValidationError,
} from "../lib/validations";
import type { Route } from "./+types/plugins.$id";

export async function action({ request, params }: Route.ActionArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create-component") {
    const type = String(formData.get("type") ?? "");
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    const skillType = String(formData.get("skillType") ?? "");

    try {
      validateComponentData({
        type,
        name,
        description,
        skillType: skillType || undefined,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { type, name, description, skillType },
          },
          { status: 400 },
        );
      }
      throw error;
    }

    const component = await createComponent(params.id, {
      type: type as "SKILL",
      name,
      description: description || null,
      skillType: skillType as "ENTRY_POINT" | "WORKER" | "WORKER_WITH_SUB_AGENT" | "WORKER_WITH_AGENT_TEAM" | undefined,
    });

    return { success: true, componentId: component.id };
  }

  if (intent === "update-component") {
    const componentId = String(formData.get("componentId") ?? "");
    const component = await getComponent(componentId);
    if (!component || component.pluginId !== params.id) {
      throw data("Component not found", { status: 404 });
    }

    const type = component.type;
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    const skillType = String(formData.get("skillType") ?? "");
    const content = String(formData.get("content") ?? "");
    const input = String(formData.get("input") ?? "");
    const output = String(formData.get("output") ?? "");

    try {
      validateComponentData({
        type,
        name,
        description,
        skillType: skillType || undefined,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { name, description, skillType },
          },
          { status: 400 },
        );
      }
      throw error;
    }

    // agentConfigフィールドの取得（WORKER_WITH_SUB_AGENT + agentConfig有りの場合）
    const agentModel = String(formData.get("agentModel") ?? "");
    const agentTools = String(formData.get("agentTools") ?? "");
    const agentContent = String(formData.get("agentContent") ?? "");

    // agentConfig関連フィールドが1つでも送信されていればagentConfigを更新
    const agentConfigFieldNames = [
      "agentModel",
      "agentContent",
      "agentTools",
    ];
    const hasAgentFields = agentConfigFieldNames.some((f) => formData.has(f));

    await updateComponent(componentId, {
      type: type as "SKILL",
      name,
      description: description || null,
      skillType: skillType as "ENTRY_POINT" | "WORKER" | "WORKER_WITH_SUB_AGENT" | "WORKER_WITH_AGENT_TEAM" | undefined,
      content,
      input,
      output,
      ...(hasAgentFields
        ? {
            agentConfig: {
              model: agentModel,
              tools: agentTools,
              content: agentContent,
            },
          }
        : {}),
    });

    return { success: true, componentId };
  }

  if (intent === "delete-component") {
    const componentId = String(formData.get("componentId") ?? "");
    const component = await getComponent(componentId);
    if (!component || component.pluginId !== params.id) {
      throw data("Component not found", { status: 404 });
    }

    try {
      await deleteComponent(componentId);
      return { success: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return data({ error: error.message }, { status: 409 });
      }
      throw error;
    }
  }

  if (intent === "add-agent-team-member") {
    const agentTeamComponentId = String(formData.get("agentTeamComponentId") ?? "");
    const memberComponentId = String(formData.get("memberComponentId") ?? "");

    // agentTeamComponentIdがこのプラグインに属するか検証
    const agentTeamComponent = await getComponent(agentTeamComponentId);
    if (!agentTeamComponent || agentTeamComponent.pluginId !== params.id) {
      throw data("Agent Team component not found", { status: 404 });
    }

    if (!memberComponentId) {
      return data(
        {
          errors: { componentId: "Agent component is required" },
          values: { memberComponentId },
        },
        { status: 400 },
      );
    }

    try {
      await addAgentTeamMember(agentTeamComponentId, { memberComponentId });
      return { success: true, agentTeamComponentId };
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { memberComponentId },
          },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  if (intent === "remove-agent-team-member") {
    const agentTeamComponentId = String(formData.get("agentTeamComponentId") ?? "");
    const memberId = String(formData.get("memberId") ?? "");

    // agentTeamComponentIdがこのプラグインに属するか検証
    const agentTeamComponent = await getComponent(agentTeamComponentId);
    if (!agentTeamComponent || agentTeamComponent.pluginId !== params.id) {
      throw data("Agent Team component not found", { status: 404 });
    }

    await removeAgentTeamMember(memberId, agentTeamComponentId);
    return { success: true, agentTeamComponentId };
  }

  if (intent === "delete-dependencies-batch") {
    const dependencyIds = String(formData.get("dependencyIds") ?? "");
    const ids = dependencyIds.split(",").filter(Boolean);
    if (ids.length === 0) {
      throw data("dependencyIds is required", { status: 400 });
    }
    const owned = await verifyDependenciesOwnership(ids, params.id);
    if (!owned) {
      throw data("Forbidden: dependencies do not belong to this plugin", {
        status: 403,
      });
    }
    await deleteDependenciesBatch(ids);
    return { ok: true };
  }

  // --- File intents ---

  if (intent === "create-file") {
    const componentId = String(formData.get("componentId") ?? "");
    const component = await getComponent(componentId);
    if (!component || component.pluginId !== params.id) {
      throw data("Component not found", { status: 404 });
    }

    const role = String(formData.get("role") ?? "");
    const filename = String(formData.get("filename") ?? "");
    const content = String(formData.get("content") ?? "");

    try {
      await createComponentFile(componentId, { role, filename, content });
      return { success: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { role, filename, content },
          },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  if (intent === "update-file") {
    const fileId = String(formData.get("fileId") ?? "");
    const file = await getComponentFile(fileId);
    if (!file) {
      throw data("File not found", { status: 404 });
    }
    const fileComponent = await getComponent(file.componentId);
    if (!fileComponent || fileComponent.pluginId !== params.id) {
      throw data("File not found", { status: 404 });
    }

    const filename = String(formData.get("filename") ?? "");
    const content = String(formData.get("content") ?? "");

    try {
      await updateComponentFile(fileId, { filename, content });
      return { success: true };
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { filename, content },
          },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  if (intent === "delete-file") {
    const fileId = String(formData.get("fileId") ?? "");
    const file = await getComponentFile(fileId);
    if (!file) {
      throw data("File not found", { status: 404 });
    }
    const fileComponent = await getComponent(file.componentId);
    if (!fileComponent || fileComponent.pluginId !== params.id) {
      throw data("File not found", { status: 404 });
    }

    await deleteComponentFile(fileId);
    return { success: true };
  }

  // --- Dependency intents ---

  if (intent === "add-dependency") {
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

  if (intent === "remove-dependency") {
    const dependencyId = String(formData.get("dependencyId") ?? "");
    const dependency = await getDependency(dependencyId);
    if (!dependency || dependency.source.pluginId !== params.id) {
      throw data("Dependency not found", { status: 404 });
    }

    await deleteDependency(dependencyId);
    return { success: true };
  }

  if (intent === "reorder-dependency") {
    const dependencyId = String(formData.get("dependencyId") ?? "");
    const dependency = await getDependency(dependencyId);
    if (!dependency || dependency.source.pluginId !== params.id) {
      throw data("Dependency not found", { status: 404 });
    }

    const direction = String(formData.get("direction") ?? "");

    if (direction !== "up" && direction !== "down") {
      throw data("direction must be 'up' or 'down'", { status: 400 });
    }

    await reorderDependency(dependencyId, direction);
    return { success: true };
  }

  // --- Plugin-level intents ---

  if (intent === "delete-plugin") {
    await deletePlugin(params.id);
    return redirect("/plugins");
  }

  if (intent === "generate-plugin") {
    const result = await generatePlugin(params.id);

    if (!result) {
      throw data("Plugin not found", { status: 404 });
    }

    const { plugin: generatedPlugin, components } = result;

    // Run post-generation validation with component data for dependency checks
    const postValidationErrors = validateGeneratedPlugin(
      generatedPlugin,
      components,
    );
    generatedPlugin.validationErrors.push(...postValidationErrors);

    // Check for fatal errors
    const hasErrors = generatedPlugin.validationErrors.some(
      (e) => e.severity === "error",
    );

    // Return generation result as JSON for preview
    return data({
      success: !hasErrors,
      pluginName: generatedPlugin.pluginName,
      files: generatedPlugin.files.map((f) => ({
        path: f.path,
        content: f.content,
      })),
      validationErrors: generatedPlugin.validationErrors,
      fileCount: generatedPlugin.files.length,
    });
  }

  throw data("Unknown intent", { status: 400 });
}
