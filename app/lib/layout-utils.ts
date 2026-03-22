/**
 * Shared post-processing utilities for step-order-based vertical layout.
 *
 * Both auto-layout.ts and build-graph-data.ts apply a post-processing pass
 * after dagre layout to reorder step targets (and their subtrees) vertically
 * by step order. This module extracts the shared logic so that both callers
 * delegate to a single implementation.
 */

/** Callback that returns the size of a node by its id. */
export type NodeSizeGetter = (nodeId: string) => {
  width: number;
  height: number;
};

/** Callback that returns the position of a node, or undefined if unknown. */
export type PositionGetter = (
  nodeId: string,
) => { x: number; y: number } | undefined;

/** Callback that sets the position of a node. */
export type PositionSetter = (
  nodeId: string,
  pos: { x: number; y: number },
) => void;

/** Gap (in px) inserted between consecutive step-target subtrees. */
const SUBTREE_GAP = 10;

/**
 * BFS reachability check: returns true if `toId` is reachable from `fromId`
 * via `childrenMap`.
 */
export function isReachable(
  fromId: string,
  toId: string,
  childrenMap: Map<string, string[]>,
): boolean {
  const queue = [fromId];
  const visited = new Set<string>([fromId]);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const child of childrenMap.get(cur) ?? []) {
      if (child === toId) return true;
      if (!visited.has(child)) {
        visited.add(child);
        queue.push(child);
      }
    }
  }
  return false;
}

/**
 * Sort orchestrator IDs so that inner (descendant) orchestrators come before
 * outer (ancestor) orchestrators. This ensures that when we reorder step
 * targets, inner subtrees are already laid out correctly before the outer
 * orchestrator computes subtree depths.
 */
export function sortOrchestratorsByDepth(
  orchestratorIds: string[],
  childrenMap: Map<string, string[]>,
): string[] {
  return [...orchestratorIds].sort((a, b) => {
    if (isReachable(a, b, childrenMap)) return 1; // a is parent of b -> process b first
    if (isReachable(b, a, childrenMap)) return -1; // b is parent of a -> process a first
    return 0;
  });
}

/**
 * BFS collection of descendant node IDs starting from `rootId`.
 * Nodes in `excludeSet` are NOT traversed (they act as subtree boundaries).
 */
export function getDescendants(
  rootId: string,
  childrenMap: Map<string, string[]>,
  excludeSet: Set<string>,
): string[] {
  const descendants: string[] = [];
  const queue = [rootId];
  const visited = new Set<string>([rootId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenMap.get(current) ?? []) {
      if (!visited.has(child) && !excludeSet.has(child)) {
        visited.add(child);
        descendants.push(child);
        queue.push(child);
      }
    }
  }
  return descendants;
}

/**
 * Compute the vertical extent (in px) of the subtree rooted at `targetId`.
 * Returns at least the target node's own height, even if it has no
 * descendants or if its position is unavailable.
 */
export function getSubtreeDepth(
  targetId: string,
  childrenMap: Map<string, string[]>,
  excludeSet: Set<string>,
  getPosition: PositionGetter,
  getSize: NodeSizeGetter,
): number {
  const targetHeight = getSize(targetId).height;
  const targetPos = getPosition(targetId);
  // Guard: if position is unavailable (possible in build-graph-data.ts where
  // positions.get() may return undefined), fall back to the node's own height.
  if (!targetPos) return targetHeight;

  const descs = getDescendants(targetId, childrenMap, excludeSet);
  let maxYBottom = targetPos.y + targetHeight;
  for (const descId of descs) {
    const dPos = getPosition(descId);
    if (dPos) {
      maxYBottom = Math.max(maxYBottom, dPos.y + getSize(descId).height);
    }
  }
  return Math.max(targetHeight, maxYBottom - targetPos.y);
}

export interface ApplyStepOrderPostProcessingParams {
  edges: Array<{ source: string; target: string; sourceHandle?: string | null }>;
  orchestratorIds: string[];
  childrenMap: Map<string, string[]>;
  getPosition: PositionGetter;
  setPosition: PositionSetter;
  getSize: NodeSizeGetter;
}

/**
 * Main post-processing pass: for each orchestrator, reorder its step targets
 * (and their subtrees) vertically by step order, then propagate the Y delta
 * to all descendants.
 */
export function applyStepOrderPostProcessing({
  edges,
  orchestratorIds,
  childrenMap,
  getPosition,
  setPosition,
  getSize,
}: ApplyStepOrderPostProcessingParams): void {
  const sortedOrchIds = sortOrchestratorsByDepth(orchestratorIds, childrenMap);

  for (const orchId of sortedOrchIds) {
    // Extract step targets from edges via sourceHandle parsing
    const stepTargets: { order: number; targetId: string }[] = [];
    for (const edge of edges) {
      if (edge.source === orchId && edge.sourceHandle?.startsWith("step-")) {
        const parsed = parseInt(edge.sourceHandle.replace("step-", ""), 10);
        stepTargets.push({
          order: Number.isNaN(parsed) ? 0 : parsed,
          targetId: edge.target,
        });
      }
    }
    if (stepTargets.length < 2) continue;

    stepTargets.sort((a, b) => a.order - b.order);

    const orchPos = getPosition(orchId);
    const orchY = orchPos?.y ?? 0;

    // Filter targets whose position is available
    const targetPositions = stepTargets
      .map((st) => ({ id: st.targetId, pos: getPosition(st.targetId) }))
      .filter(
        (t): t is { id: string; pos: { x: number; y: number } } =>
          t.pos != null,
      );

    const stepTargetSet = new Set(stepTargets.map((st) => st.targetId));

    // Record old Y positions
    const oldYs = targetPositions.map((t) => t.pos.y);

    // Recalculate Y positions sequentially
    const newYs: number[] = [];
    let currentY = orchY;
    for (let i = 0; i < targetPositions.length; i++) {
      newYs.push(currentY);
      const subtreeHeight = getSubtreeDepth(
        targetPositions[i].id,
        childrenMap,
        stepTargetSet,
        getPosition,
        getSize,
      );
      currentY += subtreeHeight + SUBTREE_GAP;
    }

    // Apply delta to each step target and propagate to descendants.
    // We track moved nodes to avoid double-moving shared descendants.
    // delta === 0 nodes are still added to `moved` for defensive correctness.
    const moved = new Set<string>();
    for (let i = 0; i < targetPositions.length; i++) {
      const delta = newYs[i] - oldYs[i];
      const targetId = targetPositions[i].id;

      // Always set the new position and mark as moved
      const currentPos = getPosition(targetId);
      if (currentPos) {
        setPosition(targetId, { ...currentPos, y: newYs[i] });
      }
      moved.add(targetId);

      if (delta === 0) continue;

      for (const descId of getDescendants(
        targetId,
        childrenMap,
        stepTargetSet,
      )) {
        if (moved.has(descId)) continue;
        moved.add(descId);
        const descPos = getPosition(descId);
        if (descPos) {
          setPosition(descId, { ...descPos, y: descPos.y + delta });
        }
      }
    }
  }
}
