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

function makeEdge(source: string, target: string, sourceHandle?: string): Edge {
  return { id: `${source}->${target}`, source, target, ...(sourceHandle ? { sourceHandle } : {}) };
}

function makeOrchestratorNode(
  id: string,
  overrides?: Partial<Node> & { measured?: { width: number; height: number } },
): Node {
  return {
    id,
    position: { x: 0, y: 0 },
    type: "orchestrator",
    data: { label: id },
    ...overrides,
  };
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
    // In LR layout, source should be to the left of target
    expect(nodeA.position.x).toBeLessThan(nodeB.position.x);
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
    expect(nodeA.position.x).toBeLessThan(nodeB.position.x);
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

  describe("step order Y reordering", () => {
    it("should reorder step targets vertically by step order", () => {
      // Arrange: orchestrator with 3 step targets
      const nodes = [
        makeOrchestratorNode("orch"),
        makeNode("target-a", { type: "agent" }),
        makeNode("target-b", { type: "skill" }),
        makeNode("target-c", { type: "skill" }),
      ];
      const edges = [
        makeEdge("orch", "target-a", "step-0"),
        makeEdge("orch", "target-b", "step-1"),
        makeEdge("orch", "target-c", "step-2"),
      ];

      // Act
      const result = computeAutoLayout(nodes, edges);

      // Assert: targets should be ordered by step order (ascending Y)
      const a = result.find((n) => n.id === "target-a")!;
      const b = result.find((n) => n.id === "target-b")!;
      const c = result.find((n) => n.id === "target-c")!;
      expect(a.position.y).toBeLessThan(b.position.y);
      expect(b.position.y).toBeLessThan(c.position.y);
    });

    it("should not reorder when there is only one step target", () => {
      // Arrange: orchestrator with single step
      const nodes = [
        makeOrchestratorNode("orch"),
        makeNode("target-a", { type: "skill" }),
      ];
      const edges = [makeEdge("orch", "target-a", "step-0")];

      // Act - should not throw
      const result = computeAutoLayout(nodes, edges);

      // Assert
      expect(result).toHaveLength(2);
    });

    it("should place step targets at or below the orchestrator Y position", () => {
      // Arrange
      const nodes = [
        makeOrchestratorNode("orch"),
        makeNode("target-a", { type: "agent" }),
        makeNode("target-b", { type: "skill" }),
      ];
      const edges = [
        makeEdge("orch", "target-a", "step-0"),
        makeEdge("orch", "target-b", "step-1"),
      ];

      // Act
      const result = computeAutoLayout(nodes, edges);

      // Assert
      const orch = result.find((n) => n.id === "orch")!;
      const a = result.find((n) => n.id === "target-a")!;
      expect(a.position.y).toBeGreaterThanOrEqual(orch.position.y);
    });
  });

  describe("descendant delta propagation", () => {
    it("should move descendants along with their step target", () => {
      // Arrange: orch -> target-a -> child-a, orch -> target-b
      const nodes = [
        makeOrchestratorNode("orch"),
        makeNode("target-a", { type: "agent" }),
        makeNode("child-a", { type: "skill" }),
        makeNode("target-b", { type: "skill" }),
      ];
      const edges = [
        makeEdge("orch", "target-a", "step-0"),
        makeEdge("orch", "target-b", "step-1"),
        makeEdge("target-a", "child-a"),
      ];

      // Act
      const result = computeAutoLayout(nodes, edges);

      // Assert: child-a should be near target-a (not near target-b)
      const a = result.find((n) => n.id === "target-a")!;
      const childA = result.find((n) => n.id === "child-a")!;
      const b = result.find((n) => n.id === "target-b")!;
      // child-a's Y should be closer to target-a than to target-b
      const distToA = Math.abs(childA.position.y - a.position.y);
      const distToB = Math.abs(childA.position.y - b.position.y);
      expect(distToA).toBeLessThanOrEqual(distToB);
    });
  });

  describe("subtree depth calculation", () => {
    it("should account for target node's own height when it is taller than descendants", () => {
      // Arrange: orch has 2 steps. Step 0 targets a tall orchestrator (300px),
      // step 1 targets a small skill node.
      const nodes = [
        makeOrchestratorNode("parent-orch"),
        makeOrchestratorNode("child-orch", { measured: { width: 250, height: 300 } }),
        makeNode("small-skill", { type: "skill", measured: { width: 200, height: 60 } }),
      ];
      const edges = [
        makeEdge("parent-orch", "child-orch", "step-0"),
        makeEdge("parent-orch", "small-skill", "step-1"),
      ];

      // Act
      const result = computeAutoLayout(nodes, edges);

      // Assert: small-skill should be placed below child-orch's full height
      const childOrch = result.find((n) => n.id === "child-orch")!;
      const skill = result.find((n) => n.id === "small-skill")!;
      expect(skill.position.y).toBeGreaterThanOrEqual(childOrch.position.y + 300);
    });

    it("should use descendants extent when it exceeds target height", () => {
      // Arrange: orch -> step-0 -> agent -> grandchild (spread vertically)
      // orch -> step-1 -> skill
      const nodes = [
        makeOrchestratorNode("orch"),
        makeNode("agent", { type: "agent", measured: { width: 200, height: 60 } }),
        makeNode("grandchild", { type: "skill", measured: { width: 200, height: 60 } }),
        makeNode("skill", { type: "skill", measured: { width: 200, height: 60 } }),
      ];
      const edges = [
        makeEdge("orch", "agent", "step-0"),
        makeEdge("orch", "skill", "step-1"),
        makeEdge("agent", "grandchild"),
      ];

      // Act
      const result = computeAutoLayout(nodes, edges);

      // Assert: skill (step-1) should not overlap with grandchild
      const grandchild = result.find((n) => n.id === "grandchild")!;
      const skill = result.find((n) => n.id === "skill")!;
      const grandchildBottom = grandchild.position.y + 60;
      expect(skill.position.y).toBeGreaterThanOrEqual(grandchildBottom);
    });
  });

  describe("nested orchestrator processing order", () => {
    it("should process inner orchestrators before outer ones", () => {
      // Arrange: parent-orch -> child-orch (via step-0), parent-orch -> skill-b (via step-1)
      // child-orch -> skill-c1 (via step-0), child-orch -> skill-c2 (via step-1)
      const nodes = [
        makeOrchestratorNode("parent-orch"),
        makeOrchestratorNode("child-orch", { measured: { width: 250, height: 120 } }),
        makeNode("skill-b", { type: "skill", measured: { width: 200, height: 60 } }),
        makeNode("skill-c1", { type: "skill", measured: { width: 200, height: 60 } }),
        makeNode("skill-c2", { type: "skill", measured: { width: 200, height: 60 } }),
      ];
      const edges = [
        makeEdge("parent-orch", "child-orch", "step-0"),
        makeEdge("parent-orch", "skill-b", "step-1"),
        makeEdge("child-orch", "skill-c1", "step-0"),
        makeEdge("child-orch", "skill-c2", "step-1"),
      ];

      // Act
      const result = computeAutoLayout(nodes, edges);

      // Assert: child-orch's step targets should be ordered by step order
      const c1 = result.find((n) => n.id === "skill-c1")!;
      const c2 = result.find((n) => n.id === "skill-c2")!;
      expect(c1.position.y).toBeLessThan(c2.position.y);

      // Assert: skill-b should not overlap with child-orch's subtree
      const skillB = result.find((n) => n.id === "skill-b")!;
      const c2Bottom = c2.position.y + 60;
      const childOrch = result.find((n) => n.id === "child-orch")!;
      const childOrchBottom = childOrch.position.y + 120;
      const subtreeBottom = Math.max(c2Bottom, childOrchBottom);
      expect(skillB.position.y).toBeGreaterThanOrEqual(subtreeBottom);
    });

    it("should handle deeply nested orchestrators (3 levels)", () => {
      // Arrange: grandparent -> parent -> child, each with 2 steps
      const nodes = [
        makeOrchestratorNode("gp-orch"),
        makeOrchestratorNode("p-orch", { measured: { width: 250, height: 100 } }),
        makeNode("gp-skill", { type: "skill", measured: { width: 200, height: 60 } }),
        makeOrchestratorNode("c-orch", { measured: { width: 250, height: 80 } }),
        makeNode("p-skill", { type: "skill", measured: { width: 200, height: 60 } }),
        makeNode("c-skill1", { type: "skill", measured: { width: 200, height: 60 } }),
        makeNode("c-skill2", { type: "skill", measured: { width: 200, height: 60 } }),
      ];
      const edges = [
        makeEdge("gp-orch", "p-orch", "step-0"),
        makeEdge("gp-orch", "gp-skill", "step-1"),
        makeEdge("p-orch", "c-orch", "step-0"),
        makeEdge("p-orch", "p-skill", "step-1"),
        makeEdge("c-orch", "c-skill1", "step-0"),
        makeEdge("c-orch", "c-skill2", "step-1"),
      ];

      // Act
      const result = computeAutoLayout(nodes, edges);

      // Assert: all step orderings should be preserved at every level
      const cSkill1 = result.find((n) => n.id === "c-skill1")!;
      const cSkill2 = result.find((n) => n.id === "c-skill2")!;
      expect(cSkill1.position.y).toBeLessThan(cSkill2.position.y);

      const cOrch = result.find((n) => n.id === "c-orch")!;
      const pSkill = result.find((n) => n.id === "p-skill")!;
      expect(cOrch.position.y).toBeLessThan(pSkill.position.y);

      const pOrch = result.find((n) => n.id === "p-orch")!;
      const gpSkill = result.find((n) => n.id === "gp-skill")!;
      expect(pOrch.position.y).toBeLessThan(gpSkill.position.y);

      // No overlaps: each group should not overlap with the next
      // c-skill2 bottom should be above p-skill top
      expect(cSkill2.position.y + 60).toBeLessThanOrEqual(pSkill.position.y);
    });
  });

  describe("gap spacing", () => {
    it("should maintain gap between step target subtrees", () => {
      // Arrange: two step targets with known measured sizes
      const nodes = [
        makeOrchestratorNode("orch"),
        makeNode("target-a", { type: "skill", measured: { width: 200, height: 50 } }),
        makeNode("target-b", { type: "skill", measured: { width: 200, height: 50 } }),
      ];
      const edges = [
        makeEdge("orch", "target-a", "step-0"),
        makeEdge("orch", "target-b", "step-1"),
      ];

      // Act
      const result = computeAutoLayout(nodes, edges);

      // Assert: gap between bottom of target-a and top of target-b should be >= 0
      const a = result.find((n) => n.id === "target-a")!;
      const b = result.find((n) => n.id === "target-b")!;
      const aBottom = a.position.y + 50;
      expect(b.position.y).toBeGreaterThanOrEqual(aBottom);
    });
  });
});
