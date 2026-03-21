import React, { Suspense, useState, useEffect, useCallback } from "react";
import { Link, Form, data, useFetcher } from "react-router";
import {
  getPlugin,
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
} from "../lib/plugins.server";
import {
  validateComponentData,
  validateAgentTeamData,
  ValidationError,
} from "../lib/validations";
import type { Route } from "./+types/plugins.$id";
import type { Node, Edge } from "@xyflow/react";
import type { GenerationValidationError } from "../lib/generator/types";
import type { ExportResult } from "../lib/exporter.server";

const DependencyGraph = React.lazy(
  () => import("../components/DependencyGraph"),
);
const ComponentFormModal = React.lazy(
  () => import("../components/ComponentFormModal"),
);
const AgentTeamFormModal = React.lazy(
  () => import("../components/AgentTeamFormModal"),
);
const FilesManagementModal = React.lazy(
  () => import("../components/FilesManagementModal"),
);
const AgentTeamMembersModal = React.lazy(
  () => import("../components/AgentTeamMembersModal"),
);

interface ModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  componentType?: "SKILL" | "AGENT";
  componentId?: string;
}

interface AgentTeamModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  teamId?: string;
}

interface FilesModalState {
  isOpen: boolean;
  componentId?: string;
}

interface MembersModalState {
  isOpen: boolean;
  teamId?: string;
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  const name = loaderData?.plugin?.name ?? "Plugin";
  return [{ title: `${name} - SkillSmith` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const plugin = await getPlugin(params.id);
  if (!plugin) {
    throw data("Plugin not found", { status: 404 });
  }
  return { plugin };
}

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
      type: type as "SKILL" | "AGENT",
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

    await updateComponent(componentId, {
      type: type as "SKILL" | "AGENT",
      name,
      description: description || null,
      skillType: skillType as "ENTRY_POINT" | "WORKER" | undefined,
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

  throw data("Unknown intent", { status: 400 });
}

type PluginComponent = Awaited<
  ReturnType<typeof getPlugin>
> extends { components: (infer C)[] } | null
  ? C
  : never;

interface AgentTeamGraphData {
  id: string;
  name: string;
  description: string | null;
  orchestratorName: string;
}

export function buildGraphData(
  components: PluginComponent[],
  agentTeams: AgentTeamGraphData[] = [],
): {
  nodes: Node[];
  edges: Edge[];
} {
  if (components.length === 0 && agentTeams.length === 0)
    return { nodes: [], edges: [] };

  // Build adjacency for topological sort
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const c of components) {
    adjacency.set(c.id, []);
    inDegree.set(c.id, 0);
  }

  const edges: Edge[] = [];

  for (const c of components) {
    if (c.dependenciesFrom) {
      const isOrchestrator = c.skillConfig?.skillType === "ENTRY_POINT";
      for (const dep of c.dependenciesFrom) {
        const edge: Edge = {
          id: dep.id,
          source: c.id,
          target: dep.targetId,
          deletable: true,
        };
        if (isOrchestrator) {
          edge.sourceHandle = `step-${dep.order}`;
        }
        edges.push(edge);
        adjacency.get(c.id)?.push(dep.targetId);
        inDegree.set(dep.targetId, (inDegree.get(dep.targetId) ?? 0) + 1);
      }
    }
  }

  // Topological sort (Kahn's algorithm) - sources at top
  const depth = new Map<string, number>();
  const queue: string[] = [];

  for (const c of components) {
    if ((inDegree.get(c.id) ?? 0) === 0) {
      queue.push(c.id);
      depth.set(c.id, 0);
    }
  }

  let processed = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processed++;
    const currentDepth = depth.get(current) ?? 0;

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDepth = currentDepth + 1;
      if (newDepth > (depth.get(neighbor) ?? 0)) {
        depth.set(neighbor, newDepth);
      }
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  const hasCycle = processed < components.length;

  // Build layer index map: componentId -> index within its depth layer
  const layerCounters = new Map<number, number>();
  const layerIndexMap = new Map<string, number>();

  for (const c of components) {
    const d = depth.get(c.id) ?? 0;
    const idx = layerCounters.get(d) ?? 0;
    layerIndexMap.set(c.id, idx);
    layerCounters.set(d, idx + 1);
  }

  // Position nodes
  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 100;

  function getPosition(
    componentId: string,
    index: number,
  ): { x: number; y: number } {
    if (hasCycle) {
      const cols = Math.ceil(Math.sqrt(components.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      return { x: col * HORIZONTAL_SPACING, y: row * VERTICAL_SPACING };
    }
    // Hierarchical layout: use depth for y, layer-local index for x
    const d = depth.get(componentId) ?? 0;
    const layerIndex = layerIndexMap.get(componentId) ?? 0;
    return { x: layerIndex * HORIZONTAL_SPACING, y: d * VERTICAL_SPACING };
  }

  const nodes: Node[] = components.map((c, i) => {
    const label = c.skillConfig?.name ?? c.agentConfig?.name ?? "(unnamed)";
    const isOrchestrator = c.skillConfig?.skillType === "ENTRY_POINT";

    if (isOrchestrator) {
      // Build steps data: group dependencies by order
      const orderMap = new Map<
        number,
        Array<{ id: string; targetId: string }>
      >();
      for (const dep of c.dependenciesFrom ?? []) {
        const order = dep.order ?? 0;
        if (!orderMap.has(order)) {
          orderMap.set(order, []);
        }
        orderMap.get(order)!.push({ id: dep.id, targetId: dep.targetId });
      }
      const steps = Array.from(orderMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([order, dependencies]) => ({ order, dependencies }));

      return {
        id: c.id,
        position: getPosition(c.id, i),
        type: "orchestrator",
        data: { label, steps },
      };
    }

    return {
      id: c.id,
      position: getPosition(c.id, i),
      data: { label },
      style: {
        background: c.type === "SKILL" ? "#dbeafe" : "#fce7f3",
        border:
          c.type === "SKILL" ? "1px solid #93c5fd" : "1px solid #f9a8d4",
        borderRadius: "0.375rem",
        padding: "8px 16px",
      },
    };
  });

  // Agent Team nodes: placed in a separate row below all component nodes
  if (agentTeams.length > 0) {
    const maxDepth = components.length > 0
      ? Math.max(...Array.from(depth.values()), 0)
      : -1;
    const teamRowY = (maxDepth + 1) * VERTICAL_SPACING + VERTICAL_SPACING / 2;

    for (let i = 0; i < agentTeams.length; i++) {
      const team = agentTeams[i];
      nodes.push({
        id: `agentteam-${team.id}`,
        position: { x: i * HORIZONTAL_SPACING, y: teamRowY },
        data: { label: team.name },
        style: {
          background: "#dcfce7",
          border: "1px solid #86efac",
          borderRadius: "0.375rem",
          padding: "8px 16px",
        },
      });
    }
  }

  return { nodes, edges };
}

interface GenerateResult {
  success: boolean;
  pluginName: string;
  files: { path: string; content: string }[];
  validationErrors: GenerationValidationError[];
  fileCount: number;
}

export default function PluginDetail({ loaderData }: Route.ComponentProps) {
  const { plugin } = loaderData;
  const generateFetcher = useFetcher<GenerateResult>();
  const exportFetcher = useFetcher<ExportResult>();
  const addDependencyFetcher = useFetcher<{
    success?: boolean;
    errors?: { dependency: string };
  }>();
  const removeDependencyFetcher = useFetcher();
  const componentFetcher = useFetcher<{
    success?: boolean;
    componentId?: string;
    errors?: Record<string, string>;
  }>();
  const deleteFetcher = useFetcher<{
    success?: boolean;
    error?: string;
  }>();
  const agentTeamFetcher = useFetcher<{
    success?: boolean;
    teamId?: string;
    errors?: Record<string, string>;
  }>();

  const skills = plugin.components.filter((c) => c.type === "SKILL");
  const agents = plugin.components.filter((c) => c.type === "AGENT");
  const entryPointSkills = plugin.components.filter(
    (c) => c.type === "SKILL" && c.skillConfig?.skillType === "ENTRY_POINT",
  );

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: "create",
  });
  const [agentTeamModalState, setAgentTeamModalState] =
    useState<AgentTeamModalState>({
      isOpen: false,
      mode: "create",
    });
  const [filesModalState, setFilesModalState] = useState<FilesModalState>({
    isOpen: false,
  });
  const [membersModalState, setMembersModalState] = useState<MembersModalState>({
    isOpen: false,
  });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Watch deleteFetcher for error messages
  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data?.error) {
      setDeleteError(deleteFetcher.data.error);
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  const generateResult = generateFetcher.data;
  const isGenerating = generateFetcher.state !== "idle";
  const exportResult = exportFetcher.data;
  const isExporting = exportFetcher.state !== "idle";

  const agentTeamsForGraph: AgentTeamGraphData[] = plugin.agentTeams.map(
    (team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      orchestratorName:
        team.orchestrator.skillConfig?.name ?? "(unnamed)",
    }),
  );

  const graphData =
    plugin.components.length > 0 || plugin.agentTeams.length > 0
      ? buildGraphData(plugin.components, agentTeamsForGraph)
      : { nodes: [], edges: [] };

  const handleConnect = useCallback(
    (sourceId: string, targetId: string) => {
      setDeleteError(null);
      addDependencyFetcher.submit(
        { sourceId, targetId },
        {
          method: "post",
          action: `/plugins/${plugin.id}/dependencies/new`,
        },
      );
    },
    [addDependencyFetcher, plugin.id],
  );

  const handleEdgeClick = useCallback(
    (dependencyId: string) => {
      setDeleteError(null);
      removeDependencyFetcher.submit(null, {
        method: "post",
        action: `/plugins/${plugin.id}/dependencies/${dependencyId}/destroy`,
      });
    },
    [removeDependencyFetcher, plugin.id],
  );

  const handleNodeDoubleClick = useCallback(
    (componentId: string) => {
      const comp = plugin.components.find((c) => c.id === componentId);
      if (comp) {
        setDeleteError(null);
        setModalState({
          isOpen: true,
          mode: "edit",
          componentId,
        });
      }
    },
    [plugin.components],
  );

  const handleCreateComponent = useCallback(
    (type: "SKILL" | "AGENT") => {
      setDeleteError(null);
      setModalState({
        isOpen: true,
        mode: "create",
        componentType: type,
      });
    },
    [],
  );

  const handleDeleteComponent = useCallback(
    (componentId: string) => {
      setDeleteError(null);
      deleteFetcher.submit(
        { intent: "delete-component", componentId },
        { method: "post", action: `/plugins/${plugin.id}` },
      );
    },
    [deleteFetcher, plugin.id],
  );

  const handleManageFiles = useCallback(
    (componentId: string) => {
      setDeleteError(null);
      setFilesModalState({ isOpen: true, componentId });
    },
    [],
  );

  const handleFilesModalClose = useCallback(() => {
    setFilesModalState({ isOpen: false });
  }, []);

  const handleManageMembers = useCallback(
    (teamId: string) => {
      setDeleteError(null);
      setMembersModalState({ isOpen: true, teamId });
    },
    [],
  );

  const handleMembersModalClose = useCallback(() => {
    setMembersModalState({ isOpen: false });
  }, []);

  const handleModalClose = useCallback(() => {
    setModalState({ isOpen: false, mode: "create" });
  }, []);

  const handleAgentTeamDoubleClick = useCallback(
    (teamId: string) => {
      const team = plugin.agentTeams.find((t) => t.id === teamId);
      if (team) {
        setDeleteError(null);
        setAgentTeamModalState({
          isOpen: true,
          mode: "edit",
          teamId,
        });
      }
    },
    [plugin.agentTeams],
  );

  const handleCreateAgentTeam = useCallback(() => {
    setDeleteError(null);
    setAgentTeamModalState({
      isOpen: true,
      mode: "create",
    });
  }, []);

  const handleDeleteAgentTeam = useCallback(
    (teamId: string) => {
      setDeleteError(null);
      deleteFetcher.submit(
        { intent: "delete-agent-team", teamId },
        { method: "post", action: `/plugins/${plugin.id}` },
      );
    },
    [deleteFetcher, plugin.id],
  );

  const handleAgentTeamModalClose = useCallback(() => {
    setAgentTeamModalState({ isOpen: false, mode: "create" });
  }, []);

  // Build initialValues for edit mode
  const modalInitialValues = modalState.mode === "edit" && modalState.componentId
    ? (() => {
        const comp = plugin.components.find((c) => c.id === modalState.componentId);
        if (!comp) return undefined;
        return {
          componentId: comp.id,
          name: comp.skillConfig?.name ?? comp.agentConfig?.name ?? "",
          description: comp.skillConfig?.description ?? comp.agentConfig?.description ?? "",
          skillType: comp.skillConfig?.skillType ?? "",
          type: comp.type,
        };
      })()
    : undefined;

  // Build initialValues for agent team edit mode
  const agentTeamModalInitialValues =
    agentTeamModalState.mode === "edit" && agentTeamModalState.teamId
      ? (() => {
          const team = plugin.agentTeams.find(
            (t) => t.id === agentTeamModalState.teamId,
          );
          if (!team) return undefined;
          return {
            teamId: team.id,
            name: team.name,
            description: team.description ?? "",
            orchestratorName:
              team.orchestrator.skillConfig?.name ?? "(unnamed)",
          };
        })()
      : undefined;

  const graphComponents = plugin.components.map((c) => ({
    id: c.id,
    type: c.type,
    skillConfig: c.skillConfig ? { skillType: c.skillConfig.skillType } : null,
  }));

  return (
    <div>
      <div className="detail-header">
        <div>
          <h2>{plugin.name}</h2>
          {plugin.description && (
            <p className="card-description">{plugin.description}</p>
          )}
        </div>
        <div className="detail-actions">
          <generateFetcher.Form
            method="post"
            action={`/plugins/${plugin.id}/generate`}
          >
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </generateFetcher.Form>
          <Link to={`/plugins/${plugin.id}/edit`} className="btn btn-secondary">
            Edit
          </Link>
          <Form
            method="post"
            action={`/plugins/${plugin.id}/destroy`}
            onSubmit={(event) => {
              const confirmed = window.confirm(
                `Plugin "${plugin.name}" and all its components will be deleted. Are you sure?`,
              );
              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <button type="submit" className="btn btn-danger">
              Delete
            </button>
          </Form>
        </div>
      </div>

      <div className="component-list">
        <h3>Skills ({skills.length})</h3>
        {skills.length === 0 ? (
          <p className="card-description">No skills yet.</p>
        ) : (
          skills.map((component) => (
            <div
              key={component.id}
              className="component-item component-item-link"
              style={{ cursor: "pointer" }}
              onClick={() => handleNodeDoubleClick(component.id)}
            >
              <div>
                <span className="component-item-name">
                  {component.skillConfig?.name ?? "(unnamed)"}
                </span>
                {component.skillConfig?.skillType && (
                  <span
                    className="badge"
                    style={{ marginLeft: "0.5rem" }}
                  >
                    {component.skillConfig.skillType}
                  </span>
                )}
              </div>
              <span className="badge badge-skill">SKILL</span>
            </div>
          ))
        )}
      </div>

      <div className="component-list">
        <h3>Agents ({agents.length})</h3>
        {agents.length === 0 ? (
          <p className="card-description">No agents yet.</p>
        ) : (
          agents.map((component) => (
            <div
              key={component.id}
              className="component-item component-item-link"
              style={{ cursor: "pointer" }}
              onClick={() => handleNodeDoubleClick(component.id)}
            >
              <div>
                <span className="component-item-name">
                  {component.agentConfig?.name ?? "(unnamed)"}
                </span>
              </div>
              <span className="badge badge-agent">AGENT</span>
            </div>
          ))
        )}
      </div>

      <div className="component-list">
        <h3>Agent Teams ({plugin.agentTeams.length})</h3>
        {plugin.agentTeams.length === 0 ? (
          <p className="card-description">No agent teams yet.</p>
        ) : (
          plugin.agentTeams.map((team) => (
            <div
              key={team.id}
              className="component-item component-item-link"
              style={{ cursor: "pointer" }}
              onClick={() => handleManageMembers(team.id)}
            >
              <div>
                <span className="component-item-name">{team.name}</span>
                <span className="badge" style={{ marginLeft: "0.5rem" }}>
                  {team.orchestrator.skillConfig?.name ?? "(unnamed)"}
                </span>
              </div>
              <span className="badge">
                {team._count.members} member{team._count.members !== 1 ? "s" : ""}
              </span>
            </div>
          ))
        )}
      </div>

      {isClient && (
        <div className="dependency-graph-section">
          <h3>Dependency Graph</h3>
          {addDependencyFetcher.data?.errors?.dependency && (
            <p
              style={{
                color: "var(--color-danger, #dc2626)",
                margin: "0 0 0.5rem 0",
              }}
            >
              {addDependencyFetcher.data.errors.dependency}
            </p>
          )}
          {deleteError && (
            <p
              style={{
                color: "var(--color-danger, #dc2626)",
                margin: "0 0 0.5rem 0",
              }}
            >
              {deleteError}
            </p>
          )}
          <Suspense fallback={<div>Loading graph...</div>}>
            <DependencyGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              pluginId={plugin.id}
              components={graphComponents}
              agentTeams={agentTeamsForGraph}
              onConnect={handleConnect}
              onEdgeClick={handleEdgeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              onCreateComponent={handleCreateComponent}
              onDeleteComponent={handleDeleteComponent}
              onManageFiles={handleManageFiles}
              onAgentTeamDoubleClick={handleAgentTeamDoubleClick}
              onCreateAgentTeam={handleCreateAgentTeam}
              onDeleteAgentTeam={handleDeleteAgentTeam}
              onManageMembers={handleManageMembers}
            />
          </Suspense>
        </div>
      )}

      {isClient && (
        <Suspense fallback={null}>
          <ComponentFormModal
            isOpen={modalState.isOpen}
            onClose={handleModalClose}
            mode={modalState.mode}
            componentType={modalState.componentType}
            initialValues={modalInitialValues}
            fetcher={componentFetcher}
            pluginId={plugin.id}
          />
        </Suspense>
      )}

      {isClient && filesModalState.isOpen && filesModalState.componentId && (
        <Suspense fallback={null}>
          <FilesManagementModal
            isOpen={filesModalState.isOpen}
            onClose={handleFilesModalClose}
            pluginId={plugin.id}
            componentId={filesModalState.componentId}
            componentName={(() => {
              const comp = plugin.components.find(
                (c) => c.id === filesModalState.componentId,
              );
              if (!comp) return "(unknown)";
              return (
                comp.skillConfig?.name ?? comp.agentConfig?.name ?? "(unnamed)"
              );
            })()}
            files={
              plugin.components.find(
                (c) => c.id === filesModalState.componentId,
              )?.files ?? []
            }
          />
        </Suspense>
      )}

      {isClient && (
        <Suspense fallback={null}>
          <AgentTeamFormModal
            isOpen={agentTeamModalState.isOpen}
            onClose={handleAgentTeamModalClose}
            mode={agentTeamModalState.mode}
            initialValues={agentTeamModalInitialValues}
            entryPointSkills={entryPointSkills.map((c) => ({
              id: c.id,
              skillConfig: c.skillConfig
                ? { name: c.skillConfig.name }
                : null,
            }))}
            fetcher={agentTeamFetcher}
            pluginId={plugin.id}
          />
        </Suspense>
      )}

      {isClient && membersModalState.isOpen && membersModalState.teamId && (
        <Suspense fallback={null}>
          <AgentTeamMembersModal
            isOpen={membersModalState.isOpen}
            onClose={handleMembersModalClose}
            pluginId={plugin.id}
            teamId={membersModalState.teamId}
            teamName={(() => {
              const team = plugin.agentTeams.find(
                (t) => t.id === membersModalState.teamId,
              );
              return team?.name ?? "(unknown)";
            })()}
            members={
              plugin.agentTeams.find(
                (t) => t.id === membersModalState.teamId,
              )?.members ?? []
            }
            agentComponents={plugin.components
              .filter((c) => c.type === "AGENT")
              .map((c) => ({
                id: c.id,
                agentConfig: c.agentConfig
                  ? { name: c.agentConfig.name }
                  : null,
              }))}
          />
        </Suspense>
      )}

      {generateResult && (
        <div className="component-list" style={{ marginTop: "2rem" }}>
          <h3>
            Generation Result{" "}
            <span
              className={`badge ${generateResult.success ? "" : "badge-agent"}`}
            >
              {generateResult.success ? "Success" : "Has Errors"}
            </span>
          </h3>

          {generateResult.validationErrors.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <h4>Validation Messages</h4>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {generateResult.validationErrors.map((err, i) => (
                  <li
                    key={i}
                    style={{
                      padding: "0.25rem 0",
                      color:
                        err.severity === "error"
                          ? "var(--color-danger, #dc2626)"
                          : "var(--color-warning, #d97706)",
                    }}
                  >
                    [{err.severity.toUpperCase()}] {err.code}: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h4>Generated Files ({generateResult.fileCount})</h4>
          {generateResult.files.map((file, i) => (
            <details key={i} style={{ marginBottom: "0.5rem" }}>
              <summary style={{ cursor: "pointer", fontFamily: "monospace" }}>
                {file.path}
              </summary>
              <pre
                style={{
                  background: "var(--color-surface, #f5f5f5)",
                  padding: "1rem",
                  borderRadius: "0.375rem",
                  overflow: "auto",
                  fontSize: "0.85rem",
                  marginTop: "0.5rem",
                }}
              >
                {file.content}
              </pre>
            </details>
          ))}

          <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--color-border, #e5e5e5)", paddingTop: "1.5rem" }}>
            <h4>Export to Directory</h4>
            <exportFetcher.Form
              method="post"
              action={`/plugins/${plugin.id}/export`}
              style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "32rem" }}
            >
              <div>
                <label htmlFor="targetDir" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
                  Target Directory
                </label>
                <input
                  type="text"
                  id="targetDir"
                  name="targetDir"
                  placeholder="/path/to/output"
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid var(--color-border, #d1d5db)",
                    borderRadius: "0.375rem",
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" name="overwrite" />
                Overwrite existing files
              </label>
              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isExporting}
                >
                  {isExporting ? "Exporting..." : "Export"}
                </button>
              </div>
            </exportFetcher.Form>

            {exportResult && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  background: exportResult.success
                    ? "var(--color-success-bg, #f0fdf4)"
                    : "var(--color-danger-bg, #fef2f2)",
                  borderRadius: "0.375rem",
                  border: `1px solid ${exportResult.success ? "var(--color-success-border, #bbf7d0)" : "var(--color-danger-border, #fecaca)"}`,
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                  {exportResult.success ? "Export Successful" : "Export Completed with Errors"}
                </p>
                {exportResult.exportedDir && (
                  <p style={{ fontFamily: "monospace", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                    Directory: {exportResult.exportedDir}
                  </p>
                )}
                <p>
                  Written: {exportResult.writtenFiles.length} file(s)
                  {exportResult.skippedFiles.length > 0 && (
                    <>, Skipped: {exportResult.skippedFiles.length} file(s)</>
                  )}
                </p>
                {exportResult.skippedFiles.length > 0 && (
                  <details style={{ marginTop: "0.5rem" }}>
                    <summary style={{ cursor: "pointer", fontSize: "0.85rem" }}>
                      Skipped files
                    </summary>
                    <ul style={{ fontFamily: "monospace", fontSize: "0.8rem", margin: "0.25rem 0 0 1rem" }}>
                      {exportResult.skippedFiles.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {exportResult.errors.length > 0 && (
                  <details style={{ marginTop: "0.5rem" }} open>
                    <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "var(--color-danger, #dc2626)" }}>
                      Errors ({exportResult.errors.length})
                    </summary>
                    <ul style={{ fontFamily: "monospace", fontSize: "0.8rem", margin: "0.25rem 0 0 1rem", color: "var(--color-danger, #dc2626)" }}>
                      {exportResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <Link to="/plugins" className="btn btn-secondary">
          Back to Plugins
        </Link>
      </div>
    </div>
  );
}
