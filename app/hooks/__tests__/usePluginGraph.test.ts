// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  usePluginGraph,
  type Plugin,
  type ModalState,
  type MembersModalState,
} from "../usePluginGraph";

// --- Mocks ---

const mockSubmit = vi.fn();
const mockFetcherData: Record<string, unknown> = {};

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: mockSubmit,
    state: mockFetcherData.state ?? "idle",
    data: mockFetcherData.data ?? undefined,
    formMethod: undefined,
    formAction: undefined,
    formEncType: undefined,
    text: undefined,
    formData: undefined,
    json: undefined,
    Form: () => null,
    load: vi.fn(),
    reset: vi.fn(),
  }),
}));

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

const mockComputeAutoLayout = vi.fn().mockReturnValue([]);

vi.mock("../../lib/auto-layout", () => ({
  computeAutoLayout: (...args: unknown[]) => mockComputeAutoLayout(...args),
}));

vi.mock("../../lib/graph-positions", () => ({
  loadGraphPositions: (...args: unknown[]) => mockLoadGraphPositions(...args),
  saveGraphPositions: (...args: unknown[]) => mockSaveGraphPositions(...args),
  clearGraphPositions: (...args: unknown[]) =>
    mockClearGraphPositions(...args),
}));

// --- Test helpers ---

function createPlugin(overrides: Partial<Plugin> = {}): Plugin {
  return {
    id: "plugin-1",
    name: "Test Plugin",
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    components: [],
    ...overrides,
  } as Plugin;
}

const defaultSkillConfigFields = {
  argumentHint: null,
  allowedTools: null,
  content: "",
};

function createSkillConfig(
  overrides: Partial<Plugin["components"][number]["skillConfig"] & object> = {},
): Plugin["components"][number]["skillConfig"] {
  return {
    id: "sc-1",
    name: "My Skill",
    description: "desc",
    skillType: "WORKER",
    componentId: "comp-1",
    agentConfig: null,
    ...defaultSkillConfigFields,
    ...overrides,
  } as Plugin["components"][number]["skillConfig"];
}

function createComponent(
  overrides: Partial<Plugin["components"][number]> = {},
): Plugin["components"][number] {
  return {
    id: "comp-1",
    type: "SKILL",
    pluginId: "plugin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    skillConfig: createSkillConfig(),
    dependenciesFrom: [],
    files: [],
    ...overrides,
  } as Plugin["components"][number];
}

interface DefaultParamsOptions {
  plugin?: Plugin;
  modalState?: ModalState;
  onModalStateChange?: (state: ModalState) => void;
  membersModalState?: MembersModalState;
  onMembersModalStateChange?: (state: MembersModalState) => void;
}

function createDefaultParams(overrides: DefaultParamsOptions = {}) {
  return {
    plugin: overrides.plugin ?? createPlugin(),
    modalState: overrides.modalState ?? { isOpen: false, mode: "create" as const },
    onModalStateChange: overrides.onModalStateChange ?? vi.fn(),
    membersModalState: overrides.membersModalState ?? { isOpen: false },
    onMembersModalStateChange: overrides.onMembersModalStateChange ?? vi.fn(),
  };
}

// --- Tests ---

