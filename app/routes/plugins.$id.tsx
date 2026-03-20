import React, { Suspense, useState, useEffect, useCallback } from "react";
import { Link, Form, data, useFetcher } from "react-router";
import { getPlugin } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id";
import type { Node, Edge } from "@xyflow/react";
import type { GenerationValidationError } from "../lib/generator/types";

const DependencyGraph = React.lazy(
  () => import("../components/DependencyGraph"),
);

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

type PluginComponent = Awaited<
  ReturnType<typeof getPlugin>
> extends { components: (infer C)[] } | null
  ? C
  : never;

function buildGraphData(components: PluginComponent[]): {
  nodes: Node[];
  edges: Edge[];
} {
  if (components.length === 0) return { nodes: [], edges: [] };

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
      for (const dep of c.dependenciesFrom) {
        edges.push({
          id: dep.id,
          source: c.id,
          target: dep.targetId,
          deletable: true,
        });
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
    const layerIndex = components
      .filter((c) => (depth.get(c.id) ?? 0) === d)
      .indexOf(components.find((c) => c.id === componentId)!);
    return { x: layerIndex * HORIZONTAL_SPACING, y: d * VERTICAL_SPACING };
  }

  const nodes: Node[] = components.map((c, i) => ({
    id: c.id,
    position: getPosition(c.id, i),
    data: {
      label: c.skillConfig?.name ?? c.agentConfig?.name ?? "(unnamed)",
    },
    style: {
      background: c.type === "SKILL" ? "#dbeafe" : "#fce7f3",
      border:
        c.type === "SKILL" ? "1px solid #93c5fd" : "1px solid #f9a8d4",
      borderRadius: "0.375rem",
      padding: "8px 16px",
    },
  }));

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
  const addDependencyFetcher = useFetcher();
  const removeDependencyFetcher = useFetcher();

  const skills = plugin.components.filter((c) => c.type === "SKILL");
  const agents = plugin.components.filter((c) => c.type === "AGENT");

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const generateResult = generateFetcher.data;
  const isGenerating = generateFetcher.state !== "idle";

  const graphData =
    plugin.components.length > 0 ? buildGraphData(plugin.components) : null;

  const handleConnect = useCallback(
    (sourceId: string, targetId: string) => {
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
      removeDependencyFetcher.submit(null, {
        method: "post",
        action: `/plugins/${plugin.id}/dependencies/${dependencyId}/destroy`,
      });
    },
    [removeDependencyFetcher, plugin.id],
  );

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
        <div className="component-list-header">
          <h3>Skills ({skills.length})</h3>
          <Link
            to={`/plugins/${plugin.id}/components/new`}
            className="btn btn-primary btn-sm"
          >
            New Component
          </Link>
        </div>
        {skills.length === 0 ? (
          <p className="card-description">No skills yet.</p>
        ) : (
          skills.map((component) => (
            <Link
              key={component.id}
              to={`/plugins/${plugin.id}/components/${component.id}`}
              className="component-item component-item-link"
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
            </Link>
          ))
        )}
      </div>

      <div className="component-list">
        <h3>Agents ({agents.length})</h3>
        {agents.length === 0 ? (
          <p className="card-description">No agents yet.</p>
        ) : (
          agents.map((component) => (
            <Link
              key={component.id}
              to={`/plugins/${plugin.id}/components/${component.id}`}
              className="component-item component-item-link"
            >
              <div>
                <span className="component-item-name">
                  {component.agentConfig?.name ?? "(unnamed)"}
                </span>
              </div>
              <span className="badge badge-agent">AGENT</span>
            </Link>
          ))
        )}
      </div>

      <div className="component-list">
        <div className="component-list-header">
          <h3>Agent Teams ({plugin.agentTeams.length})</h3>
          <Link
            to={`/plugins/${plugin.id}/agent-teams/new`}
            className="btn btn-primary btn-sm"
          >
            New Agent Team
          </Link>
        </div>
        {plugin.agentTeams.length === 0 ? (
          <p className="card-description">No agent teams yet.</p>
        ) : (
          plugin.agentTeams.map((team) => (
            <Link
              key={team.id}
              to={`/plugins/${plugin.id}/agent-teams/${team.id}`}
              className="component-item component-item-link"
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
            </Link>
          ))
        )}
      </div>

      {isClient && graphData && (
        <div className="dependency-graph-section">
          <h3>Dependency Graph</h3>
          <Suspense fallback={<div>Loading graph...</div>}>
            <DependencyGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              pluginId={plugin.id}
              components={graphComponents}
              onConnect={handleConnect}
              onEdgeClick={handleEdgeClick}
            />
          </Suspense>
        </div>
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
