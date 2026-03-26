import { useState, useEffect, useCallback, useMemo } from "react";
import type { Node } from "@xyflow/react";
import { buildGraphData } from "../lib/build-graph-data";

import {
  loadGraphPositions,
  saveGraphPositions,
  clearGraphPositions,
} from "../lib/graph-positions";
import type { LoadedPluginDefinition, LoadedSkillUnion, LoadedStep, LoadedBranch, LoadedInlineStep, LoadedOrchestratorSection } from "../lib/types/loader.server";
import type { StepFields, SectionFields, WorkerStepFields, AgentConfigSectionFields } from "../components/SidePanel";

export type Plugin = LoadedPluginDefinition;

// LoadedStep → StepFields 変換（型ガードはランタイム判定）
function convertStep(step: LoadedStep): StepFields {
  if (typeof step === "string") {
    return { type: "skill", label: step };
  }
  if ("decisionPoint" in step && "cases" in step) {
    const branch = step as LoadedBranch;
    return {
      type: "branch",
      label: branch.decisionPoint,
      description: branch.description,
      cases: Object.entries(branch.cases).map(([name, steps]) => ({
        name,
        steps: steps.map(convertStep),
      })),
    };
  }
  const inline = step as LoadedInlineStep;
  return {
    type: "inline",
    label: inline.inline,
    inlineSteps: inline.steps.map(s => ({ id: s.id, title: s.title, body: s.body })),
    inlineTools: inline.tools,
  };
}

function convertSections(sections: LoadedOrchestratorSection[]): SectionFields[] {
  return sections.map(s => ({ heading: s.heading, body: s.body, position: s.position }));
}

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

    // インラインステップノードの場合: グラフノードのdataから取得
    if (selectedNodeId.startsWith("inline:")) {
      const graphNode = graphDataWithPositions.nodes.find((n) => n.id === selectedNodeId);
      if (!graphNode) return null;
      const nodeData = graphNode.data as {
        label: string;
        output: string | null;
        tools: string[] | null;
        steps: { id: string; title: string }[] | null;
      };
      return {
        nodeType: "component" as const,
        componentType: "INLINE" as const,
        name: nodeData.label,
        description: null,
        skillType: null,
        hasAgentConfig: false,
        agentConfig: null,
        teammates: null,
        workerSteps: null,
        workerSections: null,
        steps: null,
        sections: null,
        allowedTools: nodeData.tools ? nodeData.tools.join(", ") : null,
        argumentHint: null,
        content: "",
        input: "",
        output: nodeData.output ?? "",
      };
    }

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

    // workerSteps/workerSections情報
    const workerStepsData: WorkerStepFields[] | null =
      skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.workerSteps
        ? skill.workerSteps.map(s => ({ id: s.id, title: s.title, body: s.body }))
        : null;
    const workerSectionsData: SectionFields[] | null =
      skill.skillType === "WORKER_WITH_SUB_AGENT" && skill.workerSections
        ? skill.workerSections.map(s => ({ heading: s.heading, body: s.body, position: s.position }))
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
            tools: agentConfigData.tools ?? [],
            agentContent: agentConfigData.content ?? "",
            description: agentConfigData.description,
            sections: agentConfigData.sections?.map(s => ({
              heading: s.heading,
              body: s.body,
              position: s.position,
            })),
          }
        : null,
      teammates: teammatesData,
      workerSteps: workerStepsData,
      workerSections: workerSectionsData,
      steps: skill.steps ? skill.steps.map(convertStep) : null,
      sections: skill.sections ? convertSections(skill.sections as LoadedOrchestratorSection[]) : null,
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
