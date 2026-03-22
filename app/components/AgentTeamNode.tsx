import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { useFetcher } from "react-router";
import InlineEditableField from "./InlineEditableField";

// 注: AgentTeamNodeはHandleコンポーネントを持たない。AgentTeamノードは有効な
// エッジ接続ターゲットではないため（DependencyGraphのisValidConnectionが
// agentteam-プレフィックスを持つノードを含む接続を拒否する）。

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
