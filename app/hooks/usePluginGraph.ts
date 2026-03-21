import { useState, useEffect, useCallback, useMemo } from "react";
import { useFetcher } from "react-router";
import {
  buildGraphData,
  type AgentTeamGraphData,
} from "../lib/build-graph-data";
import {
  loadGraphPositions,
  saveGraphPositions,
  clearGraphPositions,
} from "../lib/graph-positions";
import type { getPlugin } from "../lib/plugins.server";

export type Plugin = NonNullable<Awaited<ReturnType<typeof getPlugin>>>;

export interface ModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  componentType?: "SKILL" | "AGENT";
  componentId?: string;
}

export interface AgentTeamModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  teamId?: string;
}

export interface FilesModalState {
  isOpen: boolean;
  componentId?: string;
}

export interface MembersModalState {
  isOpen: boolean;
  teamId?: string;
}

export interface UsePluginGraphParams {
  plugin: Plugin;
  modalState: ModalState;
  onModalStateChange: (state: ModalState) => void;
  membersModalState: MembersModalState;
  onMembersModalStateChange: (state: MembersModalState) => void;
}

export function usePluginGraph({
  plugin,
  modalState,
  onModalStateChange,
  membersModalState,
  onMembersModalStateChange,
}: UsePluginGraphParams) {
  const addDependencyFetcher = useFetcher<{
    success?: boolean;
    errors?: { dependency: string };
  }>();
  const removeDependencyFetcher = useFetcher();
  const componentFetcher = useFetcher<{
    success?: boolean;
    componentId?: string;
    errors?: Record<string, string>;
  }>();
  const deleteFetcher = useFetcher<{
    success?: boolean;
    error?: string;
  }>();
  const agentTeamFetcher = useFetcher<{
    success?: boolean;
    teamId?: string;
    errors?: Record<string, string>;
  }>();
  const reorderDependencyFetcher = useFetcher();
  const deleteBatchFetcher = useFetcher();

  const [agentTeamModalState, setAgentTeamModalState] =
    useState<AgentTeamModalState>({
      isOpen: false,
      mode: "create",
    });
  const [filesModalState, setFilesModalState] = useState<FilesModalState>({
    isOpen: false,
  });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // Watch deleteFetcher for error messages
  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data?.error) {
      setDeleteError(deleteFetcher.data.error);
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  const entryPointSkills = useMemo(
    () =>
      plugin.components
        .filter(
          (c) =>
            c.type === "SKILL" && c.skillConfig?.skillType === "ENTRY_POINT",
        )
        .map((c) => ({
          id: c.id,
          skillConfig: c.skillConfig ? { name: c.skillConfig.name } : null,
        })),
    [plugin.components],
  );

  const agentTeamsForGraph: AgentTeamGraphData[] = useMemo(
    () =>
      plugin.agentTeams.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        orchestratorName:
          team.orchestrator.skillConfig?.name ?? "(unnamed)",
      })),
    [plugin.agentTeams],
  );

  const rawGraphData = useMemo(
    () =>
      plugin.components.length > 0 || plugin.agentTeams.length > 0
        ? buildGraphData(plugin.components, agentTeamsForGraph)
        : { nodes: [], edges: [] },
    [plugin.components, agentTeamsForGraph],
  );

  const handleReorderStep = useCallback(
    (dependencyId: string, direction: "up" | "down") => {
      reorderDependencyFetcher.submit(
        { intent: "reorder-dependency", dependencyId, direction },
        { method: "post" },
      );
    },
    [reorderDependencyFetcher],
  );

  const handleDeleteStep = useCallback(
    (dependencyIds: string[]) => {
      const confirmed = window.confirm(
        "Remove this step and its dependencies?",
      );
      if (!confirmed) return;
      deleteBatchFetcher.submit(
        {
          intent: "delete-dependencies-batch",
          dependencyIds: dependencyIds.join(","),
        },
        {
          method: "post",
          action: `/plugins/${plugin.id}`,
        },
      );
    },
    [deleteBatchFetcher, plugin.id],
  );

  // Inject callbacks and IDs into nodes
  const graphData = useMemo(
    () => ({
      ...rawGraphData,
      nodes: rawGraphData.nodes.map((node) => {
        if (node.type === "orchestrator") {
          return {
            ...node,
            data: {
              ...node.data,
              onReorderStep: handleReorderStep,
              onDeleteStep: handleDeleteStep,
              componentId: node.id,
              pluginId: plugin.id,
            },
          };
        }
        if (node.type === "skill" || node.type === "agent") {
          return {
            ...node,
            data: {
              ...node.data,
              componentId: node.id,
              pluginId: plugin.id,
            },
          };
        }
        if (node.type === "agentteam") {
          const teamId = node.id.replace("agentteam-", "");
          return {
            ...node,
            data: {
              ...node.data,
              teamId,
              pluginId: plugin.id,
            },
          };
        }
        return node;
      }),
    }),
    [rawGraphData, handleReorderStep, handleDeleteStep, plugin.id],
  );

  // Merge saved positions from localStorage
  const graphDataWithPositions = useMemo(() => {
    const savedPositions = loadGraphPositions(plugin.id);
    if (!savedPositions) return graphData;
    return {
      ...graphData,
      nodes: graphData.nodes.map((node) => {
        const saved = savedPositions[node.id];
        if (saved) {
          return { ...node, position: saved };
        }
        return node;
      }),
    };
  }, [graphData, plugin.id]);

  const [resetCounter, setResetCounter] = useState(0);

  const handleNodeDragStop = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      saveGraphPositions(plugin.id, positions);
    },
    [plugin.id],
  );

  const handleResetLayout = useCallback(() => {
    clearGraphPositions(plugin.id);
    setResetCounter((c) => c + 1);
  }, [plugin.id]);

  const handleConnect = useCallback(
    (sourceId: string, targetId: string, sourceHandle?: string) => {
      setDeleteError(null);
      const formData: Record<string, string> = {
        intent: "add-dependency",
        sourceId,
        targetId,
      };
      if (sourceHandle) {
        const order = sourceHandle.replace("step-", "");
        formData.order = order;
      }
      addDependencyFetcher.submit(formData, { method: "post" });
    },
    [addDependencyFetcher],
  );

  const handleEdgeClick = useCallback(
    (dependencyId: string) => {
      setDeleteError(null);
      removeDependencyFetcher.submit(
        { intent: "remove-dependency", dependencyId },
        { method: "post" },
      );
    },
    [removeDependencyFetcher],
  );

  const handleNodeDoubleClick = useCallback(
    (componentId: string) => {
      const comp = plugin.components.find((c) => c.id === componentId);
      if (comp) {
        setDeleteError(null);
        onModalStateChange({
          isOpen: true,
          mode: "edit",
          componentId,
        });
      }
    },
    [plugin.components, onModalStateChange],
  );

  const handleCreateComponent = useCallback(
    (type: "SKILL" | "AGENT") => {
      setDeleteError(null);
      onModalStateChange({
        isOpen: true,
        mode: "create",
        componentType: type,
      });
    },
    [onModalStateChange],
  );

  const handleDeleteComponent = useCallback(
    (componentId: string) => {
      setDeleteError(null);
      deleteFetcher.submit(
        { intent: "delete-component", componentId },
        { method: "post", action: `/plugins/${plugin.id}` },
      );
    },
    [deleteFetcher, plugin.id],
  );

  const handleManageFiles = useCallback((componentId: string) => {
    setDeleteError(null);
    setFilesModalState({ isOpen: true, componentId });
  }, []);

  const handleFilesModalClose = useCallback(() => {
    setFilesModalState({ isOpen: false });
  }, []);

  const handleManageMembers = useCallback(
    (teamId: string) => {
      setDeleteError(null);
      onMembersModalStateChange({ isOpen: true, teamId });
    },
    [onMembersModalStateChange],
  );

  const handleMembersModalClose = useCallback(() => {
    onMembersModalStateChange({ isOpen: false });
  }, [onMembersModalStateChange]);

  const handleModalClose = useCallback(() => {
    onModalStateChange({ isOpen: false, mode: "create" });
  }, [onModalStateChange]);

  const handleAgentTeamDoubleClick = useCallback(
    (teamId: string) => {
      const team = plugin.agentTeams.find((t) => t.id === teamId);
      if (team) {
        setDeleteError(null);
        setAgentTeamModalState({
          isOpen: true,
          mode: "edit",
          teamId,
        });
      }
    },
    [plugin.agentTeams],
  );

  const handleCreateAgentTeam = useCallback(() => {
    setDeleteError(null);
    setAgentTeamModalState({
      isOpen: true,
      mode: "create",
    });
  }, []);

  const handleDeleteAgentTeam = useCallback(
    (teamId: string) => {
      setDeleteError(null);
      deleteFetcher.submit(
        { intent: "delete-agent-team", teamId },
        { method: "post", action: `/plugins/${plugin.id}` },
      );
    },
    [deleteFetcher, plugin.id],
  );

  const handleAgentTeamModalClose = useCallback(() => {
    setAgentTeamModalState({ isOpen: false, mode: "create" });
  }, []);

  // Build initialValues for edit mode
  const modalInitialValues =
    modalState.mode === "edit" && modalState.componentId
      ? (() => {
          const comp = plugin.components.find(
            (c) => c.id === modalState.componentId,
          );
          if (!comp) return undefined;
          return {
            componentId: comp.id,
            name:
              comp.skillConfig?.name ?? comp.agentConfig?.name ?? "",
            description:
              comp.skillConfig?.description ??
              comp.agentConfig?.description ??
              "",
            skillType: comp.skillConfig?.skillType ?? "",
            type: comp.type,
          };
        })()
      : undefined;

  // Build initialValues for agent team edit mode
  const agentTeamModalInitialValues =
    agentTeamModalState.mode === "edit" && agentTeamModalState.teamId
      ? (() => {
          const team = plugin.agentTeams.find(
            (t) => t.id === agentTeamModalState.teamId,
          );
          if (!team) return undefined;
          return {
            teamId: team.id,
            name: team.name,
            description: team.description ?? "",
            orchestratorName:
              team.orchestrator.skillConfig?.name ?? "(unnamed)",
          };
        })()
      : undefined;

  const graphComponents = plugin.components.map((c) => ({
    id: c.id,
    type: c.type,
    skillConfig: c.skillConfig ? { skillType: c.skillConfig.skillType } : null,
  }));

  // View computed values
  const filesModalComponentName = useMemo(() => {
    if (!filesModalState.componentId) return "(unknown)";
    const comp = plugin.components.find(
      (c) => c.id === filesModalState.componentId,
    );
    if (!comp) return "(unknown)";
    return (
      comp.skillConfig?.name ?? comp.agentConfig?.name ?? "(unnamed)"
    );
  }, [filesModalState.componentId, plugin.components]);

  const filesModalFiles = useMemo(() => {
    if (!filesModalState.componentId) return [];
    return (
      plugin.components.find(
        (c) => c.id === filesModalState.componentId,
      )?.files ?? []
    );
  }, [filesModalState.componentId, plugin.components]);

  const membersModalTeamName = useMemo(() => {
    if (!membersModalState.teamId) return "(unknown)";
    const team = plugin.agentTeams.find(
      (t) => t.id === membersModalState.teamId,
    );
    return team?.name ?? "(unknown)";
  }, [membersModalState.teamId, plugin.agentTeams]);

  const membersModalMembers = useMemo(() => {
    if (!membersModalState.teamId) return [];
    return (
      plugin.agentTeams.find(
        (t) => t.id === membersModalState.teamId,
      )?.members ?? []
    );
  }, [membersModalState.teamId, plugin.agentTeams]);

  const membersModalAgentComponents = useMemo(
    () =>
      plugin.components
        .filter((c) => c.type === "AGENT")
        .map((c) => ({
          id: c.id,
          agentConfig: c.agentConfig ? { name: c.agentConfig.name } : null,
        })),
    [plugin.components],
  );

  return {
    // State
    isClient,
    agentTeamModalState,
    filesModalState,
    deleteError,
    resetCounter,

    // Computed data
    graphDataWithPositions,
    entryPointSkills,
    agentTeamsForGraph,
    graphComponents,
    modalInitialValues,
    agentTeamModalInitialValues,

    // View computed values
    filesModalComponentName,
    filesModalFiles,
    membersModalTeamName,
    membersModalMembers,
    membersModalAgentComponents,

    // Fetchers
    addDependencyFetcher,
    componentFetcher,
    agentTeamFetcher,

    // Handlers
    handleConnect,
    handleEdgeClick,
    handleNodeDoubleClick,
    handleCreateComponent,
    handleDeleteComponent,
    handleManageFiles,
    handleFilesModalClose,
    handleManageMembers,
    handleMembersModalClose,
    handleModalClose,
    handleAgentTeamDoubleClick,
    handleCreateAgentTeam,
    handleDeleteAgentTeam,
    handleAgentTeamModalClose,
    handleNodeDragStop,
    handleResetLayout,
    handleReorderStep,
    handleDeleteStep,
  };
}
