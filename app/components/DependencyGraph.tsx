import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  type Connection,
  Background,
  Controls,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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
  onConnect: (sourceId: string, targetId: string) => void;
  onEdgeClick: (dependencyId: string) => void;
  onNodeDoubleClick?: (componentId: string) => void;
  onCreateComponent?: (type: "SKILL" | "AGENT") => void;
  onDeleteComponent?: (componentId: string) => void;
  onAgentTeamDoubleClick?: (teamId: string) => void;
  onCreateAgentTeam?: () => void;
  onDeleteAgentTeam?: (teamId: string) => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  componentId: string;
}

export default function DependencyGraph({
  nodes,
  edges,
  pluginId,
  components,
  agentTeams,
  onConnect,
  onEdgeClick,
  onNodeDoubleClick,
  onCreateComponent,
  onDeleteComponent,
  onAgentTeamDoubleClick,
  onCreateAgentTeam,
  onDeleteAgentTeam,
}: DependencyGraphProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    componentId: "",
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
        onConnect(connection.source, connection.target);
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

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeDoubleClick?.(node.id);
    },
    [onNodeDoubleClick],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        componentId: node.id,
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

  const handleContextMenuEdit = useCallback(() => {
    onNodeDoubleClick?.(contextMenu.componentId);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.componentId, onNodeDoubleClick]);

  const handleContextMenuDelete = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this component?",
    );
    if (confirmed) {
      onDeleteComponent?.(contextMenu.componentId);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, [contextMenu.componentId, onDeleteComponent]);

  return (
    <div className="dependency-graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        fitView
      >
        <Background />
        <Controls />
        {onCreateComponent && (
          <Panel position="top-right">
            <div className="graph-toolbar">
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
            onClick={handleContextMenuEdit}
          >
            Edit
          </button>
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
