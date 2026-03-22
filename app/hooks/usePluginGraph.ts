import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useFetcher } from "react-router";
import type { Node } from "@xyflow/react";
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
  mode: "create";
  componentType?: "SKILL" | "AGENT";
}

export interface AgentTeamModalState {
  isOpen: boolean;
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

  // 自動レイアウトフラグ: 再レイアウトをトリガーすべきfetcherが完了したときにtrueに設定
  const pendingAutoLayout = useRef(false);
  const prevAddState = useRef(addDependencyFetcher.state);
  const prevReorderState = useRef(reorderDependencyFetcher.state);
  const prevDeleteBatchState = useRef(deleteBatchFetcher.state);

  useEffect(() => {
    if (prevAddState.current === "loading" && addDependencyFetcher.state === "idle") {
      pendingAutoLayout.current = true;
    }
    prevAddState.current = addDependencyFetcher.state;
  }, [addDependencyFetcher.state]);

  useEffect(() => {
    if (prevReorderState.current === "loading" && reorderDependencyFetcher.state === "idle") {
      pendingAutoLayout.current = true;
    }
    prevReorderState.current = reorderDependencyFetcher.state;
  }, [reorderDependencyFetcher.state]);

  useEffect(() => {
    if (prevDeleteBatchState.current === "loading" && deleteBatchFetcher.state === "idle") {
      pendingAutoLayout.current = true;
    }
    prevDeleteBatchState.current = deleteBatchFetcher.state;
  }, [deleteBatchFetcher.state]);

  const [agentTeamModalState, setAgentTeamModalState] =
    useState<AgentTeamModalState>({
      isOpen: false,
    });
  const [filesModalState, setFilesModalState] = useState<FilesModalState>({
    isOpen: false,
  });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // サイドパネル用: 選択ノードの状態管理
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<
    "component" | "agentTeam" | null
  >(null);

  // サイドパネル用のfetcher
  const updateComponentFetcher = useFetcher();
  const updateAgentTeamFetcher = useFetcher();

  // deleteFetcherのエラーメッセージを監視
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

  // コールバックとIDをノードに注入
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

  // localStorageから保存済み位置をマージ
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

  // 自動レイアウト: rawGraphDataが更新されpendingAutoLayoutがtrueの場合、
  // DependencyGraphに計測済みflowNodesを使用してレイアウトを再計算するよう通知
  const [autoLayoutPending, setAutoLayoutPending] = useState(false);

  useEffect(() => {
    if (pendingAutoLayout.current) {
      pendingAutoLayout.current = false;
      setAutoLayoutPending(true);
    }
  }, [graphDataWithPositions]);

  const handleAutoLayoutApplied = useCallback(() => {
    setAutoLayoutPending(false);
  }, []);

  const handlePositionsPersist = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      saveGraphPositions(plugin.id, positions);
    },
    [plugin.id],
  );

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

  const handleCreateAgentTeam = useCallback(() => {
    setDeleteError(null);
    setAgentTeamModalState({
      isOpen: true,
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
    setAgentTeamModalState({ isOpen: false });
  }, []);

  // サイドパネル: ノードクリック時のハンドラ
  const handleNodeClick = useCallback(
    (nodeId: string, nodeType: "component" | "agentTeam") => {
      setSelectedNodeId(nodeId);
      setSelectedNodeType(nodeType);
    },
    [],
  );

  // サイドパネル: 閉じるハンドラ
  const handleSidePanelClose = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeType(null);
  }, []);

  // サイドパネル: コンポーネント更新ハンドラ
  const handleUpdateComponent = useCallback(
    (
      componentId: string,
      fields: { name: string; description: string; skillType?: string },
    ) => {
      updateComponentFetcher.submit(
        {
          intent: "update-component",
          componentId,
          name: fields.name,
          description: fields.description,
          skillType: fields.skillType ?? "",
        },
        { method: "post", action: `/plugins/${plugin.id}` },
      );
    },
    [updateComponentFetcher, plugin.id],
  );

  // サイドパネル: Agent Team更新ハンドラ
  const handleUpdateAgentTeam = useCallback(
    (teamId: string, fields: { name: string; description: string }) => {
      updateAgentTeamFetcher.submit(
        {
          intent: "update-agent-team",
          teamId,
          name: fields.name,
          description: fields.description,
        },
        { method: "post", action: `/plugins/${plugin.id}` },
      );
    },
    [updateAgentTeamFetcher, plugin.id],
  );

  // サイドパネル: 選択ノードのデータを算出
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId || !selectedNodeType) return null;

    if (selectedNodeType === "agentTeam") {
      const team = plugin.agentTeams.find((t) => t.id === selectedNodeId);
      if (!team) return null;
      return {
        nodeId: selectedNodeId,
        nodeType: "agentTeam" as const,
        componentType: "AGENT_TEAM" as const,
        name: team.name,
        description: team.description,
        skillType: null,
        orchestratorName:
          team.orchestrator.skillConfig?.name ?? "(unnamed)",
      };
    }

    const comp = plugin.components.find((c) => c.id === selectedNodeId);
    if (!comp) return null;

    const compName =
      comp.skillConfig?.name ?? comp.agentConfig?.name ?? "(unnamed)";
    const compDescription =
      comp.skillConfig?.description ??
      comp.agentConfig?.description ??
      null;

    // typeとskillTypeからcomponentTypeを判定
    let componentType: "SKILL" | "AGENT" | "ORCHESTRATOR" = comp.type as
      | "SKILL"
      | "AGENT";
    if (
      comp.type === "SKILL" &&
      comp.skillConfig?.skillType === "ENTRY_POINT"
    ) {
      componentType = "ORCHESTRATOR";
    }

    return {
      nodeId: selectedNodeId,
      nodeType: "component" as const,
      componentType,
      name: compName,
      description: compDescription,
      skillType: comp.skillConfig?.skillType ?? null,
      orchestratorName: null,
    };
  }, [selectedNodeId, selectedNodeType, plugin.components, plugin.agentTeams]);

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
    // 状態
    isClient,
    agentTeamModalState,
    filesModalState,
    deleteError,
    resetCounter,

    // 算出データ
    graphDataWithPositions,
    entryPointSkills,
    agentTeamsForGraph,
    graphComponents,

    // ビュー算出値
    filesModalComponentName,
    filesModalFiles,
    membersModalTeamName,
    membersModalMembers,
    membersModalAgentComponents,

    // フェッチャー
    addDependencyFetcher,
    componentFetcher,
    agentTeamFetcher,

    // 自動レイアウト
    autoLayoutPending,
    handleAutoLayoutApplied,
    handlePositionsPersist,

    // ハンドラー
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
    handleReorderStep,
    handleDeleteStep,

    // サイドパネル
    selectedNodeData,
    handleNodeClick,
    handleSidePanelClose,
    handleUpdateComponent,
    handleUpdateAgentTeam,
  };
}
