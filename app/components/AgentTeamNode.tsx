import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useFetcher } from "react-router";
import InlineEditableField from "./InlineEditableField";

// Note: AgentTeamNode does not have Handle components because AgentTeam nodes
// are not valid edge connection targets (isValidConnection in DependencyGraph
// rejects any connection involving agentteam- prefixed nodes).

interface AgentTeamNodeData {
  label: string;
  description: string | null;
  orchestratorName: string;
  teamId: string;
  pluginId: string;
  [key: string]: unknown;
}

export default function AgentTeamNode({
  id,
  data,
}: NodeProps & { data: AgentTeamNodeData }) {
  const { label, description, orchestratorName, teamId, pluginId } =
    data as AgentTeamNodeData;
  const fetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const { setNodes } = useReactFlow();

  const handleEditStart = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, draggable: false } : n)),
    );
  }, [id, setNodes]);

  const handleEditEnd = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, draggable: true } : n)),
    );
  }, [id, setNodes]);

  const handleSaveName = useCallback(
    (name: string) => {
      fetcher.submit(
        {
          intent: "update-agent-team",
          teamId,
          name,
          description: description ?? "",
        },
        { method: "post", action: `/plugins/${pluginId}` },
      );
    },
    [fetcher, teamId, description, pluginId],
  );

  const handleSaveDescription = useCallback(
    (newDescription: string) => {
      fetcher.submit(
        {
          intent: "update-agent-team",
          teamId,
          name: label,
          description: newDescription,
        },
        { method: "post", action: `/plugins/${pluginId}` },
      );
    },
    [fetcher, teamId, label, pluginId],
  );

  return (
    <div className="agentteam-node">
      <div className="agentteam-node-header">
        <span className="agentteam-node-badge">AGENT TEAM</span>
      </div>
      <InlineEditableField
        value={label}
        onSave={handleSaveName}
        isLoading={isSaving}
        error={null}
        placeholder="(unnamed)"
        className="agentteam-node-title"
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />
      <InlineEditableField
        value={description ?? ""}
        onSave={handleSaveDescription}
        isLoading={isSaving}
        error={null}
        placeholder="(no description)"
        multiline
        className="agentteam-node-description"
        onEditStart={handleEditStart}
        onEditEnd={handleEditEnd}
      />
      <div className="agentteam-node-orchestrator">
        Orchestrator: {orchestratorName}
      </div>
    </div>
  );
}