describe("usePluginGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetcherData.state = "idle";
    mockFetcherData.data = undefined;
    mockBuildGraphData.mockReturnValue({ nodes: [], edges: [] });
    mockLoadGraphPositions.mockReturnValue(null);
    mockComputeAutoLayout.mockReturnValue([]);
  });

  describe("initial state", () => {
    it("sets isClient to true after mount", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );
      expect(result.current.isClient).toBe(true);
    });

    it("initializes filesModalState as closed", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );
      expect(result.current.filesModalState).toEqual({ isOpen: false });
    });

    it("initializes deleteError as null", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );
      expect(result.current.deleteError).toBeNull();
    });
  });

  describe("graphData construction", () => {
    it("calls buildGraphData with components only", () => {
      const comp = createComponent();
      const plugin = createPlugin({
        components: [comp],
      });

      renderHook(() => usePluginGraph(createDefaultParams({ plugin })));

      expect(mockBuildGraphData).toHaveBeenCalledWith([comp]);
    });

    it("returns empty nodes and edges when no components", () => {
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
    it("applies saved positions from localStorage to nodes", () => {
      const comp = createComponent();
      const plugin = createPlugin({ components: [comp] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "comp-1", position: { x: 0, y: 0 }, data: { label: "A" } },
        ],
        edges: [],
      });
      mockLoadGraphPositions.mockReturnValue({
        "comp-1": { x: 100, y: 200 },
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

  describe("node data injection", () => {
    it("injects componentId and pluginId into skill nodes", () => {
      const comp = createComponent({ id: "comp-1", type: "SKILL" });
      const plugin = createPlugin({ components: [comp] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "comp-1", type: "skill", position: { x: 0, y: 0 }, data: { label: "A" } },
        ],
        edges: [],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      const node = result.current.graphDataWithPositions.nodes[0];
      expect(node.data.componentId).toBe("comp-1");
      expect(node.data.pluginId).toBe("plugin-1");
    });

    it("injects componentId and pluginId into orchestrator nodes", () => {
      const comp = createComponent({ id: "orch-1", type: "SKILL" });
      const plugin = createPlugin({ components: [comp] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "orch-1", type: "orchestrator", position: { x: 0, y: 0 }, data: { label: "C" } },
        ],
        edges: [],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      const node = result.current.graphDataWithPositions.nodes[0];
      expect(node.data.componentId).toBe("orch-1");
      expect(node.data.pluginId).toBe("plugin-1");
    });
  });

  describe("handleCreateComponent", () => {
    it("calls onModalStateChange with create mode", () => {
      const onModalStateChange = vi.fn();

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ onModalStateChange })),
      );

      act(() => {
        result.current.handleCreateComponent();
      });

      expect(onModalStateChange).toHaveBeenCalledWith({
        isOpen: true,
        mode: "create",
      });
    });
  });

  describe("handleDeleteComponent", () => {
    it("submits delete-component with correct args", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleDeleteComponent("comp-1");
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "delete-component", componentId: "comp-1" },
        { method: "post", action: "/plugins/plugin-1" },
      );
    });
  });

  describe("handleConnect", () => {
    it("submits add-dependency with correct args", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleConnect("source-1", "target-1");
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "add-dependency", sourceId: "source-1", targetId: "target-1" },
        { method: "post" },
      );
    });
  });

  describe("handleManageMembers", () => {
    it("calls onMembersModalStateChange with agentTeamComponentId", () => {
      const onMembersModalStateChange = vi.fn();

      const { result } = renderHook(() =>
        usePluginGraph(
          createDefaultParams({ onMembersModalStateChange }),
        ),
      );

      act(() => {
        result.current.handleManageMembers("comp-team-1");
      });

      expect(onMembersModalStateChange).toHaveBeenCalledWith({
        isOpen: true,
        agentTeamComponentId: "comp-team-1",
      });
    });
  });

  describe("membersModalAgentComponents computation", () => {
    it("filters WORKER_WITH_SUB_AGENT Skill components", () => {
      const workerWithSubAgent = createComponent({
        id: "w-1",
        type: "SKILL",
        skillConfig: createSkillConfig({
          id: "sc-1",
          name: "Worker With Agent",
          skillType: "WORKER_WITH_SUB_AGENT",
          componentId: "w-1",
        }),
      });
      const workerPlain = createComponent({
        id: "w-2",
        type: "SKILL",
        skillConfig: createSkillConfig({
          id: "sc-2",
          name: "Worker Plain",
          skillType: "WORKER",
          componentId: "w-2",
        }),
      });
      const entryPoint = createComponent({
        id: "ep-1",
        type: "SKILL",
        skillConfig: createSkillConfig({
          id: "sc-3",
          name: "Entry Point",
          skillType: "ENTRY_POINT",
          componentId: "ep-1",
        }),
      });
      const plugin = createPlugin({
        components: [workerWithSubAgent, workerPlain, entryPoint],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      expect(result.current.membersModalAgentComponents).toEqual([
        { id: "w-1", skillConfig: { name: "Worker With Agent" } },
      ]);
    });
  });

  describe("agentTeam related state/handler removed", () => {
    it("does not expose agentTeamModalState", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );
      // agentTeamModalState, handleCreateAgentTeam, handleDeleteAgentTeamは廃止
      expect((result.current as any).agentTeamModalState).toBeUndefined();
      expect((result.current as any).handleCreateAgentTeam).toBeUndefined();
      expect((result.current as any).handleDeleteAgentTeam).toBeUndefined();
      expect((result.current as any).handleAgentTeamModalClose).toBeUndefined();
      expect((result.current as any).agentTeamFetcher).toBeUndefined();
      expect((result.current as any).handleAddAgentConfig).toBeUndefined();
      expect((result.current as any).handleRemoveAgentConfig).toBeUndefined();
    });
  });

  describe("handleResetLayout", () => {
    it("calls clearGraphPositions and increments resetCounter", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      const initialCounter = result.current.resetCounter;
      act(() => {
        result.current.handleResetLayout();
      });

      expect(mockClearGraphPositions).toHaveBeenCalledWith("plugin-1");
      expect(result.current.resetCounter).toBe(initialCounter + 1);
    });
  });
});
