import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { LoadedSkillUnion } from "./types/loader.server";
import type { SkillDependency } from "./types/plugin";
import { applyStepOrderPostProcessing } from "./layout-utils";

export const DEFAULT_NODE_WIDTH = 250;
export const DEFAULT_NODE_HEIGHT = 60;

export function buildGraphData(
  skills: LoadedSkillUnion[],
  dependencies: SkillDependency[],
  nodeSizes?: Map<string, { width: number; height: number }>,
): {
  nodes: Node[];
  edges: Edge[];
} {
  if (skills.length === 0) return { nodes: [], edges: [] };

  // 循環検出用の隣接リストを構築
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const skill of skills) {
    adjacency.set(skill.name, []);
    inDegree.set(skill.name, 0);
  }

  const edges: Edge[] = [];

  // 依存関係からエッジを構築
  for (const dep of dependencies) {
    const sourceSkill = skills.find((s) => s.name === dep.source);
    const isOrchestrator = sourceSkill?.skillType === "ENTRY_POINT";
    const edgeId = `${dep.source}-${dep.target}`;
    const edge: Edge = {
      id: dep.order !== undefined ? `${edgeId}-${dep.order}` : edgeId,
      source: dep.source,
      target: dep.target,
    };
    if (isOrchestrator && dep.order !== undefined) {
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
  for (const skill of skills) {
    if ((tempInDegree.get(skill.name) ?? 0) === 0) {
      tempQueue.push(skill.name);
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

  const hasCycle = processed < skills.length;

  // ノードの位置を決定
  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 150;

  function getNodeSize(skillName: string): {
    width: number;
    height: number;
  } {
    const size = nodeSizes?.get(skillName);
    return {
      width: size?.width ?? DEFAULT_NODE_WIDTH,
      height: size?.height ?? DEFAULT_NODE_HEIGHT,
    };
  }

  function getPositionWithDagre(): Map<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 2 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const skill of skills) {
      const size = getNodeSize(skill.name);
      g.setNode(skill.name, { width: size.width, height: size.height });
    }

    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const positions = new Map<string, { x: number; y: number }>();
    for (const skill of skills) {
      const nodeData = g.node(skill.name);
      const size = getNodeSize(skill.name);
      // dagreは中心座標を返すため、左上座標に変換
      positions.set(skill.name, {
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
    _skillName: string,
    index: number,
  ): { x: number; y: number } {
    const cols = Math.ceil(Math.sqrt(skills.length));
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
      // ステップデータの構築: 依存関係をorder順にグループ化
      const skillDeps = dependencies.filter((d) => d.source === skill.name);
      const orderMap = new Map<
        number,
        Array<{ id: string; targetId: string }>
      >();
      for (const dep of skillDeps) {
        const order = dep.order ?? 0;
        if (!orderMap.has(order)) {
          orderMap.set(order, []);
        }
        const edgeId = `${dep.source}-${dep.target}`;
        orderMap.get(order)!.push({
          id: dep.order !== undefined ? `${edgeId}-${dep.order}` : edgeId,
          targetId: dep.target,
        });
      }
      const steps = Array.from(orderMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([order, stepDependencies]) => ({ order, dependencies: stepDependencies }));

      return {
        id: skill.name,
        position,
        type: "orchestrator",
        data: {
          label,
          steps,
          description: skill.description ?? null,
          skillType: skill.skillType ?? null,
        },
      };
    }

    // WORKER_WITH_SUB_AGENT に agentConfig が紐付いているかどうか
    const hasAgentConfig = skill.skillType === "WORKER_WITH_SUB_AGENT" && "agentConfig" in skill;

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
      },
    };
  });

  return { nodes, edges };
}
