import { data, redirect } from "react-router";
import {
  getPlugin,
  deletePlugin,
  getComponent,
  createComponent,
  updateComponent,
  deleteComponent,
  getAgentTeam,
  createAgentTeam,
  updateAgentTeam,
  deleteAgentTeam,
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
  validateAgentTeamData,
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
      skillType: skillType as "ENTRY_POINT" | "WORKER" | undefined,
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

    // agentConfigフィールドの取得（WORKER Skill + agentConfig有りの場合）
    const agentModel = String(formData.get("agentModel") ?? "");
    const agentTools = String(formData.get("agentTools") ?? "");
    const agentDisallowedTools = String(formData.get("agentDisallowedTools") ?? "");
    const agentPermissionMode = String(formData.get("agentPermissionMode") ?? "");
    const agentHooks = String(formData.get("agentHooks") ?? "");
    const agentMemory = String(formData.get("agentMemory") ?? "");
    const agentContent = String(formData.get("agentContent") ?? "");

    // agentConfig関連フィールドが1つでも送信されていればagentConfigを更新
    const agentConfigFieldNames = [
      "agentModel",
      "agentContent",
      "agentTools",
      "agentDisallowedTools",
      "agentPermissionMode",
      "agentHooks",
      "agentMemory",
    ];
    const hasAgentFields = agentConfigFieldNames.some((f) => formData.has(f));

    await updateComponent(componentId, {
      type: type as "SKILL",
      name,
      description: description || null,
      skillType: skillType as "ENTRY_POINT" | "WORKER" | undefined,
      content,
      input,
      output,
      ...(hasAgentFields
        ? {
            agentConfig: {
              model: agentModel,
              tools: agentTools,
              disallowedTools: agentDisallowedTools,
              permissionMode: agentPermissionMode,
              hooks: agentHooks,
              memory: agentMemory,
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

  if (intent === "create-agent-team") {
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");
    const orchestratorId = String(formData.get("orchestratorId") ?? "");

    try {
      if (!orchestratorId) {
        throw new ValidationError({
          field: "orchestratorId",
          code: "ORCHESTRATOR_REQUIRED",
          message: "Orchestrator is required",
        });
      }

      validateAgentTeamData({
        name,
        description: description || undefined,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { name, description, orchestratorId },
          },
          { status: 400 },
        );
      }
      throw error;
    }

    try {
      const team = await createAgentTeam(params.id, {
        orchestratorId,
        name,
        description: description || undefined,
      });

      return { success: true, teamId: team.id };
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { name, description, orchestratorId },
          },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  if (intent === "update-agent-team") {
    const teamId = String(formData.get("teamId") ?? "");
    const team = await getAgentTeam(teamId);
    if (!team || team.pluginId !== params.id) {
      throw data("Agent Team not found", { status: 404 });
    }

    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");

    try {
      validateAgentTeamData({
        name,
        description: description || undefined,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { name, description },
          },
          { status: 400 },
        );
      }
      throw error;
    }

    await updateAgentTeam(teamId, {
      name,
      description: description || undefined,
    });

    return { success: true, teamId };
  }

  if (intent === "delete-agent-team") {
    const teamId = String(formData.get("teamId") ?? "");
    const team = await getAgentTeam(teamId);
    if (!team || team.pluginId !== params.id) {
      throw data("Agent Team not found", { status: 404 });
    }

    await deleteAgentTeam(teamId);
    return { success: true };
  }

  if (intent === "add-agent-team-member") {
    const teamId = String(formData.get("teamId") ?? "");
    const componentId = String(formData.get("componentId") ?? "");

    const team = await getAgentTeam(teamId);
    if (!team || team.pluginId !== params.id) {
      throw data("Agent Team not found", { status: 404 });
    }

    if (!componentId) {
      return data(
        {
          errors: { componentId: "Agent component is required" },
          values: { componentId },
        },
        { status: 400 },
      );
    }

    try {
      await addAgentTeamMember(teamId, { componentId });
      return { success: true, teamId };
    } catch (error) {
      if (error instanceof ValidationError) {
        return data(
          {
            errors: { [error.field]: error.message },
            values: { componentId },
          },
          { status: 400 },
        );
      }
      throw error;
    }
  }

  if (intent === "remove-agent-team-member") {
    const teamId = String(formData.get("teamId") ?? "");
    const memberId = String(formData.get("memberId") ?? "");

    const team = await getAgentTeam(teamId);
    if (!team || team.pluginId !== params.id) {
      throw data("Agent Team not found", { status: 404 });
    }

    const member = team.members.find((m) => m.id === memberId);
    if (!member) {
      throw data("Member not found", { status: 404 });
    }

    await removeAgentTeamMember(memberId);
    return { success: true, teamId };
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
