import type { NodeProps } from "@xyflow/react";

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
  data,
}: NodeProps & { data: AgentTeamNodeData }) {
  const { label, description, orchestratorName } = data as AgentTeamNodeData;

  return (
    <div className="agentteam-node">
      <div className="agentteam-node-header">
        <span className="agentteam-node-badge">AGENT TEAM</span>
      </div>
      <div className="agentteam-node-title">{label || "(unnamed)"}</div>
      <div
        className={`agentteam-node-description${!description ? " agentteam-node-description-empty" : ""}`}
      >
        {description || "(no description)"}
      </div>
      <div className="agentteam-node-orchestrator">
        Orchestrator: {orchestratorName}
      </div>
    </div>
  );
}
