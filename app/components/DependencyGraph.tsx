import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  Background,
  Controls,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import OrchestratorNode from "./OrchestratorNode";
import SkillNode from "./SkillNode";
import { computeAutoLayout } from "../lib/auto-layout";

const nodeTypes = {
  orchestrator: OrchestratorNode,
  skill: SkillNode,
};

interface DependencyGraphProps {
  nodes: Node[];
  edges: Edge[];
  pluginId: string;
  components: Array<{
    id: string;
    type: string;
    skillConfig: { skillType: string } | null;
  }>;
  onConnect: (sourceId: string, targetId: string, sourceHandle?: string) => void;
  onEdgeClick: (dependencyId: string) => void;
  onCreateComponent?: () => void;
  onDeleteComponent?: (componentId: string) => void;
  onManageFiles?: (componentId: string) => void;
  onManageMembers?: (componentId: string) => void;
  onNodeDragStop?: (positions: Record<string, { x: number; y: number }>) => void;
  onResetLayout?: () => void;
  onPositionsPersist?: (positions: Record<string, { x: number; y: number }>) => void;
  onNodeClick?: (nodeId: string, nodeType: "component") => void;
  onPaneClickCallback?: () => void;
  autoLayoutPending?: boolean;
  onAutoLayoutApplied?: () => void;
  resetKey?: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
}

export default function DependencyGraph({
  nodes,
  edges,
  pluginId,
  components,
  onConnect,
  onEdgeClick,
  onCreateComponent,
  onDeleteComponent,
  onManageFiles,
  onManageMembers,
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

    // refから同期的に開始位置を読み取る（Reactのバッチ処理の問題を回避）
    const startPositions: Record<string, { x: number; y: number }> = {};
    for (const node of flowNodesRef.current) {
      startPositions[node.id] = { x: node.position.x, y: node.position.y };
    }

    // フレームごとのArray.findの代わりにO(1)ルックアップ用のMapを構築
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

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: "",
  });

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const { source, target } = connection;
      if (!source || !target) return false;
      if (source === target) return false;

      const sourceComp = components.find((c) => c.id === source);
      const targetComp = components.find((c) => c.id === target);
      if (!sourceComp || !targetComp) return false;

      // EntryPoint -> Skill: ターゲットはWORKER系でなければならない
      const VALID_WORKER_TYPES = ["WORKER", "WORKER_WITH_SUB_AGENT", "WORKER_WITH_AGENT_TEAM"];
      if (
        sourceComp.type === "SKILL" &&
        sourceComp.skillConfig?.skillType === "ENTRY_POINT" &&
        targetComp.type === "SKILL"
      ) {
        if (!targetComp.skillConfig?.skillType || !VALID_WORKER_TYPES.includes(targetComp.skillConfig.skillType)) return false;
      }

      // 楽観的バリデーション（UX目的のみ）
      const adjacency = new Map<string, string[]>();
      for (const edge of edges) {
        const neighbors = adjacency.get(edge.source);
        if (neighbors) {
          neighbors.push(edge.target);
        } else {
          adjacency.set(edge.source, [edge.target]);
        }
      }

      const visited = new Set<string>();
      const stack = [target];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === source) return false;
        if (visited.has(current)) continue;
        visited.add(current);
        const neighbors = adjacency.get(current);
        if (neighbors) {
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              stack.push(neighbor);
            }
          }
        }
      }

      return true;
    },
    [components, edges],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        onConnect(
          connection.source,
          connection.target,
          connection.sourceHandle ?? undefined,
        );
      }
    },
    [onConnect],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const confirmed = window.confirm("Remove this dependency?");
      if (confirmed) {
        onEdgeClick(edge.id);
      }
    },
    [onEdgeClick],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [],
  );

  // ノード左クリック時にサイドパネルを開く
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id, "component");
    },
    [onNodeClick],
  );

  const handlePaneClick = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
    onPaneClickCallback?.();
  }, [onPaneClickCallback]);

  // ドキュメント外クリックまたはEscapeキーでコンテキストメニューを閉じる
  useEffect(() => {
    if (!contextMenu.visible) return;

    const handleDocumentClick = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [contextMenu.visible]);

  const handleContextMenuManageFiles = useCallback(() => {
    onManageFiles?.(contextMenu.nodeId);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.nodeId, onManageFiles]);

  const handleContextMenuManageMembers = useCallback(() => {
    onManageMembers?.(contextMenu.nodeId);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.nodeId, onManageMembers]);

  const handleContextMenuDelete = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this component?",
    );
    if (confirmed) {
      onDeleteComponent?.(contextMenu.nodeId);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.nodeId, onDeleteComponent]);

  // WORKER_WITH_AGENT_TEAM コンポーネントかどうかを判定
  const isAgentTeamComponent = useCallback(
    (nodeId: string) => {
      const comp = components.find((c) => c.id === nodeId);
      return comp?.skillConfig?.skillType === "WORKER_WITH_AGENT_TEAM";
    },
    [components],
  );

  return (
    <div className="dependency-graph">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        connectionRadius={80}
        fitView
      >
        <Background />
        <Controls />
        {(onCreateComponent || onResetLayout) && (
          <Panel position="top-right">
            <div className="graph-toolbar">
              {onCreateComponent && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onCreateComponent()}
                >
                  + New Skill
                </button>
              )}
              {onResetLayout && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={onResetLayout}
                >
                  Reset Layout
                </button>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            type="button"
            className="context-menu-item"
            onClick={handleContextMenuManageFiles}
          >
            Manage Files
          </button>
          {isAgentTeamComponent(contextMenu.nodeId) && (
            <button
              type="button"
              className="context-menu-item"
              onClick={handleContextMenuManageMembers}
            >
              Manage Members
            </button>
          )}
          <button
            type="button"
            className="context-menu-item context-menu-item-danger"
            onClick={handleContextMenuDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
