import React, { Suspense } from "react";
import {
  usePluginGraph,
  type Plugin,
} from "../hooks/usePluginGraph";
import SidePanel from "./SidePanel";

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

      {selectedNodeData && (
        <SidePanel
          componentType={selectedNodeData.componentType}
          name={selectedNodeData.name}
          description={selectedNodeData.description}
          content={selectedNodeData.content}
          input={selectedNodeData.input}
          output={selectedNodeData.output}
          skillType={selectedNodeData.skillType}
          allowedTools={selectedNodeData.allowedTools}
          argumentHint={selectedNodeData.argumentHint}
          hasAgentConfig={selectedNodeData.hasAgentConfig}
          agentConfig={selectedNodeData.agentConfig}
          teammates={selectedNodeData.teammates}
          steps={selectedNodeData.steps}
          sections={selectedNodeData.sections}
          onClose={handleSidePanelClose}
        />
      )}
    </>
  );
}
