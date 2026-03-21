import React, { Suspense } from "react";
import {
  usePluginGraph,
  type Plugin,
  type ModalState,
  type MembersModalState,
} from "../hooks/usePluginGraph";

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

interface PluginGraphSectionProps {
  plugin: Plugin;
  modalState: ModalState;
  onModalStateChange: (state: ModalState) => void;
  membersModalState: MembersModalState;
  onMembersModalStateChange: (state: MembersModalState) => void;
}

export default function PluginGraphSection({
  plugin,
  modalState,
  onModalStateChange,
  membersModalState,
  onMembersModalStateChange,
}: PluginGraphSectionProps) {
  const {
    isClient,
    agentTeamModalState,
    filesModalState,
    deleteError,
    resetCounter,
    graphDataWithPositions,
    entryPointSkills,
    agentTeamsForGraph,
    graphComponents,
    filesModalComponentName,
    filesModalFiles,
    membersModalTeamName,
    membersModalMembers,
    membersModalAgentComponents,
    addDependencyFetcher,
    componentFetcher,
    agentTeamFetcher,
    handleConnect,
    handleEdgeClick,
    handleCreateComponent,
    handleDeleteComponent,
    handleManageFiles,
    handleFilesModalClose,
    handleManageMembers,
    handleMembersModalClose,
    handleModalClose,
    handleCreateAgentTeam,
    handleDeleteAgentTeam,
    handleAgentTeamModalClose,
    handleNodeDragStop,
    handleResetLayout,
    autoLayoutPending,
    handleAutoLayoutApplied,
    handlePositionsPersist,
  } = usePluginGraph({
    plugin,
    modalState,
    onModalStateChange,
    membersModalState,
    onMembersModalStateChange,
  });

  if (!isClient) return null;

  return (
    <>
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
            onCreateComponent={handleCreateComponent}
            onDeleteComponent={handleDeleteComponent}
            onManageFiles={handleManageFiles}
            onCreateAgentTeam={handleCreateAgentTeam}
            onDeleteAgentTeam={handleDeleteAgentTeam}
            onManageMembers={handleManageMembers}
            onNodeDragStop={handleNodeDragStop}
            onResetLayout={handleResetLayout}
            onPositionsPersist={handlePositionsPersist}
            autoLayoutPending={autoLayoutPending}
            onAutoLayoutApplied={handleAutoLayoutApplied}
            resetKey={resetCounter}
          />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <ComponentFormModal
          isOpen={modalState.isOpen}
          onClose={handleModalClose}
          componentType={modalState.componentType}
          fetcher={componentFetcher}
          pluginId={plugin.id}
        />
      </Suspense>

      {filesModalState.isOpen && filesModalState.componentId && (
        <Suspense fallback={null}>
          <FilesManagementModal
            isOpen={filesModalState.isOpen}
            onClose={handleFilesModalClose}
            componentId={filesModalState.componentId}
            componentName={filesModalComponentName}
            files={filesModalFiles}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <AgentTeamFormModal
          isOpen={agentTeamModalState.isOpen}
          onClose={handleAgentTeamModalClose}
          entryPointSkills={entryPointSkills}
          fetcher={agentTeamFetcher}
          pluginId={plugin.id}
        />
      </Suspense>

      {membersModalState.isOpen && membersModalState.teamId && (
        <Suspense fallback={null}>
          <AgentTeamMembersModal
            isOpen={membersModalState.isOpen}
            onClose={handleMembersModalClose}
            pluginId={plugin.id}
            teamId={membersModalState.teamId}
            teamName={membersModalTeamName}
            members={membersModalMembers}
            agentComponents={membersModalAgentComponents}
          />
        </Suspense>
      )}
    </>
  );
}
