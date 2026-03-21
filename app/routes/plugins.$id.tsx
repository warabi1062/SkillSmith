import { useState } from "react";
import { Link, Form, data, useFetcher } from "react-router";
import { getPlugin } from "../lib/plugins.server";
import type { Route } from "./+types/plugins.$id";
import type { GenerationValidationError } from "../lib/generator/types";
import type { ExportResult } from "../lib/exporter.server";
import PluginGraphSection from "../components/PluginGraphSection";

export { action } from "./plugins.$id.action.server";

interface ModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  componentType?: "SKILL" | "AGENT";
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

  const skills = plugin.components.filter((c) => c.type === "SKILL");
  const agents = plugin.components.filter((c) => c.type === "AGENT");

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    mode: "create",
  });
  const [membersModalState, setMembersModalState] = useState<MembersModalState>({
    isOpen: false,
  });

  const generateResult = generateFetcher.data;
  const isGenerating = generateFetcher.state !== "idle";
  const exportResult = exportFetcher.data;
  const isExporting = exportFetcher.state !== "idle";

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
              onClick={() => setModalState({ isOpen: true, mode: "edit", componentId: component.id })}
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
              onClick={() => setModalState({ isOpen: true, mode: "edit", componentId: component.id })}
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
              onClick={() => setMembersModalState({ isOpen: true, teamId: team.id })}
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

      <PluginGraphSection
        plugin={plugin}
        modalState={modalState}
        onModalStateChange={setModalState}
        membersModalState={membersModalState}
        onMembersModalStateChange={setMembersModalState}
      />

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
