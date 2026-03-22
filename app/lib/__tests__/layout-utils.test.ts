import { describe, expect, it } from "vitest";
import {
  isReachable,
  getDescendants,
  getSubtreeDepth,
  sortOrchestratorsByDepth,
  applyStepOrderPostProcessing,
} from "../layout-utils";

function makeChildrenMap(
  entries: [string, string[]][],
): Map<string, string[]> {
  return new Map(entries);
}

describe("isReachable", () => {
  it("should return true when target is directly reachable", () => {
    // Arrange
    const children = makeChildrenMap([["a", ["b"]]]);

    // Act & Assert
    expect(isReachable("a", "b", children)).toBe(true);
  });

  it("should return true when target is transitively reachable", () => {
    // Arrange
    const children = makeChildrenMap([
      ["a", ["b"]],
      ["b", ["c"]],
    ]);

    // Act & Assert
    expect(isReachable("a", "c", children)).toBe(true);
  });

  it("should return false when target is not reachable", () => {
    // Arrange
    const children = makeChildrenMap([["a", ["b"]]]);

    // Act & Assert
    expect(isReachable("b", "a", children)).toBe(false);
  });

  it("should return false for self-reference (from === to)", () => {
    // Arrange
    const children = makeChildrenMap([["a", ["b"]]]);

    // Act & Assert
    expect(isReachable("a", "a", children)).toBe(false);
  });

  it("should return false when from node has no children", () => {
    // Arrange
    const children = makeChildrenMap([]);

    // Act & Assert
    expect(isReachable("a", "b", children)).toBe(false);
  });
});

describe("getDescendants", () => {
  it("should collect direct children", () => {
    // Arrange
    const children = makeChildrenMap([["a", ["b", "c"]]]);
    const excludeSet = new Set<string>();

    // Act
    const result = getDescendants("a", children, excludeSet);

    // Assert
    expect(result).toEqual(expect.arrayContaining(["b", "c"]));
    expect(result).toHaveLength(2);
  });

  it("should collect transitive descendants", () => {
    // Arrange
    const children = makeChildrenMap([
      ["a", ["b"]],
      ["b", ["c"]],
    ]);
    const excludeSet = new Set<string>();

    // Act
    const result = getDescendants("a", children, excludeSet);

    // Assert
    expect(result).toEqual(expect.arrayContaining(["b", "c"]));
    expect(result).toHaveLength(2);
  });

  it("should not traverse through nodes in excludeSet", () => {
    // Arrange
    const children = makeChildrenMap([
      ["a", ["b", "c"]],
      ["b", ["d"]],
    ]);
    const excludeSet = new Set(["b"]);

    // Act
    const result = getDescendants("a", children, excludeSet);

    // Assert - b and d should be excluded (b is in excludeSet, d is behind b)
    expect(result).toEqual(["c"]);
  });

  it("should return empty array for leaf node", () => {
    // Arrange
    const children = makeChildrenMap([]);

    // Act
    const result = getDescendants("leaf", children, new Set());

    // Assert
    expect(result).toEqual([]);
  });

  it("should not include the root itself in the result", () => {
    // Arrange
    const children = makeChildrenMap([["a", ["b"]]]);

    // Act
    const result = getDescendants("a", children, new Set());

    // Assert
    expect(result).not.toContain("a");
  });
});

describe("getSubtreeDepth", () => {
  it("should return target height when target has no descendants", () => {
    // Arrange
    const children = makeChildrenMap([]);
    const positions = new Map([["a", { x: 0, y: 0 }]]);
    const getPosition = (id: string) => positions.get(id);
    const getSize = () => ({ width: 200, height: 100 });

    // Act
    const result = getSubtreeDepth("a", children, new Set(), getPosition, getSize);

    // Assert
    expect(result).toBe(100);
  });

  it("should return extent when descendants spread beyond target height", () => {
    // Arrange
    const children = makeChildrenMap([["a", ["b"]]]);
    const positions = new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 100, y: 150 }],
    ]);
    const getPosition = (id: string) => positions.get(id);
    const getSize = () => ({ width: 200, height: 60 });

    // Act
    const result = getSubtreeDepth("a", children, new Set(), getPosition, getSize);

    // Assert - extent from y=0 to y=150+60=210
    expect(result).toBe(210);
  });

  it("should return target height when it is taller than descendants extent", () => {
    // Arrange
    const children = makeChildrenMap([["a", ["b"]]]);
    const positions = new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 100, y: 10 }],
    ]);
    const getPosition = (id: string) => positions.get(id);
    const sizes: Record<string, { width: number; height: number }> = {
      a: { width: 200, height: 300 },
      b: { width: 200, height: 60 },
    };
    const getSize = (id: string) => sizes[id] ?? { width: 200, height: 60 };

    // Act
    const result = getSubtreeDepth("a", children, new Set(), getPosition, getSize);

    // Assert - target height (300) > descendants extent (10+60-0=70)
    expect(result).toBe(300);
  });

  it("should return target height when getPosition returns undefined", () => {
    // Arrange
    const children = makeChildrenMap([["a", ["b"]]]);
    const getPosition = () => undefined;
    const getSize = () => ({ width: 200, height: 80 });

    // Act
    const result = getSubtreeDepth("a", children, new Set(), getPosition, getSize);

    // Assert
    expect(result).toBe(80);
  });
});

