import type { NodeProps } from "@xyflow/react";

// Note: AgentTeamNode does not have Handle components because AgentTeam nodes
// are not valid edge connection targets (isValidConnection in DependencyGraph
// rejects any connection involving agentteam- prefixed nodes).

interface AgentTeamNodeData {
  label: string;
  description: string | null;
  orchestratorName: string;
  [key: string]: unknown;
}

export default function AgentTeamNode({
  data,
}: NodeProps & { data: AgentTeamNodeData }) {
  const { label, description, orchestratorName } =
    data as AgentTeamNodeData;

  return (
    <div className="agentteam-node">
      <div className="agentteam-node-header">
        <span className="agentteam-node-badge">AGENT TEAM</span>
      </div>
      <div className="agentteam-node-title">{label}</div>
      {description ? (
        <div className="agentteam-node-description">{description}</div>
      ) : (
        <div className="agentteam-node-description agentteam-node-description-empty">
          (no description)
        </div>
      )}
      <div className="agentteam-node-orchestrator">
        Orchestrator: {orchestratorName}
      </div>
    </div>
  );
}
