import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { getPlugin } from "./plugins.server";
import { applyStepOrderPostProcessing } from "./layout-utils";

export type PluginComponent = Awaited<
  ReturnType<typeof getPlugin>
> extends { components: (infer C)[] } | null
  ? C
  : never;

export const DEFAULT_NODE_WIDTH = 250;
export const DEFAULT_NODE_HEIGHT = 60;

export function buildGraphData(
  components: PluginComponent[],
  nodeSizes?: Map<string, { width: number; height: number }>,
): {
  nodes: Node[];
  edges: Edge[];
} {
  if (components.length === 0) return { nodes: [], edges: [] };

  // 循環検出用の隣接リストを構築
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const c of components) {
    adjacency.set(c.id, []);
    inDegree.set(c.id, 0);
  }

  const edges: Edge[] = [];

  for (const c of components) {
    if (c.dependenciesFrom) {
      const isOrchestrator = c.skillConfig?.skillType === "ENTRY_POINT";
      for (const dep of c.dependenciesFrom) {
        const edge: Edge = {
          id: dep.id,
          source: c.id,
          target: dep.targetId,
          deletable: true,
        };
        if (isOrchestrator) {
          edge.sourceHandle = `step-${dep.order}`;
        }
        edges.push(edge);
        adjacency.get(c.id)?.push(dep.targetId);
        inDegree.set(dep.targetId, (inDegree.get(dep.targetId) ?? 0) + 1);
      }
    }
  }

  // トポロジカルソートによる循環検出（Kahnのアルゴリズム）
  let processed = 0;
  const tempInDegree = new Map(inDegree);
  const tempQueue: string[] = [];
  for (const c of components) {
    if ((tempInDegree.get(c.id) ?? 0) === 0) {
      tempQueue.push(c.id);
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

  const hasCycle = processed < components.length;

  // ノードの位置を決定
  const HORIZONTAL_SPACING = 300;
  const VERTICAL_SPACING = 150;

  function getNodeSize(componentId: string): {
    width: number;
    height: number;
  } {
    const size = nodeSizes?.get(componentId);
    return {
      width: size?.width ?? DEFAULT_NODE_WIDTH,
      height: size?.height ?? DEFAULT_NODE_HEIGHT,
    };
  }

  function getPositionWithDagre(): Map<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 2 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const c of components) {
      const size = getNodeSize(c.id);
      g.setNode(c.id, { width: size.width, height: size.height });
    }

    for (const edge of edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const positions = new Map<string, { x: number; y: number }>();
    for (const c of components) {
      const nodeData = g.node(c.id);
      const size = getNodeSize(c.id);
      // dagreは中心座標を返すため、左上座標に変換
      positions.set(c.id, {
        x: nodeData.x - size.width / 2,
        y: nodeData.y - size.height / 2,
      });
    }

    // 後処理: ステップターゲットとその子孫をステップ順に垂直方向に並べ替える。
    // 共有ユーティリティに委譲する。
    const childrenMap = new Map<string, string[]>();
    for (const edge of edges) {
      if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
      childrenMap.get(edge.source)!.push(edge.target);
    }

    const orchestratorIds = components
      .filter((c) => c.skillConfig?.skillType === "ENTRY_POINT" && c.dependenciesFrom)
      .map((c) => c.id);

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
    componentId: string,
    index: number,
  ): { x: number; y: number } {
    const cols = Math.ceil(Math.sqrt(components.length));
    const row = Math.floor(index / cols);
    const col = index % cols;
    return { x: col * HORIZONTAL_SPACING, y: row * VERTICAL_SPACING };
  }

  const dagrePositions = hasCycle ? null : getPositionWithDagre();

  const nodes: Node[] = components.map((c, i) => {
    const label = c.skillConfig?.name ?? "(unnamed)";
    const isOrchestrator = c.skillConfig?.skillType === "ENTRY_POINT";
    const position = hasCycle
      ? getPositionGrid(c.id, i)
      : dagrePositions!.get(c.id)!;

    if (isOrchestrator) {
      // ステップデータの構築: 依存関係をorder順にグループ化
      const orderMap = new Map<
        number,
        Array<{ id: string; targetId: string }>
      >();
      for (const dep of c.dependenciesFrom ?? []) {
        const order = dep.order ?? 0;
        if (!orderMap.has(order)) {
          orderMap.set(order, []);
        }
        orderMap.get(order)!.push({ id: dep.id, targetId: dep.targetId });
      }
      const steps = Array.from(orderMap.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([order, dependencies]) => ({ order, dependencies }));

      return {
        id: c.id,
        position,
        type: "orchestrator",
        data: {
          label,
          steps,
          description: c.skillConfig?.description ?? null,
          skillType: c.skillConfig?.skillType ?? null,
        },
      };
    }

    // WORKER_WITH_SUB_AGENTにagentConfigが紐付いているかどうか
    const hasAgentConfig = !!(c.skillConfig?.agentConfig);

    return {
      id: c.id,
      position,
      type: "skill",
      data: {
        label,
        description: c.skillConfig?.description ?? null,
        componentType: c.type,
        skillType: c.skillConfig?.skillType ?? null,
        hasAgentConfig,
      },
    };
  });

  return { nodes, edges };
}
