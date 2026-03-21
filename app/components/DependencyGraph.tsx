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
import AgentNode from "./AgentNode";
import AgentTeamNode from "./AgentTeamNode";

const nodeTypes = {
  orchestrator: OrchestratorNode,
  skill: SkillNode,
  agent: AgentNode,
  agentteam: AgentTeamNode,
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
  agentTeams: Array<{
    id: string;
    name: string;
    description: string | null;
    orchestratorName: string;
  }>;
  onConnect: (sourceId: string, targetId: string, sourceHandle?: string) => void;
  onEdgeClick: (dependencyId: string) => void;
  onCreateComponent?: (type: "SKILL" | "AGENT") => void;
  onDeleteComponent?: (componentId: string) => void;
  onManageFiles?: (componentId: string) => void;
  onCreateAgentTeam?: () => void;
  onDeleteAgentTeam?: (teamId: string) => void;
  onManageMembers?: (teamId: string) => void;
  onNodeDragStop?: (positions: Record<string, { x: number; y: number }>) => void;
  onResetLayout?: () => void;
  onPositionsPersist?: (positions: Record<string, { x: number; y: number }>) => void;
  autoLayoutNodes?: Node[] | null;
  onAutoLayoutApplied?: () => void;
  resetKey?: number;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string;
  nodeType: "component" | "agentTeam";
}

export default function DependencyGraph({
  nodes,
  edges,
  pluginId,
  components,
  agentTeams,
  onConnect,
  onEdgeClick,
  onCreateComponent,
  onDeleteComponent,
  onManageFiles,
  onCreateAgentTeam,
  onDeleteAgentTeam,
  onManageMembers,
  onNodeDragStop,
  onResetLayout,
  onPositionsPersist,
  autoLayoutNodes,
  onAutoLayoutApplied,
  resetKey,
}: DependencyGraphProps) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);

  // Animation ref for auto-layout
  const animationRef = useRef<number | null>(null);

  // Cancel any running animation
  const cancelAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Persist positions after auto-layout animation completes
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

  // Animate nodes from current positions to target positions
  const animateToPositions = useCallback(
    (targetNodes: Node[], duration = 300) => {
      cancelAnimation();

      // Capture current positions at animation start
      const startPositions: Record<string, { x: number; y: number }> = {};
      setFlowNodes((currentNodes) => {
        for (const node of currentNodes) {
          startPositions[node.id] = { x: node.position.x, y: node.position.y };
        }
        return currentNodes;
      });

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - (1 - progress) ** 3;

        setFlowNodes((currentNodes) =>
          currentNodes.map((node) => {
            const start = startPositions[node.id];
            const target = targetNodes.find((n) => n.id === node.id);
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
    },
    [cancelAnimation, setFlowNodes, persistPositionsAfterAutoLayout],
  );

  // Sync internal node state when props change or layout is reset
  useEffect(() => {
    cancelAnimation();
    setFlowNodes(nodes);
  }, [nodes, resetKey, setFlowNodes, cancelAnimation]);

  // Handle auto-layout animation when autoLayoutNodes changes
  useEffect(() => {
    if (autoLayoutNodes && autoLayoutNodes.length > 0) {
      animateToPositions(autoLayoutNodes);
      onAutoLayoutApplied?.();
    }
  }, [autoLayoutNodes, animateToPositions, onAutoLayoutApplied]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  // Wrap onNodesChange to cancel animation on drag
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
    nodeType: "component",
  });

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const { source, target } = connection;
      if (!source || !target) return false;
      if (source === target) return false;

      // Agent Team nodes cannot be connected
      if (source.startsWith("agentteam-") || target.startsWith("agentteam-"))
        return false;

      const sourceComp = components.find((c) => c.id === source);
      const targetComp = components.find((c) => c.id === target);
      if (!sourceComp || !targetComp) return false;

      // Agent -> Skill: target must be WORKER
      if (sourceComp.type === "AGENT" && targetComp.type === "SKILL") {
        if (targetComp.skillConfig?.skillType !== "WORKER") return false;
      }

      // Optimistic validation (UX only): prevents obviously invalid connections
      // in the UI. The server performs the authoritative check within a transaction
      // to prevent race conditions. See dependency.server.ts.
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
      const isAgentTeam = node.id.startsWith("agentteam-");
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: isAgentTeam ? node.id.replace("agentteam-", "") : node.id,
        nodeType: isAgentTeam ? "agentTeam" : "component",
      });
    },
    [],
  );

  const handlePaneClick = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // Close context menu on document click outside or Escape key
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
    const label =
      contextMenu.nodeType === "agentTeam" ? "agent team" : "component";
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${label}?`,
    );
    if (confirmed) {
      if (contextMenu.nodeType === "agentTeam") {
        onDeleteAgentTeam?.(contextMenu.nodeId);
      } else {
        onDeleteComponent?.(contextMenu.nodeId);
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.nodeId, contextMenu.nodeType, onDeleteComponent, onDeleteAgentTeam]);

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
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        fitView
      >
        <Background />
        <Controls />
        {(onCreateComponent || onCreateAgentTeam || onResetLayout) && (
          <Panel position="top-right">
            <div className="graph-toolbar">
              {onCreateComponent && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onCreateComponent("SKILL")}
                  >
                    + New Skill
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => onCreateComponent("AGENT")}
                  >
                    + New Agent
                  </button>
                </>
              )}
              {onCreateAgentTeam && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ background: "#dcfce7", borderColor: "#86efac" }}
                  onClick={onCreateAgentTeam}
                >
                  + New Agent Team
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
          {contextMenu.nodeType === "component" && (
            <button
              type="button"
              className="context-menu-item"
              onClick={handleContextMenuManageFiles}
            >
              Manage Files
            </button>
          )}
          {contextMenu.nodeType === "agentTeam" && (
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
