import { describe, expect, it } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { computeAutoLayout } from "../auto-layout";
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from "../build-graph-data";

function makeNode(
  id: string,
  overrides?: Partial<Node> & { measured?: { width: number; height: number } },
): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    data: { label: id },
    ...overrides,
  };
}

function makeEdge(source: string, target: string): Edge {
  return { id: `${source}->${target}`, source, target };
}

describe("computeAutoLayout", () => {
  it("should compute layout positions for a simple two-node graph", () => {
    // Arrange
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("a", "b")];

    // Act
    const result = computeAutoLayout(nodes, edges);

    // Assert
    expect(result).toHaveLength(2);
    const nodeA = result.find((n) => n.id === "a")!;
    const nodeB = result.find((n) => n.id === "b")!;
    // In TB layout, source should be above target
    expect(nodeA.position.y).toBeLessThan(nodeB.position.y);
  });

  it("should place AgentTeam nodes in a separate row below component nodes", () => {
    // Arrange
    const nodes = [
      makeNode("comp-1"),
      makeNode("comp-2"),
      makeNode("agentteam-team-1"),
    ];
    const edges = [makeEdge("comp-1", "comp-2")];

    // Act
    const result = computeAutoLayout(nodes, edges);

    // Assert
    const comp1 = result.find((n) => n.id === "comp-1")!;
    const comp2 = result.find((n) => n.id === "comp-2")!;
    const team = result.find((n) => n.id === "agentteam-team-1")!;

    // AgentTeam node should be below all component nodes
    const maxCompY = Math.max(
      comp1.position.y + DEFAULT_NODE_HEIGHT,
      comp2.position.y + DEFAULT_NODE_HEIGHT,
    );
    expect(team.position.y).toBeGreaterThan(maxCompY);
  });

  it("should return an unchanged copy when nodes array is empty", () => {
    // Arrange
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Act
    const result = computeAutoLayout(nodes, edges);

    // Assert
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it("should use default size when measured property is not present", () => {
    // Arrange - nodes without measured property
    const nodes = [makeNode("a"), makeNode("b")];
    const edges = [makeEdge("a", "b")];

    // Act - should not throw
    const result = computeAutoLayout(nodes, edges);

    // Assert
    expect(result).toHaveLength(2);
    const nodeA = result.find((n) => n.id === "a")!;
    const nodeB = result.find((n) => n.id === "b")!;
    // Positions should be computed (not the initial 0,0)
    expect(nodeA.position).toBeDefined();
    expect(nodeB.position).toBeDefined();
  });

  it("should use measured dimensions when available", () => {
    // Arrange
    const nodes = [
      makeNode("a", { measured: { width: 400, height: 200 } }),
      makeNode("b", { measured: { width: 400, height: 200 } }),
    ];
    const edges = [makeEdge("a", "b")];

    // Act
    const result = computeAutoLayout(nodes, edges);

    // Assert - nodes should still be laid out correctly
    const nodeA = result.find((n) => n.id === "a")!;
    const nodeB = result.find((n) => n.id === "b")!;
    expect(nodeA.position.y).toBeLessThan(nodeB.position.y);
  });

  it("should return nodes unchanged when the graph contains a cycle", () => {
    // Arrange - A -> B -> C -> A
    const nodes = [
      makeNode("a", { position: { x: 10, y: 20 } }),
      makeNode("b", { position: { x: 30, y: 40 } }),
      makeNode("c", { position: { x: 50, y: 60 } }),
    ];
    const edges = [
      makeEdge("a", "b"),
      makeEdge("b", "c"),
      makeEdge("c", "a"),
    ];

    // Act
    const result = computeAutoLayout(nodes, edges);

    // Assert - positions should remain unchanged
    expect(result).toHaveLength(3);
    const nodeA = result.find((n) => n.id === "a")!;
    const nodeB = result.find((n) => n.id === "b")!;
    const nodeC = result.find((n) => n.id === "c")!;
    expect(nodeA.position).toEqual({ x: 10, y: 20 });
    expect(nodeB.position).toEqual({ x: 30, y: 40 });
    expect(nodeC.position).toEqual({ x: 50, y: 60 });
  });

  it("should preserve node data properties", () => {
    // Arrange
    const nodes = [
      makeNode("a", { data: { label: "Node A", custom: "value" } }),
    ];
    const edges: Edge[] = [];

    // Act
    const result = computeAutoLayout(nodes, edges);

    // Assert
    expect(result[0].data).toEqual({ label: "Node A", custom: "value" });
  });
});
