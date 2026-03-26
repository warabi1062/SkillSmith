// SKILL (WORKER / WORKER_WITH_SUB_AGENT / WORKER_WITH_AGENT_TEAM) 用サイドパネル
import type { AgentConfigFields, TeammateFields, WorkerStepFields, SectionFields } from "../SidePanel";
import SidePanelLayout from "./parts/SidePanelLayout";
import ReadonlyField from "./parts/ReadonlyField";
import ContentBlock from "./parts/ContentBlock";
import SectionDetails from "./parts/SectionDetails";
import StepDetailsList from "./parts/StepDetailsList";
import ToolTagList from "./parts/ToolTagList";

export interface SkillSidePanelProps {
  name: string;
  description: string | null;
  content: string;
  input: string;
  output: string;
  skillType: string | null;
  allowedTools: string | null;
  hasAgentConfig: boolean;
  agentConfig: AgentConfigFields | null;
  teammates: TeammateFields[] | null;
  workerSteps: WorkerStepFields[] | null;
  workerSections: SectionFields[] | null;
  onClose: () => void;
}

// AgentConfig表示セクション
function AgentConfigSection({ agentConfig }: { agentConfig: AgentConfigFields }) {
  return (
    <div className="side-panel-agent-config-section">
      <div className="side-panel-agent-config-header">
        <h4>Agent Config</h4>
      </div>

      <div className="form-group">
        <label>Model</label>
        <div className="side-panel-agent-model">
          <span className="side-panel-agent-model-badge">
            {agentConfig.model || "(not set)"}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label>Tools</label>
        <div className="side-panel-agent-tools">
          {agentConfig.tools.length > 0 ? agentConfig.tools.map((tool) => (
            <span key={tool} className="side-panel-agent-tool-tag">{tool}</span>
          )) : "(not set)"}
        </div>
      </div>

      {agentConfig.description || (agentConfig.sections && agentConfig.sections.length > 0) ? (
        <div className="side-panel-orch-structure">
          {agentConfig.description && (
            <ReadonlyField label="Agent Description" value={agentConfig.description} />
          )}
          {agentConfig.sections?.filter(s => s.position === "before-steps").map(s => (
            <SectionDetails key={s.heading} heading={s.heading} body={s.body} />
          ))}
          {agentConfig.sections?.filter(s => s.position === "after-steps").map(s => (
            <SectionDetails key={s.heading} heading={s.heading} body={s.body} />
          ))}
        </div>
      ) : (
        <ContentBlock label="Agent Content" content={agentConfig.agentContent} />
      )}
    </div>
  );
}

// Teammates表示セクション
function TeammatesSection({ teammates }: { teammates: TeammateFields[] }) {
  return (
    <div className="side-panel-teammates-section">
      <div className="side-panel-teammates-header">
        <h4>Teammates</h4>
      </div>
      {teammates.map((mate) => (
        <details key={mate.name} className="side-panel-teammate">
          <summary className="side-panel-teammate-summary">
            <span className="side-panel-teammate-name">{mate.name}</span>
            <span className="side-panel-teammate-role">{mate.role}</span>
          </summary>
          <div className="side-panel-teammate-details">
            {mate.pollingTarget && (
              <div className="side-panel-teammate-meta">
                polling → {mate.pollingTarget}
              </div>
            )}
            {mate.statusCheckResponder && (
              <div className="side-panel-teammate-meta">
                status_check responder
              </div>
            )}
            <div className="side-panel-teammate-steps">
              <StepDetailsList steps={mate.steps} defaultOpen={false} />
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

export default function SkillSidePanel({
  name,
  description,
  content,
  input,
  output,
  skillType,
  allowedTools,
  hasAgentConfig,
  agentConfig,
  teammates,
  workerSteps,
  workerSections,
  onClose,
}: SkillSidePanelProps) {
  const isWorkerWithSubAgent = skillType === "WORKER_WITH_SUB_AGENT";
  const isWorkerWithAgentTeam = skillType === "WORKER_WITH_AGENT_TEAM";

  const showWorkerSteps = isWorkerWithSubAgent && workerSteps && workerSteps.length > 0;
  const showAgentConfig = isWorkerWithSubAgent && hasAgentConfig && agentConfig;
  const showTeammates = isWorkerWithAgentTeam && teammates && teammates.length > 0;

  return (
    <SidePanelLayout badgeLabel="SKILL" onClose={onClose}>
      <ReadonlyField label="Name" value={name} />
      <ReadonlyField label="Description" value={description || "(no description)"} />

      {skillType && <ReadonlyField label="Skill Type" value={skillType} />}
      {allowedTools && <ReadonlyField label="Allowed Tools" value={allowedTools} />}

      {showWorkerSteps ? (
        <div className="side-panel-orch-structure">
          {workerSections?.filter(s => s.position === "before-steps").map(s => (
            <SectionDetails key={s.heading} heading={s.heading} body={s.body} />
          ))}

          <label>Worker Steps</label>
          <div className="side-panel-orch-steps">
            <StepDetailsList steps={workerSteps} />
          </div>

          {workerSections?.filter(s => s.position === "after-steps").map(s => (
            <SectionDetails key={s.heading} heading={s.heading} body={s.body} />
          ))}
        </div>
      ) : (
        <ContentBlock label="Content" content={content} />
      )}

      {input && <ReadonlyField label="Input" value={input} />}
      {output && <ReadonlyField label="Output" value={output} />}

      {showAgentConfig && <AgentConfigSection agentConfig={agentConfig} />}
      {showTeammates && <TeammatesSection teammates={teammates} />}
    </SidePanelLayout>
  );
}
