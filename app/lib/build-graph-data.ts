import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { LoadedSkillUnion, LoadedStep, LoadedBranch, LoadedInlineStep } from "./types/loader.server";
import { serializeToolRef } from "./types/skill";
import { applyStepOrderPostProcessing } from "./layout-utils";

export const DEFAULT_NODE_WIDTH = 260;
export const DEFAULT_NODE_HEIGHT = 60;

// スキルの dependencies フィールドからエッジ情報を構築する
interface SkillEdge {
  source: string;
  target: string;
  order: number;
}

function buildSkillEdges(skills: LoadedSkillUnion[]): SkillEdge[] {
  const edges: SkillEdge[] = [];
  for (const skill of skills) {
    if (skill.dependencies) {
      skill.dependencies.forEach((target, index) => {
        edges.push({ source: skill.name, target, order: index });
      });
    }
  }
  return edges;
}

// LoadedStep の型ガード（loader.server.ts はサーバー専用のためランタイムインポート不可）
function isStepsDataBranch(step: LoadedStep): step is LoadedBranch {
  return typeof step === "object" && "decisionPoint" in step && "cases" in step;
}

function isStepsDataInline(step: LoadedStep): step is LoadedInlineStep {
  return typeof step === "object" && "inline" in step && !("decisionPoint" in step);
}

// stepsData からリーフターゲットをフラット順に収集する
interface FlatTarget {
  type: "skill" | "inline";
  id: string;
  label: string;
  isNew?: boolean; // インラインステップが初出かどうか（重複排除用）
  output?: string;
  tools?: string[];
  steps?: { id: string; title: string; body: string }[];
}

function flattenStepsData(stepsData: LoadedStep[], orchName: string, seenInlineIds?: Set<string>): FlatTarget[] {
  const result: FlatTarget[] = [];
  // オーケストレーター固有のインラインカウンター（同名でないもの用のフォールバック）
  let inlineCounter = 0;

  function walk(steps: LoadedStep[]) {
    for (const step of steps) {
      if (isStepsDataBranch(step)) {
        for (const caseSteps of Object.values(step.cases)) {
          walk(caseSteps);
        }
      } else if (isStepsDataInline(step)) {
        // 同じラベルのインラインステップは同一ノードとして扱う
        const id = `inline:${step.inline}`;
        const isNew = !seenInlineIds || !seenInlineIds.has(id);
        result.push({
          type: "inline",
          id,
          label: step.inline,
          isNew,
          output: step.output,
          tools: step.tools?.map(serializeToolRef),
          steps: step.steps.map(s => ({ id: s.id, title: s.title, body: s.body })),
        });
        seenInlineIds?.add(id);
      } else {
        result.push({ type: "skill", id: step, label: step });
      }
    }
  }

  walk(stepsData);
  return result;
}

