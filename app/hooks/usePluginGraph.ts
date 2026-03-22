import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useFetcher } from "react-router";
import type { Node } from "@xyflow/react";
import { buildGraphData } from "../lib/build-graph-data";

import {
  loadGraphPositions,
  saveGraphPositions,
  clearGraphPositions,
} from "../lib/graph-positions";
import type { getPlugin } from "../lib/plugins.server";
import type { AgentConfigFields } from "../components/SidePanel";

export type Plugin = NonNullable<Awaited<ReturnType<typeof getPlugin>>>;

export interface ModalState {
  isOpen: boolean;
  mode: "create";
}

export interface FilesModalState {
  isOpen: boolean;
  componentId?: string;
}

export interface MembersModalState {
  isOpen: boolean;
  agentTeamComponentId?: string;
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

  const [filesModalState, setFilesModalState] = useState<FilesModalState>({
    isOpen: false,
  });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // サイドパネル用: 選択ノードの状態管理
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<
    "component" | null
  >(null);

  // サイドパネル用のfetcher
  const updateComponentFetcher = useFetcher();

  // deleteFetcherのエラーメッセージを監視
  useEffect(() => {
    if (deleteFetcher.state === "idle" && deleteFetcher.data?.error) {
      setDeleteError(deleteFetcher.data.error);
    }
  }, [deleteFetcher.state, deleteFetcher.data]);

  const rawGraphData = useMemo(
    () =>
      plugin.components.length > 0
        ? buildGraphData(plugin.components)
        : { nodes: [], edges: [] },
    [plugin.components],
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
        if (node.type === "skill") {
          return {
            ...node,
            data: {
              ...node.data,
              componentId: node.id,
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

  // 自動レイアウト
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
    () => {
      setDeleteError(null);
      onModalStateChange({
        isOpen: true,
        mode: "create",
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
    (agentTeamComponentId: string) => {
      setDeleteError(null);
      onMembersModalStateChange({ isOpen: true, agentTeamComponentId });
    },
    [onMembersModalStateChange],
  );

  const handleMembersModalClose = useCallback(() => {
    onMembersModalStateChange({ isOpen: false });
  }, [onMembersModalStateChange]);

  const handleModalClose = useCallback(() => {
    onModalStateChange({ isOpen: false, mode: "create" });
  }, [onModalStateChange]);

  // サイドパネル: ノードクリック時のハンドラ
  const handleNodeClick = useCallback(
    (nodeId: string, nodeType: "component") => {
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
      fields: {
        name: string;
        description: string;
        content: string;
        input: string;
        output: string;
        skillType?: string;
        allowedTools?: string;
        argumentHint?: string;
        disableModelInvocation?: boolean;
        agentConfig?: AgentConfigFields;
      },
    ) => {
      const formFields: Record<string, string> = {
        intent: "update-component",
        componentId,
        name: fields.name,
        description: fields.description,
        content: fields.content,
        input: fields.input,
        output: fields.output,
        skillType: fields.skillType ?? "",
        allowedTools: fields.allowedTools ?? "",
        argumentHint: fields.argumentHint ?? "",
        disableModelInvocation: String(fields.disableModelInvocation ?? false),
      };
      // agentConfig関連フィールド
      if (fields.agentConfig) {
        formFields.agentModel = fields.agentConfig.model;
        formFields.agentTools = fields.agentConfig.tools;
        formFields.agentContent = fields.agentConfig.agentContent;
      }
      updateComponentFetcher.submit(
        formFields,
        { method: "post", action: `/plugins/${plugin.id}` },
      );
    },
    [updateComponentFetcher, plugin.id],
  );

  // サイドパネル: 選択ノードのデータを算出
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId || !selectedNodeType) return null;

    const comp = plugin.components.find((c) => c.id === selectedNodeId);
    if (!comp) return null;

    const compName = comp.skillConfig?.name ?? "(unnamed)";
    const compDescription = comp.skillConfig?.description ?? null;

    // typeとskillTypeからcomponentTypeを判定
    let componentType: "SKILL" | "ORCHESTRATOR" = "SKILL";
    if (
      comp.type === "SKILL" &&
      comp.skillConfig?.skillType === "ENTRY_POINT"
    ) {
      componentType = "ORCHESTRATOR";
    }

    // agentConfig情報
    const agentConfigData = comp.skillConfig?.agentConfig ?? null;
    const hasAgentConfig = agentConfigData !== null;

    return {
      nodeId: selectedNodeId,
      nodeType: "component" as const,
      componentType,
      name: compName,
      description: compDescription,
      skillType: comp.skillConfig?.skillType ?? null,
      hasAgentConfig,
      agentConfig: agentConfigData
        ? {
            model: agentConfigData.model ?? "",
            tools: agentConfigData.tools ?? "",
            agentContent: agentConfigData.content ?? "",
          }
        : null,
      allowedTools: comp.skillConfig?.allowedTools ?? null,
      argumentHint: comp.skillConfig?.argumentHint ?? null,
      disableModelInvocation: comp.skillConfig?.disableModelInvocation ?? false,
      orchestratorName: null,
      content: comp.skillConfig?.content ?? "",
      input: comp.skillConfig?.input ?? "",
      output: comp.skillConfig?.output ?? "",
    };
  }, [selectedNodeId, selectedNodeType, plugin.components]);

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
    return comp.skillConfig?.name ?? "(unnamed)";
  }, [filesModalState.componentId, plugin.components]);

  const filesModalFiles = useMemo(() => {
    if (!filesModalState.componentId) return [];
    return (
      plugin.components.find(
        (c) => c.id === filesModalState.componentId,
      )?.files ?? []
    );
  }, [filesModalState.componentId, plugin.components]);

  // membersModal: WORKER_WITH_AGENT_TEAM Componentに紐づくメンバー情報
  // AgentTeamMember テーブルで管理されている
  const membersModalTeamName = useMemo(() => {
    if (!membersModalState.agentTeamComponentId) return "(unknown)";
    const comp = plugin.components.find(
      (c) => c.id === membersModalState.agentTeamComponentId,
    );
    return comp?.skillConfig?.name ?? "(unknown)";
  }, [membersModalState.agentTeamComponentId, plugin.components]);

  const membersModalMembers = useMemo(() => {
    if (!membersModalState.agentTeamComponentId) return [];
    const comp = plugin.components.find(
      (c) => c.id === membersModalState.agentTeamComponentId,
    );
    if (!comp?.agentTeamMembers) return [];
    return comp.agentTeamMembers.map((m) => ({
      id: m.id,
      component: {
        id: m.component.id,
        skillConfig: m.component.skillConfig
          ? { name: m.component.skillConfig.name }
          : null,
      },
    }));
  }, [membersModalState.agentTeamComponentId, plugin.components]);

  // WORKER_WITH_SUB_AGENT Skillのコンポーネントのみ
  const membersModalAgentComponents = useMemo(
    () =>
      plugin.components
        .filter(
          (c) =>
            c.type === "SKILL" &&
            c.skillConfig?.skillType === "WORKER_WITH_SUB_AGENT",
        )
        .map((c) => ({
          id: c.id,
          skillConfig: c.skillConfig ? { name: c.skillConfig.name } : null,
        })),
    [plugin.components],
  );

  return {
    // 状態
    isClient,
    filesModalState,
    deleteError,
    resetCounter,

    // 算出データ
    graphDataWithPositions,
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
    handleNodeDragStop,
    handleResetLayout,
    handleReorderStep,
    handleDeleteStep,

    // サイドパネル
    selectedNodeData,
    handleNodeClick,
    handleSidePanelClose,
    handleUpdateComponent,
  };
}
