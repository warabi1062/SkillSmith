// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  usePluginGraph,
  type Plugin,
} from "../usePluginGraph";
import type { LoadedSkillUnion } from "../../lib/types/loader.server";
import type { SkillDependency } from "../../lib/types/plugin";

// --- Mocks ---

const mockBuildGraphData = vi.fn().mockReturnValue({
  nodes: [],
  edges: [],
});

vi.mock("../../lib/build-graph-data", () => ({
  buildGraphData: (...args: unknown[]) => mockBuildGraphData(...args),
}));

const mockLoadGraphPositions = vi.fn().mockReturnValue(null);
const mockSaveGraphPositions = vi.fn();
const mockClearGraphPositions = vi.fn();

vi.mock("../../lib/graph-positions", () => ({
  loadGraphPositions: (...args: unknown[]) => mockLoadGraphPositions(...args),
  saveGraphPositions: (...args: unknown[]) => mockSaveGraphPositions(...args),
  clearGraphPositions: (...args: unknown[]) =>
    mockClearGraphPositions(...args),
}));

// --- Test helpers ---

function createPlugin(overrides: Partial<Plugin> = {}): Plugin {
  return {
    name: "test-plugin",
    description: undefined,
    skills: [],
    dependencies: [],
    ...overrides,
  };
}

function createSkill(overrides: Partial<LoadedSkillUnion> & { name: string; skillType: string }): LoadedSkillUnion {
  return {
    content: "",
    files: [],
    ...overrides,
  } as LoadedSkillUnion;
}

function createDefaultParams(overrides: { plugin?: Plugin } = {}) {
  return {
    plugin: overrides.plugin ?? createPlugin(),
  };
}

// --- Tests ---

describe("usePluginGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildGraphData.mockReturnValue({ nodes: [], edges: [] });
    mockLoadGraphPositions.mockReturnValue(null);
  });

  describe("initial state", () => {
    it("マウント後にisClientがtrueになること", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );
      expect(result.current.isClient).toBe(true);
    });
  });

  describe("graphData construction", () => {
    it("skills と dependencies で buildGraphData を呼ぶこと", () => {
      const skill = createSkill({ name: "my-skill", skillType: "WORKER" });
      const deps: SkillDependency[] = [];
      const plugin = createPlugin({
        skills: [skill],
        dependencies: deps,
      });

      renderHook(() => usePluginGraph(createDefaultParams({ plugin })));

      expect(mockBuildGraphData).toHaveBeenCalledWith([skill], deps);
    });

    it("スキルがない場合は空のnodes/edgesを返すこと", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );
      expect(result.current.graphDataWithPositions).toEqual({
        nodes: [],
        edges: [],
      });
      expect(mockBuildGraphData).not.toHaveBeenCalled();
    });
  });

  describe("graphDataWithPositions", () => {
    it("localStorageから保存済み位置をノードに適用すること", () => {
      const skill = createSkill({ name: "my-skill", skillType: "WORKER" });
      const plugin = createPlugin({ skills: [skill] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "my-skill", position: { x: 0, y: 0 }, data: { label: "A" } },
        ],
        edges: [],
      });
      mockLoadGraphPositions.mockReturnValue({
        "my-skill": { x: 100, y: 200 },
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      expect(result.current.graphDataWithPositions.nodes[0].position).toEqual({
        x: 100,
        y: 200,
      });
    });
  });

  describe("selectedNodeData", () => {
    it("ノード選択でスキルデータが取得できること", () => {
      const skill = createSkill({
        name: "my-skill",
        skillType: "WORKER",
        description: "テスト",
        content: "# Content",
        input: "input",
        output: "output",
      });
      const plugin = createPlugin({ skills: [skill] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "my-skill", type: "skill", position: { x: 0, y: 0 }, data: { label: "my-skill" } },
        ],
        edges: [],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      act(() => {
        result.current.handleNodeClick("my-skill", "component");
      });

      expect(result.current.selectedNodeData).not.toBeNull();
      expect(result.current.selectedNodeData!.name).toBe("my-skill");
      expect(result.current.selectedNodeData!.componentType).toBe("SKILL");
      expect(result.current.selectedNodeData!.description).toBe("テスト");
    });

    it("ENTRY_POINTスキルの場合componentTypeがORCHESTRATORになること", () => {
      const skill = createSkill({
        name: "dev",
        skillType: "ENTRY_POINT",
      });
      const plugin = createPlugin({ skills: [skill] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "dev", type: "orchestrator", position: { x: 0, y: 0 }, data: { label: "dev" } },
        ],
        edges: [],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      act(() => {
        result.current.handleNodeClick("dev", "component");
      });

      expect(result.current.selectedNodeData!.componentType).toBe("ORCHESTRATOR");
    });

    it("サイドパネルを閉じるとselectedNodeDataがnullになること", () => {
      const skill = createSkill({ name: "my-skill", skillType: "WORKER" });
      const plugin = createPlugin({ skills: [skill] });

      mockBuildGraphData.mockReturnValue({
        nodes: [{ id: "my-skill", type: "skill", position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      act(() => {
        result.current.handleNodeClick("my-skill", "component");
      });
      expect(result.current.selectedNodeData).not.toBeNull();

      act(() => {
        result.current.handleSidePanelClose();
      });
      expect(result.current.selectedNodeData).toBeNull();
    });
  });

  describe("編集系ハンドラが削除されていること", () => {
    it("編集系のプロパティが存在しないこと", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );
      expect((result.current as any).handleConnect).toBeUndefined();
      expect((result.current as any).handleEdgeClick).toBeUndefined();
      expect((result.current as any).handleCreateComponent).toBeUndefined();
      expect((result.current as any).handleDeleteComponent).toBeUndefined();
      expect((result.current as any).handleManageFiles).toBeUndefined();
      expect((result.current as any).handleManageMembers).toBeUndefined();
      expect((result.current as any).handleUpdateComponent).toBeUndefined();
      expect((result.current as any).filesModalState).toBeUndefined();
      expect((result.current as any).deleteError).toBeUndefined();
    });
  });

  describe("handleResetLayout", () => {
    it("clearGraphPositionsを呼びresetCounterをインクリメントすること", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      const initialCounter = result.current.resetCounter;
      act(() => {
        result.current.handleResetLayout();
      });

      expect(mockClearGraphPositions).toHaveBeenCalledWith("test-plugin");
      expect(result.current.resetCounter).toBe(initialCounter + 1);
    });
  });
});
