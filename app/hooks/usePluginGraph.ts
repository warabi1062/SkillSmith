import { useState, useEffect, useCallback, useMemo } from "react";
import type { Node } from "@xyflow/react";
import { buildGraphData } from "../lib/build-graph-data";

import {
  loadGraphPositions,
  saveGraphPositions,
  clearGraphPositions,
} from "../lib/graph-positions";
import type { LoadedPluginDefinition, LoadedSkillUnion } from "../lib/types/loader.server";

export type Plugin = LoadedPluginDefinition;

export interface UsePluginGraphParams {
  plugin: Plugin;
}

export function usePluginGraph({
  plugin,
}: UsePluginGraphParams) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  // サイドパネル用: 選択ノードの状態管理
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<
    "component" | null
  >(null);

  // プラグインIDとしてプラグイン名を使用
  const pluginId = plugin.name;

  const rawGraphData = useMemo(
    () =>
      plugin.skills.length > 0
        ? buildGraphData(plugin.skills)
        : { nodes: [], edges: [] },
    [plugin.skills],
  );

  // ノードデータをそのまま返す（編集系の注入は不要）
  const graphData = rawGraphData;

  // localStorageから保存済み位置をマージ
  const graphDataWithPositions = useMemo(() => {
    const savedPositions = loadGraphPositions(pluginId);
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
  }, [graphData, pluginId]);

  // 自動レイアウト
  const [autoLayoutPending, setAutoLayoutPending] = useState(false);

  const handleAutoLayoutApplied = useCallback(() => {
    setAutoLayoutPending(false);
  }, []);

  const handlePositionsPersist = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      saveGraphPositions(pluginId, positions);
    },
    [pluginId],
  );

  const [resetCounter, setResetCounter] = useState(0);

  const handleNodeDragStop = useCallback(
    (positions: Record<string, { x: number; y: number }>) => {
      saveGraphPositions(pluginId, positions);
    },
    [pluginId],
  );

  const handleResetLayout = useCallback(() => {
    clearGraphPositions(pluginId);
    setResetCounter((c) => c + 1);
  }, [pluginId]);

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

  // サイドパネル: 選択ノードのデータを算出
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId || !selectedNodeType) return null;

    const skill = plugin.skills.find((s) => s.name === selectedNodeId);
    if (!skill) return null;

    // skillTypeからcomponentTypeを判定
    const componentType: "SKILL" | "ORCHESTRATOR" =
      skill.skillType === "ENTRY_POINT" ? "ORCHESTRATOR" : "SKILL";

    // agentConfig情報（discriminated unionにより型安全にアクセス）
    const hasAgentConfig = skill.skillType === "WORKER_WITH_SUB_AGENT";
    const agentConfigData =
      skill.skillType === "WORKER_WITH_SUB_AGENT"
        ? skill.agentConfig
        : null;

    // teammates情報（discriminated unionにより型安全にアクセス）
    const teammatesData =
      skill.skillType === "WORKER_WITH_AGENT_TEAM" && skill.teammates
        ? skill.teammates.map(t => ({
            name: t.name,
            role: t.role,
            steps: t.steps.map(s => ({ id: s.id, title: s.title, body: s.body })),
            pollingTarget: t.pollingTarget,
            statusCheckResponder: t.statusCheckResponder,
          }))
        : null;

    return {
      nodeType: "component" as const,
      componentType,
      name: skill.name,
      description: skill.description ?? null,
      skillType: skill.skillType ?? null,
      hasAgentConfig,
      agentConfig: agentConfigData
        ? {
            model: agentConfigData.model ?? "",
            tools: agentConfigData.tools
              ? JSON.stringify(agentConfigData.tools)
              : "",
            agentContent: agentConfigData.content ?? "",
          }
        : null,
      teammates: teammatesData,
      allowedTools: skill.allowedTools
        ? JSON.stringify(skill.allowedTools)
        : null,
      argumentHint: skill.argumentHint ?? null,
      content: skill.content ?? "",
      input: skill.input ?? "",
      output: skill.output ?? "",
    };
  }, [selectedNodeId, selectedNodeType, plugin.skills]);

  return {
    // 状態
    isClient,
    resetCounter,

    // 算出データ
    graphDataWithPositions,

    // 自動レイアウト
    autoLayoutPending,
    handleAutoLayoutApplied,
    handlePositionsPersist,

    // ハンドラー
    handleNodeDragStop,
    handleResetLayout,

    // サイドパネル
    selectedNodeData,
    handleNodeClick,
    handleSidePanelClose,
  };
}
