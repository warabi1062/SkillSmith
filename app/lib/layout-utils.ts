/**
 * ステップ順序に基づく垂直レイアウトの共有後処理ユーティリティ。
 *
 * auto-layout.tsとbuild-graph-data.tsの両方が、dagreレイアウト後に
 * ステップターゲット（およびそのサブツリー）をステップ順に垂直方向に
 * 並べ替える後処理を適用する。このモジュールは共有ロジックを抽出し、
 * 両方の呼び出し元が単一の実装に委譲できるようにする。
 */

/** ノードIDからノードのサイズを返すコールバック。 */
export type NodeSizeGetter = (nodeId: string) => {
  width: number;
  height: number;
};

/** ノードの位置を返すコールバック。不明な場合はundefinedを返す。 */
export type PositionGetter = (
  nodeId: string,
) => { x: number; y: number } | undefined;

/** ノードの位置を設定するコールバック。 */
export type PositionSetter = (
  nodeId: string,
  pos: { x: number; y: number },
) => void;

/** 連続するステップターゲットのサブツリー間に挿入されるギャップ（px）。 */
const SUBTREE_GAP = 10;

/**
 * BFSによる到達可能性チェック: `childrenMap`を経由して`fromId`から`toId`に
 * 到達可能な場合にtrueを返す。
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
 * オーケストレーターIDを、内側（子孫）のオーケストレーターが外側（祖先）の
 * オーケストレーターより先に来るようにソートする。これにより、ステップターゲットを
 * 並べ替える際、外側のオーケストレーターがサブツリーの深さを計算する前に
 * 内側のサブツリーが既に正しくレイアウトされていることを保証する。
 */
export function sortOrchestratorsByDepth(
  orchestratorIds: string[],
  childrenMap: Map<string, string[]>,
): string[] {
  return [...orchestratorIds].sort((a, b) => {
    if (isReachable(a, b, childrenMap)) return 1; // aはbの親 -> bを先に処理
    if (isReachable(b, a, childrenMap)) return -1; // bはaの親 -> aを先に処理
    return 0;
  });
}

/**
 * `rootId`から開始して子孫ノードIDをBFSで収集する。
 * `excludeSet`内のノードは走査されない（サブツリーの境界として機能する）。
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
 * `targetId`をルートとするサブツリーの垂直方向の広がり（px）を計算する。
 * 子孫がない場合や位置が取得できない場合でも、少なくともターゲットノード
 * 自身の高さを返す。
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
  // ガード: 位置が取得できない場合（build-graph-data.tsでpositions.get()が
  // undefinedを返す可能性がある）、ノード自身の高さにフォールバックする。
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
 * メインの後処理パス: 各オーケストレーターについて、ステップターゲット
 * （およびそのサブツリー）をステップ順に垂直方向に並べ替え、Y方向の差分を
 * 全ての子孫に伝播する。
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
    // sourceHandleの解析によりエッジからステップターゲットを抽出
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

    // 位置が利用可能なターゲットをフィルタリング
    const targetPositions = stepTargets
      .map((st) => ({ id: st.targetId, pos: getPosition(st.targetId) }))
      .filter(
        (t): t is { id: string; pos: { x: number; y: number } } =>
          t.pos != null,
      );

    const stepTargetSet = new Set(stepTargets.map((st) => st.targetId));

    // 旧Y位置を記録
    const oldYs = targetPositions.map((t) => t.pos.y);

    // Y位置を順番に再計算
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

    // 各ステップターゲットに差分を適用し、子孫に伝播する。
    // 共有された子孫の二重移動を防ぐため、移動済みノードを追跡する。
    // delta === 0のノードも防御的な正確性のために`moved`に追加される。
    const moved = new Set<string>();
    for (let i = 0; i < targetPositions.length; i++) {
      const delta = newYs[i] - oldYs[i];
      const targetId = targetPositions[i].id;

      // 常に新しい位置を設定し、移動済みとしてマーク
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
