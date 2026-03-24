import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  type Node,
  type Edge,
  type NodeChange,
  Background,
  Controls,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import OrchestratorNode from "./OrchestratorNode";
import SkillNode from "./SkillNode";
import InlineStepNode from "./InlineStepNode";
import { computeAutoLayout } from "../lib/auto-layout";

const nodeTypes = {
  orchestrator: OrchestratorNode,
  skill: SkillNode,
  inlineStep: InlineStepNode,
};

interface DependencyGraphProps {
  nodes: Node[];
  edges: Edge[];
  onNodeDragStop?: (positions: Record<string, { x: number; y: number }>) => void;
  onResetLayout?: () => void;
  onPositionsPersist?: (positions: Record<string, { x: number; y: number }>) => void;
  onNodeClick?: (nodeId: string, nodeType: "component") => void;
  onPaneClickCallback?: () => void;
  autoLayoutPending?: boolean;
  onAutoLayoutApplied?: () => void;
  resetKey?: number;
}

export default function DependencyGraph({
  nodes,
  edges,
  onNodeDragStop,
  onResetLayout,
  onPositionsPersist,
  onNodeClick,
  onPaneClickCallback,
  autoLayoutPending,
  onAutoLayoutApplied,
  resetKey,
}: DependencyGraphProps) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);

  // 同期的な読み取り（例: アニメーション開始時）のために最新のflowNodesをrefで保持
  const flowNodesRef = useRef(flowNodes);
  useEffect(() => {
    flowNodesRef.current = flowNodes;
  }, [flowNodes]);

  // 自動レイアウト用のアニメーションref
  const animationRef = useRef<number | null>(null);

  // 実行中のアニメーションをキャンセル
  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // 自動レイアウトアニメーション完了後に位置を永続化
  const persistPositionsAfterAutoLayout = useCallback(
    (targetNodes: Node[]) => {
      const positions: Record<string, { x: number; y: number }> = {};
      for (const node of targetNodes) {
        positions[node.id] = { x: node.position.x, y: node.position.y };
      }
      onPositionsPersist?.(positions);
    },
    [onPositionsPersist],
  );

  // ノードを現在の位置からターゲット位置にアニメーション
  function animateToPositions(targetNodes: Node[], duration = 300) {
    cancelAnimation();

    const startPositions: Record<string, { x: number; y: number }> = {};
    for (const node of flowNodesRef.current) {
      startPositions[node.id] = { x: node.position.x, y: node.position.y };
    }

    const targetMap = new Map<string, Node>();
    for (const node of targetNodes) {
      targetMap.set(node.id, node);
    }

    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // イーズアウト3次関数
      const eased = 1 - (1 - progress) ** 3;

      setFlowNodes((currentNodes) =>
        currentNodes.map((node) => {
          const start = startPositions[node.id];
          const target = targetMap.get(node.id);
          if (!start || !target) return node;
          return {
            ...node,
            position: {
              x: start.x + (target.position.x - start.x) * eased,
              y: start.y + (target.position.y - start.y) * eased,
            },
          };
        }),
      );

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        persistPositionsAfterAutoLayout(targetNodes);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }

  // propsの変更またはレイアウトリセット時に内部ノード状態を同期
  useEffect(() => {
    cancelAnimation();
    setFlowNodes(nodes);
  }, [nodes, resetKey, setFlowNodes, cancelAnimation]);

  // 自動レイアウトの処理
  const pendingLayoutRef = useRef(false);
  useEffect(() => {
    if (autoLayoutPending) {
      pendingLayoutRef.current = true;
    }
  }, [autoLayoutPending]);

  useEffect(() => {
    if (!pendingLayoutRef.current) return;
    const allMeasured = flowNodes.every(
      (n) => n.measured?.width != null && n.measured?.height != null,
    );
    if (allMeasured && flowNodes.length > 0) {
      pendingLayoutRef.current = false;
      const layoutedNodes = computeAutoLayout(flowNodes, edges);
      animateToPositions(layoutedNodes);
      onAutoLayoutApplied?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes, onAutoLayoutApplied]);

  // アンマウント時にアニメーションをクリーンアップ
  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  // ドラッグ時にアニメーションをキャンセルするためonNodesChangeをラップ
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const hasDrag = changes.some(
        (change) => change.type === "position" && change.dragging,
      );
      if (hasDrag) {
        cancelAnimation();
      }
      onNodesChange(changes);
    },
    [onNodesChange, cancelAnimation],
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node, currentNodes: Node[]) => {
      const positions: Record<string, { x: number; y: number }> = {};
      for (const n of currentNodes) {
        positions[n.id] = { x: n.position.x, y: n.position.y };
      }
      onNodeDragStop?.(positions);
    },
    [onNodeDragStop],
  );

  // ノード左クリック時にサイドパネルを開く
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id, "component");
    },
    [onNodeClick],
  );

  const handlePaneClick = useCallback(() => {
    onPaneClickCallback?.();
  }, [onPaneClickCallback]);

  return (
    <div className="dependency-graph">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        edgesReconnectable={false}
        fitView
      >
        <Background />
        <Controls />
        {onResetLayout && (
          <Panel position="top-right">
            <div className="graph-toolbar">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onResetLayout}
              >
                Reset Layout
              </button>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
