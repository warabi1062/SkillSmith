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
    agentTeams: [],
    ...overrides,
  } as Plugin;
}

const defaultSkillConfigFields = {
  argumentHint: null,
  disableModelInvocation: false,
  userInvocable: true,
  allowedTools: null,
  context: null,
  agent: null,
  model: null,
  hooks: null,
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
    agentConfig: null,
    dependenciesFrom: [],
    files: [],
    ...overrides,
  } as Plugin["components"][number];
}

function createAgentTeam(
  overrides: Partial<Plugin["agentTeams"][number]> = {},
): Plugin["agentTeams"][number] {
  return {
    id: "team-1",
    name: "Team Alpha",
    description: "A team",
    pluginId: "plugin-1",
    orchestratorId: "comp-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    orchestrator: {
      id: "comp-1",
      type: "SKILL" as const,
      pluginId: "plugin-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      skillConfig: createSkillConfig({
        name: "Orchestrator Skill",
        skillType: "ENTRY_POINT",
      }),
    },
    members: [],
    _count: { members: 0 },
    ...overrides,
  } as Plugin["agentTeams"][number];
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

    it("initializes agentTeamModalState as closed", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );
      expect(result.current.agentTeamModalState).toEqual({
        isOpen: false,
      });
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
    it("calls buildGraphData with components and agentTeamsForGraph", () => {
      const comp = createComponent();
      const team = createAgentTeam();
      const plugin = createPlugin({
        components: [comp],
        agentTeams: [team],
      });

      renderHook(() => usePluginGraph(createDefaultParams({ plugin })));

      expect(mockBuildGraphData).toHaveBeenCalledWith(
        [comp],
        [
          {
            id: "team-1",
            name: "Team Alpha",
            description: "A team",
            orchestratorName: "Orchestrator Skill",
          },
        ],
      );
    });

    it("returns empty nodes and edges when no components or agentTeams", () => {
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

    it("injects componentId and pluginId into agent nodes", () => {
      const comp = createComponent({ id: "agent-1", type: "AGENT" });
      const plugin = createPlugin({ components: [comp] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "agent-1", type: "agent", position: { x: 0, y: 0 }, data: { label: "B" } },
        ],
        edges: [],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      const node = result.current.graphDataWithPositions.nodes[0];
      expect(node.data.componentId).toBe("agent-1");
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

    it("injects teamId and pluginId into agentteam nodes", () => {
      const team = createAgentTeam({ id: "team-1" });
      const plugin = createPlugin({ agentTeams: [team] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "agentteam-team-1", type: "agentteam", position: { x: 0, y: 0 }, data: { label: "D" } },
        ],
        edges: [],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      const node = result.current.graphDataWithPositions.nodes[0];
      expect(node.data.teamId).toBe("team-1");
      expect(node.data.pluginId).toBe("plugin-1");
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

    it("includes order when sourceHandle is provided", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleConnect("source-1", "target-1", "step-3");
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        {
          intent: "add-dependency",
          sourceId: "source-1",
          targetId: "target-1",
          order: "3",
        },
        { method: "post" },
      );
    });
  });

  describe("handleEdgeClick", () => {
    it("submits remove-dependency with correct args", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleEdgeClick("dep-1");
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "remove-dependency", dependencyId: "dep-1" },
        { method: "post" },
      );
    });
  });

  describe("handleCreateComponent", () => {
    it("calls onModalStateChange with create mode", () => {
      const onModalStateChange = vi.fn();

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ onModalStateChange })),
      );

      act(() => {
        result.current.handleCreateComponent("SKILL");
      });

      expect(onModalStateChange).toHaveBeenCalledWith({
        isOpen: true,
        mode: "create",
        componentType: "SKILL",
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

  describe("handleManageFiles", () => {
    it("opens filesModalState with componentId", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleManageFiles("comp-1");
      });

      expect(result.current.filesModalState).toEqual({
        isOpen: true,
        componentId: "comp-1",
      });
    });
  });

  describe("handleFilesModalClose", () => {
    it("closes filesModalState", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleManageFiles("comp-1");
      });
      act(() => {
        result.current.handleFilesModalClose();
      });

      expect(result.current.filesModalState).toEqual({ isOpen: false });
    });
  });

  describe("handleCreateAgentTeam", () => {
    it("opens agentTeamModalState in create mode", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleCreateAgentTeam();
      });

      expect(result.current.agentTeamModalState).toEqual({
        isOpen: true,
      });
    });
  });

  describe("handleDeleteAgentTeam", () => {
    it("submits delete-agent-team with correct args", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleDeleteAgentTeam("team-1");
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "delete-agent-team", teamId: "team-1" },
        { method: "post", action: "/plugins/plugin-1" },
      );
    });
  });

  describe("handleAgentTeamModalClose", () => {
    it("closes agentTeamModalState", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleCreateAgentTeam();
      });
      act(() => {
        result.current.handleAgentTeamModalClose();
      });

      expect(result.current.agentTeamModalState).toEqual({
        isOpen: false,
      });
    });
  });

  describe("handleManageMembers / handleMembersModalClose", () => {
    it("calls onMembersModalStateChange with open state", () => {
      const onMembersModalStateChange = vi.fn();

      const { result } = renderHook(() =>
        usePluginGraph(
          createDefaultParams({ onMembersModalStateChange }),
        ),
      );

      act(() => {
        result.current.handleManageMembers("team-1");
      });

      expect(onMembersModalStateChange).toHaveBeenCalledWith({
        isOpen: true,
        teamId: "team-1",
      });
    });

    it("calls onMembersModalStateChange with closed state", () => {
      const onMembersModalStateChange = vi.fn();

      const { result } = renderHook(() =>
        usePluginGraph(
          createDefaultParams({ onMembersModalStateChange }),
        ),
      );

      act(() => {
        result.current.handleMembersModalClose();
      });

      expect(onMembersModalStateChange).toHaveBeenCalledWith({
        isOpen: false,
      });
    });
  });

  describe("handleNodeDragStop", () => {
    it("calls saveGraphPositions with plugin id and positions", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      const positions = { "node-1": { x: 10, y: 20 } };
      act(() => {
        result.current.handleNodeDragStop(positions);
      });

      expect(mockSaveGraphPositions).toHaveBeenCalledWith(
        "plugin-1",
        positions,
      );
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

  describe("handleReorderStep", () => {
    it("submits reorder-dependency with correct args", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleReorderStep("dep-1", "up");
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        { intent: "reorder-dependency", dependencyId: "dep-1", direction: "up" },
        { method: "post" },
      );
    });
  });

  describe("handleDeleteStep", () => {
    it("submits delete-dependencies-batch when confirmed", () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleDeleteStep(["dep-1", "dep-2"]);
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        {
          intent: "delete-dependencies-batch",
          dependencyIds: "dep-1,dep-2",
        },
        { method: "post", action: "/plugins/plugin-1" },
      );
    });

    it("does not submit when cancelled", () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      act(() => {
        result.current.handleDeleteStep(["dep-1"]);
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe("deleteFetcher error monitoring", () => {
    it("sets deleteError when deleteFetcher returns error", () => {
      mockFetcherData.state = "idle";
      mockFetcherData.data = { error: "Cannot delete" };

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      expect(result.current.deleteError).toBe("Cannot delete");
    });
  });

  describe("deleteError clearing", () => {
    it("clears deleteError when handleConnect is called", () => {
      mockFetcherData.state = "idle";
      mockFetcherData.data = { error: "Some error" };

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      expect(result.current.deleteError).toBe("Some error");

      act(() => {
        result.current.handleConnect("a", "b");
      });

      expect(result.current.deleteError).toBeNull();
    });
  });

  describe("entryPointSkills computation", () => {
    it("filters only ENTRY_POINT skills and maps to id/name", () => {
      const entryPoint = createComponent({
        id: "ep-1",
        type: "SKILL",
        skillConfig: createSkillConfig({
          id: "sc-1",
          name: "Entry Point",
          skillType: "ENTRY_POINT",
          componentId: "ep-1",
        }),
      });
      const worker = createComponent({
        id: "w-1",
        type: "SKILL",
        skillConfig: createSkillConfig({
          id: "sc-2",
          name: "Worker",
          skillType: "WORKER",
          componentId: "w-1",
        }),
      });
      const agent = createComponent({
        id: "a-1",
        type: "AGENT",
        skillConfig: null,
        agentConfig: {
          id: "ac-1",
          name: "Agent",
          description: "",
          componentId: "a-1",
          model: null,
          hooks: null,
          tools: null,
          disallowedTools: null,
          permissionMode: null,
          memory: null,
        },
      });
      const plugin = createPlugin({
        components: [entryPoint, worker, agent],
      });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      expect(result.current.entryPointSkills).toEqual([
        { id: "ep-1", skillConfig: { name: "Entry Point" } },
      ]);
    });
  });

  describe("filesModalComponentName computation", () => {
    it("resolves component name from componentId", () => {
      const comp = createComponent({
        id: "comp-1",
        skillConfig: createSkillConfig({
          name: "My Skill",
          componentId: "comp-1",
        }),
      });
      const plugin = createPlugin({ components: [comp] });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      act(() => {
        result.current.handleManageFiles("comp-1");
      });

      expect(result.current.filesModalComponentName).toBe("My Skill");
    });

    it("returns (unknown) when no componentId is set", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      expect(result.current.filesModalComponentName).toBe("(unknown)");
    });
  });

  describe("filesModalFiles computation", () => {
    it("returns files for the selected component", () => {
      const files = [
        {
          id: "f-1",
          filename: "SKILL.md",
          role: "main",
          content: "content",
          sortOrder: 0,
          outputSchemaFields: [],
          componentId: "comp-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const comp = createComponent({
        id: "comp-1",
        files: files as unknown as Plugin["components"][number]["files"],
      });
      const plugin = createPlugin({ components: [comp] });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      act(() => {
        result.current.handleManageFiles("comp-1");
      });

      expect(result.current.filesModalFiles).toHaveLength(1);
      expect(result.current.filesModalFiles[0].id).toBe("f-1");
    });

    it("returns empty array when no componentId is set", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      expect(result.current.filesModalFiles).toEqual([]);
    });
  });

  describe("membersModalTeamName computation", () => {
    it("resolves team name from teamId", () => {
      const team = createAgentTeam({ id: "team-1", name: "Alpha Team" });
      const plugin = createPlugin({ agentTeams: [team] });

      const { result } = renderHook(() =>
        usePluginGraph(
          createDefaultParams({
            plugin,
            membersModalState: { isOpen: true, teamId: "team-1" },
          }),
        ),
      );

      expect(result.current.membersModalTeamName).toBe("Alpha Team");
    });

    it("returns (unknown) when no teamId is set", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      expect(result.current.membersModalTeamName).toBe("(unknown)");
    });
  });

  describe("membersModalMembers computation", () => {
    it("returns members for the selected team", () => {
      const members = [
        {
          id: "m-1",
          teamId: "team-1",
          componentId: "comp-1",
          sortOrder: 0,
          component: {
            id: "comp-1",
            type: "AGENT",
            pluginId: "plugin-1",
            createdAt: new Date(),
            updatedAt: new Date(),
            agentConfig: { name: "Agent A" },
          },
        },
      ];
      const team = createAgentTeam({
        id: "team-1",
        members: members as Plugin["agentTeams"][number]["members"],
      });
      const plugin = createPlugin({ agentTeams: [team] });

      const { result } = renderHook(() =>
        usePluginGraph(
          createDefaultParams({
            plugin,
            membersModalState: { isOpen: true, teamId: "team-1" },
          }),
        ),
      );

      expect(result.current.membersModalMembers).toHaveLength(1);
      expect(result.current.membersModalMembers[0].id).toBe("m-1");
    });

    it("returns empty array when no teamId is set", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      expect(result.current.membersModalMembers).toEqual([]);
    });
  });

  describe("membersModalAgentComponents computation", () => {
    it("filters AGENT components and maps to id/name", () => {
      const skill = createComponent({ id: "s-1", type: "SKILL" });
      const agent = createComponent({
        id: "a-1",
        type: "AGENT",
        skillConfig: null,
        agentConfig: {
          id: "ac-1",
          name: "My Agent",
          description: "",
          componentId: "a-1",
          model: null,
          hooks: null,
          tools: null,
          disallowedTools: null,
          permissionMode: null,
          memory: null,
        },
      });
      const plugin = createPlugin({ components: [skill, agent] });

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      expect(result.current.membersModalAgentComponents).toEqual([
        { id: "a-1", agentConfig: { name: "My Agent" } },
      ]);
    });
  });

  describe("handleModalClose", () => {
    it("calls onModalStateChange with closed state", () => {
      const onModalStateChange = vi.fn();

      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams({ onModalStateChange })),
      );

      act(() => {
        result.current.handleModalClose();
      });

      expect(onModalStateChange).toHaveBeenCalledWith({
        isOpen: false,
        mode: "create",
      });
    });
  });

  describe("auto-layout", () => {
    it("returns autoLayoutPending as false initially", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      expect(result.current.autoLayoutPending).toBe(false);
    });

    it("sets autoLayoutPending to true when fetcher transitions from loading to idle", () => {
      const comp = createComponent();
      const plugin = createPlugin({ components: [comp] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "comp-1", type: "skill", position: { x: 0, y: 0 }, data: { label: "A" } },
        ],
        edges: [],
      });

      // Start with loading state (simulates all fetchers in loading state)
      mockFetcherData.state = "loading";
      const { result, rerender } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      // Transition to idle triggers the auto-layout pending flag
      mockFetcherData.state = "idle";
      rerender();

      expect(result.current.autoLayoutPending).toBe(true);
    });

    it("clears autoLayoutPending when handleAutoLayoutApplied is called", () => {
      const comp = createComponent();
      const plugin = createPlugin({ components: [comp] });

      mockBuildGraphData.mockReturnValue({
        nodes: [
          { id: "comp-1", type: "skill", position: { x: 0, y: 0 }, data: { label: "A" } },
        ],
        edges: [],
      });

      // Start with loading state
      mockFetcherData.state = "loading";
      const { result, rerender } = renderHook(() =>
        usePluginGraph(createDefaultParams({ plugin })),
      );

      // Transition to idle
      mockFetcherData.state = "idle";
      rerender();

      expect(result.current.autoLayoutPending).toBe(true);

      // Apply the layout
      act(() => {
        result.current.handleAutoLayoutApplied();
      });

      expect(result.current.autoLayoutPending).toBe(false);
    });

    it("handlePositionsPersist saves positions via saveGraphPositions", () => {
      const { result } = renderHook(() =>
        usePluginGraph(createDefaultParams()),
      );

      const positions = { "node-1": { x: 50, y: 100 } };
      act(() => {
        result.current.handlePositionsPersist(positions);
      });

      expect(mockSaveGraphPositions).toHaveBeenCalledWith(
        "plugin-1",
        positions,
      );
    });
  });
});
