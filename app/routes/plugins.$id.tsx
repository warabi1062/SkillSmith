import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { Link, Form, data, useFetcher } from "react-router";
import { getPlugin } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id";
import type { GenerationValidationError } from "../lib/generator/types";
import type { ExportResult } from "../lib/exporter.server";
import { buildGraphData, type AgentTeamGraphData } from "../lib/build-graph-data";
import {
  loadGraphPositions,
  saveGraphPositions,
  clearGraphPositions,
} from "../lib/graph-positions";

export { action } from "./plugins.$id.action.server";

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
  const reorderDependencyFetcher = useFetcher();
  const deleteBatchFetcher = useFetcher();

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

  const agentTeamsForGraph: AgentTeamGraphData[] = useMemo(
    () =>
      plugin.agentTeams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        orchestratorName:
          team.orchestrator.skillConfig?.name ?? "(unnamed)",
      })),
    [plugin.agentTeams],
  );

  const rawGraphData = useMemo(
    () =>
      plugin.components.length > 0 || plugin.agentTeams.length > 0
        ? buildGraphData(plugin.components, agentTeamsForGraph)
        : { nodes: [], edges: [] },
    [plugin.components, agentTeamsForGraph],
  );

  const handleReorderStep = useCallback(
    (dependencyId: string, direction: "up" | "down") => {
      reorderDependencyFetcher.submit(
        { intent: "reorder-dependency", dependencyId, direction },
        { method: "post" },
      );
    },
    [reorderDependencyFetcher],
  );

  const handleDeleteStep = useCallback(
    (dependencyIds: string[]) => {
      const confirmed = window.confirm("Remove this step and its dependencies?");
      if (!confirmed) return;
      deleteBatchFetcher.submit(
        {
          intent: "delete-dependencies-batch",
          dependencyIds: dependencyIds.join(","),
        },
        {
          method: "post",
          action: `/plugins/${plugin.id}`,
        },
      );
    },
    [deleteBatchFetcher, plugin.id],
  );

  // Inject callbacks into orchestrator nodes
  const graphData = useMemo(
    () => ({
      ...rawGraphData,
      nodes: rawGraphData.nodes.map((node) => {
        if (node.type === "orchestrator") {
          return {
            ...node,
            data: {
              ...node.data,
              onReorderStep: handleReorderStep,
              onDeleteStep: handleDeleteStep,
            },
          };
        }
        return node;
      }),
    }),
    [rawGraphData, handleReorderStep, handleDeleteStep],
  );

  // Merge saved positions from localStorage
  const graphDataWithPositions = useMemo(() => {
    const savedPositions = loadGraphPositions(plugin.id);
    if (!savedPositions) return graphData;
    return {
      ...graphData,
      nodes: graphData.nodes.map((node) => {
        const saved = savedPositions[node.id];
        if (saved) {
          return { ...node, position: saved };
        }
        return node;
      }),
    };
  }, [graphData, plugin.id]);

  const [resetCounter, setResetCounter] = useState(0);

  const handleNodeDragStop = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      saveGraphPositions(plugin.id, positions);
    },
    [plugin.id],
  );

  const handleResetLayout = useCallback(() => {
    clearGraphPositions(plugin.id);
    setResetCounter((c) => c + 1);
  }, [plugin.id]);

  const handleConnect = useCallback(
    (sourceId: string, targetId: string, sourceHandle?: string) => {
      setDeleteError(null);
      const formData: Record<string, string> = {
        intent: "add-dependency",
        sourceId,
        targetId,
      };
      if (sourceHandle) {
        const order = sourceHandle.replace("step-", "");
        formData.order = order;
      }
      addDependencyFetcher.submit(formData, { method: "post" });
    },
    [addDependencyFetcher],
  );

  const handleEdgeClick = useCallback(
    (dependencyId: string) => {
      setDeleteError(null);
      removeDependencyFetcher.submit(
        { intent: "remove-dependency", dependencyId },
        { method: "post" },
      );
    },
    [removeDependencyFetcher],
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
          <generateFetcher.Form method="post">
            <input type="hidden" name="intent" value="generate-plugin" />
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
            onSubmit={(event) => {
              const confirmed = window.confirm(
                `Plugin "${plugin.name}" and all its components will be deleted. Are you sure?`,
              );
              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="intent" value="delete-plugin" />
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
              nodes={graphDataWithPositions.nodes}
              edges={graphDataWithPositions.edges}
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
              onNodeDragStop={handleNodeDragStop}
              onResetLayout={handleResetLayout}
              resetKey={resetCounter}
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