export function buildGraphData(
  skills: LoadedSkillUnion[],
  nodeSizes?: Map<string, { width: number; height: number }>,
): {
  nodes: Node[];
  edges: Edge[];
} {
  if (skills.length === 0) return { nodes: [], edges: [] };

  // dependencies ベースのエッジを構築
  const baseSkillEdges = buildSkillEdges(skills);

  // stepsData を持つオーケストレーターからインラインステップ情報を抽出し、エッジを置き換え
  interface InlineNodeInfo { id: string; label: string; output?: string; tools?: string[]; steps?: { id: string; title: string; body: string }[] }
  const inlineNodeInfos: InlineNodeInfo[] = [];
  const orchsWithStepsData = new Set<string>();
  const stepsDataEdges: SkillEdge[] = [];
  // 同じラベルのインラインステップを単一ノードに統合するための追跡セット
  const seenInlineIds = new Set<string>();

  for (const skill of skills) {
    if (skill.skillType === "ENTRY_POINT" && skill.steps) {
      const targets = flattenStepsData(skill.steps as LoadedStep[], skill.name, seenInlineIds);
      orchsWithStepsData.add(skill.name);
      for (let i = 0; i < targets.length; i++) {
        stepsDataEdges.push({ source: skill.name, target: targets[i].id, order: i });
        // インラインノード情報は初出のもののみ追加（重複排除）
        if (targets[i].type === "inline" && targets[i].isNew) {
          inlineNodeInfos.push({
            id: targets[i].id,
            label: targets[i].label,
            output: targets[i].output,
            tools: targets[i].tools,
            steps: targets[i].steps,
          });
        }
      }
    }
  }

  // stepsData があるオーケストレーターは stepsData ベースのエッジに置き換え
  const skillEdges = [
    ...baseSkillEdges.filter((e) => !orchsWithStepsData.has(e.source)),
    ...stepsDataEdges,
  ];

  // 全ノードID（スキル + インラインステップ）
  const allNodeIds = [...skills.map((s) => s.name), ...inlineNodeInfos.map((n) => n.id)];

  // 循環検出用の隣接リストを構築
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of allNodeIds) {
    adjacency.set(id, []);
    inDegree.set(id, 0);
  }

  const edges: Edge[] = [];

  // エッジを構築
  for (const dep of skillEdges) {
    const sourceSkill = skills.find((s) => s.name === dep.source);
    const isOrchestrator = sourceSkill?.skillType === "ENTRY_POINT";
    const edgeId = `${dep.source}-${dep.target}`;
    const edge: Edge = {
      id: `${edgeId}-${dep.order}`,
      source: dep.source,
      target: dep.target,
    };
    if (isOrchestrator) {
      edge.sourceHandle = `step-${dep.order}`;
    }
    edges.push(edge);
    adjacency.get(dep.source)?.push(dep.target);
    inDegree.set(dep.target, (inDegree.get(dep.target) ?? 0) + 1);
  }

  // トポロジカルソートによる循環検出（Kahnのアルゴリズム）
  let processed = 0;
  const tempInDegree = new Map(inDegree);
  const tempQueue: string[] = [];
  for (const id of allNodeIds) {
    if ((tempInDegree.get(id) ?? 0) === 0) {
      tempQueue.push(id);
    }
  }
  while (tempQueue.length > 0) {
    const current = tempQueue.shift()!;
    processed++;
    for (const neighbor of adjacency.get(current) ?? []) {
      tempInDegree.set(neighbor, (tempInDegree.get(neighbor) ?? 0) - 1);
      if (tempInDegree.get(neighbor) === 0) {
        tempQueue.push(neighbor);
      }
    }
  }

  const hasCycle = processed < allNodeIds.length;

  // ノードの位置を決定
  const HORIZONTAL_SPACING = 340;
  const VERTICAL_SPACING = 150;

  function getNodeSize(nodeId: string): {
    width: number;
    height: number;
  } {
    const size = nodeSizes?.get(nodeId);
    return {
      width: size?.width ?? DEFAULT_NODE_WIDTH,
      height: size?.height ?? DEFAULT_NODE_HEIGHT,
    };
  }

  function getPositionWithDagre(): Map<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 100, nodesep: 2 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const id of allNodeIds) {
      const size = getNodeSize(id);
      g.setNode(id, { width: size.width, height: size.height });
    }

    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const positions = new Map<string, { x: number; y: number }>();
    for (const id of allNodeIds) {
      const nodeData = g.node(id);
      const size = getNodeSize(id);
      // dagreは中心座標を返すため、左上座標に変換
      positions.set(id, {
        x: nodeData.x - size.width / 2,
        y: nodeData.y - size.height / 2,
      });
    }

    // 後処理: ステップターゲットとその子孫をステップ順に垂直方向に並べ替える。
    const childrenMap = new Map<string, string[]>();
    for (const edge of edges) {
      if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
      childrenMap.get(edge.source)!.push(edge.target);
    }

    const orchestratorIds = skills
      .filter((s) => s.skillType === "ENTRY_POINT")
      .map((s) => s.name);

    applyStepOrderPostProcessing({
      edges,
      orchestratorIds,
      childrenMap,
      getPosition: (id) => positions.get(id),
      setPosition: (id, pos) => positions.set(id, pos),
      getSize: (id) => getNodeSize(id),
    });
    return positions;
  }

  function getPositionGrid(
    _nodeId: string,
    index: number,
  ): { x: number; y: number } {
    const cols = Math.ceil(Math.sqrt(allNodeIds.length));
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { x: col * HORIZONTAL_SPACING, y: row * VERTICAL_SPACING };
  }

  const dagrePositions = hasCycle ? null : getPositionWithDagre();

  const nodes: Node[] = skills.map((skill, i) => {
    const label = skill.name ?? "(unnamed)";
    const isOrchestrator = skill.skillType === "ENTRY_POINT";
    const position = hasCycle
      ? getPositionGrid(skill.name, i)
      : dagrePositions!.get(skill.name)!;

    if (isOrchestrator) {
      return {
        id: skill.name,
        position,
        type: "orchestrator",
        data: {
          label,
          stepsData: (skill.steps as LoadedStep[]) ?? [],
          description: skill.description ?? null,
          skillType: skill.skillType ?? null,
        },
      };
    }

    // WORKER_WITH_SUB_AGENT に agentConfig が紐付いているかどうか
    const hasAgentConfig = skill.skillType === "WORKER_WITH_SUB_AGENT" && "agentConfig" in skill;

    // WORKER_WITH_AGENT_TEAM に teammates が紐付いているかどうか
    const teammateNames = skill.skillType === "WORKER_WITH_AGENT_TEAM" && "teammates" in skill && skill.teammates
      ? skill.teammates.map(t => t.name)
      : null;

    return {
      id: skill.name,
      position,
      type: "skill",
      data: {
        label,
        description: skill.description ?? null,
        componentType: "SKILL",
        skillType: skill.skillType ?? null,
        hasAgentConfig,
        teammateNames,
      },
    };
  });

  // インラインステップのノードを追加
  for (let idx = 0; idx < inlineNodeInfos.length; idx++) {
    const inlineNode = inlineNodeInfos[idx];
    const position = hasCycle
      ? getPositionGrid(inlineNode.id, skills.length + idx)
      : dagrePositions!.get(inlineNode.id)!;
    nodes.push({
      id: inlineNode.id,
      position,
      type: "inlineStep",
      data: {
        label: inlineNode.label,
        output: inlineNode.output ?? null,
        tools: inlineNode.tools ?? null,
        steps: inlineNode.steps ?? null,
      },
    });
  }

  return { nodes, edges };
}