describe("sortOrchestratorsByDepth", () => {
  it("should sort inner orchestrators before outer ones", () => {
    // Arrange
    const children = makeChildrenMap([
      ["outer", ["inner"]],
      ["inner", ["leaf"]],
    ]);

    // Act
    const sorted = sortOrchestratorsByDepth(["outer", "inner"], children);

    // Assert - inner should come first
    expect(sorted).toEqual(["inner", "outer"]);
  });

  it("should handle unrelated orchestrators (no nesting)", () => {
    // Arrange
    const children = makeChildrenMap([
      ["a", ["x"]],
      ["b", ["y"]],
    ]);

    // Act
    const sorted = sortOrchestratorsByDepth(["a", "b"], children);

    // Assert - order should be stable (no reordering)
    expect(sorted).toEqual(["a", "b"]);
  });

  it("should handle deeply nested orchestrators", () => {
    // Arrange
    const children = makeChildrenMap([
      ["gp", ["p"]],
      ["p", ["c"]],
      ["c", ["leaf"]],
    ]);

    // Act
    const sorted = sortOrchestratorsByDepth(["gp", "p", "c"], children);

    // Assert - innermost first
    expect(sorted).toEqual(["c", "p", "gp"]);
  });
});

describe("applyStepOrderPostProcessing", () => {
  it("should reorder step targets vertically by step order", () => {
    // Arrange
    const positions = new Map([
      ["orch", { x: 0, y: 0 }],
      ["a", { x: 100, y: 50 }],
      ["b", { x: 100, y: 0 }],
    ]);
    const edges = [
      { source: "orch", target: "a", sourceHandle: "step-0" },
      { source: "orch", target: "b", sourceHandle: "step-1" },
    ];
    const childrenMap = new Map([["orch", ["a", "b"]]]);
    const getSize = () => ({ width: 200, height: 60 });

    // Act
    applyStepOrderPostProcessing({
      edges,
      orchestratorIds: ["orch"],
      childrenMap,
      getPosition: (id) => positions.get(id),
      setPosition: (id, pos) => positions.set(id, pos),
      getSize,
    });

    // Assert - a (step-0) should be above b (step-1)
    expect(positions.get("a")!.y).toBeLessThan(positions.get("b")!.y);
    // a should start at orch Y
    expect(positions.get("a")!.y).toBe(0);
    // b should start at orch Y + a height + gap
    expect(positions.get("b")!.y).toBe(70); // 60 + 10
  });

  it("should skip orchestrators with fewer than 2 step targets", () => {
    // Arrange
    const positions = new Map([
      ["orch", { x: 0, y: 0 }],
      ["a", { x: 100, y: 50 }],
    ]);
    const edges = [
      { source: "orch", target: "a", sourceHandle: "step-0" },
    ];
    const childrenMap = new Map([["orch", ["a"]]]);
    const getSize = () => ({ width: 200, height: 60 });

    // Act
    applyStepOrderPostProcessing({
      edges,
      orchestratorIds: ["orch"],
      childrenMap,
      getPosition: (id) => positions.get(id),
      setPosition: (id, pos) => positions.set(id, pos),
      getSize,
    });

    // Assert - position should remain unchanged
    expect(positions.get("a")!.y).toBe(50);
  });

  it("should propagate delta to descendants", () => {
    // Arrange
    const positions = new Map([
      ["orch", { x: 0, y: 0 }],
      ["a", { x: 100, y: 80 }],
      ["a-child", { x: 200, y: 90 }],
      ["b", { x: 100, y: 0 }],
    ]);
    const edges = [
      { source: "orch", target: "a", sourceHandle: "step-0" },
      { source: "orch", target: "b", sourceHandle: "step-1" },
      { source: "a", target: "a-child" },
    ];
    const childrenMap = new Map([
      ["orch", ["a", "b"]],
      ["a", ["a-child"]],
    ]);
    const getSize = () => ({ width: 200, height: 60 });

    const originalAChildOffset = positions.get("a-child")!.y - positions.get("a")!.y;

    // Act
    applyStepOrderPostProcessing({
      edges,
      orchestratorIds: ["orch"],
      childrenMap,
      getPosition: (id) => positions.get(id),
      setPosition: (id, pos) => positions.set(id, pos),
      getSize,
    });

    // Assert - a-child should maintain its relative offset from a
    const newAY = positions.get("a")!.y;
    const newAChildY = positions.get("a-child")!.y;
    expect(newAChildY - newAY).toBe(originalAChildOffset);
  });

  it("should handle NaN sourceHandle order by falling back to 0", () => {
    // Arrange
    const positions = new Map([
      ["orch", { x: 0, y: 0 }],
      ["a", { x: 100, y: 50 }],
      ["b", { x: 100, y: 0 }],
    ]);
    const edges = [
      { source: "orch", target: "a", sourceHandle: "step-undefined" },
      { source: "orch", target: "b", sourceHandle: "step-1" },
    ];
    const childrenMap = new Map([["orch", ["a", "b"]]]);
    const getSize = () => ({ width: 200, height: 60 });

    // Act - should not throw
    applyStepOrderPostProcessing({
      edges,
      orchestratorIds: ["orch"],
      childrenMap,
      getPosition: (id) => positions.get(id),
      setPosition: (id, pos) => positions.set(id, pos),
      getSize,
    });

    // Assert - "step-undefined" parses to NaN -> falls back to 0, so a (order 0) before b (order 1)
    expect(positions.get("a")!.y).toBeLessThan(positions.get("b")!.y);
  });

  it("should add delta === 0 nodes to moved set (defensive)", () => {
    // Arrange: shared descendant reachable from both step targets.
    // If target-a has delta=0, its descendants should still be marked as moved
    // so they won't be double-moved by target-b.
    const positions = new Map([
      ["orch", { x: 0, y: 0 }],
      ["a", { x: 100, y: 0 }], // will get delta = 0 (already at orchY)
      ["shared", { x: 200, y: 10 }],
      ["b", { x: 100, y: 80 }],
    ]);
    const edges = [
      { source: "orch", target: "a", sourceHandle: "step-0" },
      { source: "orch", target: "b", sourceHandle: "step-1" },
      { source: "a", target: "shared" },
      { source: "b", target: "shared" },
    ];
    const childrenMap = new Map([
      ["orch", ["a", "b"]],
      ["a", ["shared"]],
      ["b", ["shared"]],
    ]);
    const getSize = () => ({ width: 200, height: 60 });

    // Act
    applyStepOrderPostProcessing({
      edges,
      orchestratorIds: ["orch"],
      childrenMap,
      getPosition: (id) => positions.get(id),
      setPosition: (id, pos) => positions.set(id, pos),
      getSize,
    });

    // Assert - shared should not have been moved by b's delta (since it was
    // already processed as a's descendant even though a's delta was 0)
    // shared's Y should remain at its original value (10) since a's delta is 0
    expect(positions.get("shared")!.y).toBe(10);
  });

  it("should handle nested orchestrators correctly", () => {
    // Arrange
    const positions = new Map([
      ["outer", { x: 0, y: 0 }],
      ["inner", { x: 100, y: 50 }],
      ["inner-a", { x: 200, y: 40 }],
      ["inner-b", { x: 200, y: 100 }],
      ["outer-b", { x: 100, y: 120 }],
    ]);
    const edges = [
      { source: "outer", target: "inner", sourceHandle: "step-0" },
      { source: "outer", target: "outer-b", sourceHandle: "step-1" },
      { source: "inner", target: "inner-a", sourceHandle: "step-0" },
      { source: "inner", target: "inner-b", sourceHandle: "step-1" },
    ];
    const childrenMap = new Map([
      ["outer", ["inner", "outer-b"]],
      ["inner", ["inner-a", "inner-b"]],
    ]);
    const getSize = () => ({ width: 200, height: 60 });

    // Act
    applyStepOrderPostProcessing({
      edges,
      orchestratorIds: ["outer", "inner"],
      childrenMap,
      getPosition: (id) => positions.get(id),
      setPosition: (id, pos) => positions.set(id, pos),
      getSize,
    });

    // Assert - inner step targets should be ordered
    expect(positions.get("inner-a")!.y).toBeLessThan(
      positions.get("inner-b")!.y,
    );
    // outer step targets should be ordered
    expect(positions.get("inner")!.y).toBeLessThan(
      positions.get("outer-b")!.y,
    );
  });
});
