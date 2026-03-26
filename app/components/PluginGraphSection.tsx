import React, { Suspense } from "react";
import {
  usePluginGraph,
  type Plugin,
} from "../hooks/usePluginGraph";
import OrchestratorSidePanel from "./side-panel/OrchestratorSidePanel";
import SkillSidePanel from "./side-panel/SkillSidePanel";
import InlineSidePanel from "./side-panel/InlineSidePanel";

const DependencyGraph = React.lazy(
  () => import("../components/DependencyGraph"),
);

interface PluginGraphSectionProps {
  plugin: Plugin;
}

export default function PluginGraphSection({
  plugin,
}: PluginGraphSectionProps) {
  const {
    isClient,
    resetCounter,
    graphDataWithPositions,
    handleNodeDragStop,
    handleResetLayout,
    autoLayoutPending,
    handleAutoLayoutApplied,
    handlePositionsPersist,
    selectedNodeData,
    handleNodeClick,
    handleSidePanelClose,
  } = usePluginGraph({
    plugin,
  });

  if (!isClient) return null;

  // componentType に応じたサイドパネルを描画
  const renderSidePanel = () => {
    if (!selectedNodeData) return null;
    const d = selectedNodeData;

    switch (d.componentType) {
      case "ORCHESTRATOR":
        return (
          <OrchestratorSidePanel
            name={d.name}
            description={d.description}
            content={d.content}
            input={d.input}
            output={d.output}
            skillType={d.skillType}
            allowedTools={d.allowedTools}
            argumentHint={d.argumentHint}
            steps={d.steps}
            sections={d.sections}
            onClose={handleSidePanelClose}
          />
        );
      case "INLINE":
        return (
          <InlineSidePanel
            name={d.name}
            description={d.description}
            content={d.content}
            input={d.input}
            output={d.output}
            inlineSteps={d.inlineSteps}
            inlineTools={d.inlineTools}
            onClose={handleSidePanelClose}
          />
        );
      case "SKILL":
        return (
          <SkillSidePanel
            name={d.name}
            description={d.description}
            content={d.content}
            input={d.input}
            output={d.output}
            skillType={d.skillType}
            allowedTools={d.allowedTools}
            hasAgentConfig={d.hasAgentConfig}
            agentConfig={d.agentConfig}
            teammates={d.teammates}
            workerSteps={d.workerSteps}
            workerSections={d.workerSections}
            onClose={handleSidePanelClose}
          />
        );
    }
  };

  return (
    <>
      <div className="dependency-graph-section">
        <h3>Dependency Graph</h3>
        <div className="dependency-graph-content">
          <div className="dependency-graph-main">
            <Suspense fallback={<div>Loading graph...</div>}>
              <DependencyGraph
                nodes={graphDataWithPositions.nodes}
                edges={graphDataWithPositions.edges}
                onNodeDragStop={handleNodeDragStop}
                onResetLayout={handleResetLayout}
                onPositionsPersist={handlePositionsPersist}
                onNodeClick={handleNodeClick}
                onPaneClickCallback={handleSidePanelClose}
                autoLayoutPending={autoLayoutPending}
                onAutoLayoutApplied={handleAutoLayoutApplied}
                resetKey={resetCounter}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {renderSidePanel()}
    </>
  );
}
