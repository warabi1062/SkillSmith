// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SidePanel from "../SidePanel";
import type { SidePanelProps } from "../SidePanel";

afterEach(() => {
  cleanup();
});

function renderPanel(overrides: Partial<SidePanelProps> = {}) {
  const defaultProps: SidePanelProps = {
    nodeId: "comp-1",
    nodeType: "component",
    componentType: "SKILL",
    name: "my-skill",
    description: "A test skill",
    content: "",
    input: "",
    output: "",
    skillType: "WORKER",
    hasAgentConfig: false,
    agentConfig: null,
    orchestratorName: null,
    onUpdateComponent: vi.fn(),
    onUpdateAgentTeam: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const result = render(<SidePanel {...defaultProps} />);
  return { ...result, props: defaultProps };
}

describe("SidePanel", () => {
  describe("SKILLノードの表示", () => {
    it("名前と説明のフィールドを表示する", () => {
      renderPanel({
        componentType: "SKILL",
        name: "my-skill",
        description: "Skill description",
        skillType: "WORKER",
      });
      expect(screen.getByDisplayValue("my-skill")).toBeTruthy();
      expect(screen.getByDisplayValue("Skill description")).toBeTruthy();
      expect(screen.getByText("WORKER")).toBeTruthy();
    });

    it("SKILLバッジを表示する", () => {
      renderPanel({ componentType: "SKILL" });
      expect(screen.getByText("SKILL")).toBeTruthy();
    });
  });

  describe("ORCHESTRATORノードの表示", () => {
    it("名前と説明のフィールドとskillTypeを表示する", () => {
      renderPanel({
        componentType: "ORCHESTRATOR",
        name: "my-orchestrator",
        description: "Orchestrator description",
        skillType: "ENTRY_POINT",
      });
      expect(screen.getByDisplayValue("my-orchestrator")).toBeTruthy();
      expect(screen.getByDisplayValue("Orchestrator description")).toBeTruthy();
      expect(screen.getByText("ENTRY_POINT")).toBeTruthy();
    });
  });

  describe("AGENT TEAMノードの表示", () => {
    it("名前、説明、orchestratorNameを表示する", () => {
      renderPanel({
        nodeType: "agentTeam",
        componentType: "AGENT_TEAM",
        name: "my-team",
        description: "Team description",
        orchestratorName: "dev",
      });
      expect(screen.getByDisplayValue("my-team")).toBeTruthy();
      expect(screen.getByDisplayValue("Team description")).toBeTruthy();
      expect(screen.getByText("dev")).toBeTruthy();
    });

    it("AGENT TEAMバッジを表示する", () => {
      renderPanel({
        nodeType: "agentTeam",
        componentType: "AGENT_TEAM",
      });
      expect(screen.getByText("AGENT TEAM")).toBeTruthy();
    });
  });

  describe("AgentConfig編集セクション", () => {
    it("WORKER Skill + agentConfig有りの場合にAgentConfigフィールドを表示する", () => {
      renderPanel({
        componentType: "SKILL",
        skillType: "WORKER",
        hasAgentConfig: true,
        agentConfig: {
          model: "sonnet",
          tools: '["Read"]',
          disallowedTools: "",
          permissionMode: "bypassPermissions",
          hooks: "",
          memory: "",
          agentContent: "# Agent body",
        },
      });
      expect(screen.getByText("Agent Config")).toBeTruthy();
      expect(screen.getByDisplayValue("sonnet")).toBeTruthy();
      expect(screen.getByDisplayValue('["Read"]')).toBeTruthy();
      expect(screen.getByDisplayValue("bypassPermissions")).toBeTruthy();
      expect(screen.getByDisplayValue("# Agent body")).toBeTruthy();
    });

    it("ENTRY_POINT SkillにはAgentConfig編集セクションを表示しない", () => {
      renderPanel({
        componentType: "ORCHESTRATOR",
        skillType: "ENTRY_POINT",
        hasAgentConfig: false,
        agentConfig: null,
      });
      expect(screen.queryByText("Agent Config")).toBeNull();
    });

    it("WORKER Skill + agentConfig無しの場合にAgentConfig編集セクションを表示しない", () => {
      renderPanel({
        componentType: "SKILL",
        skillType: "WORKER",
        hasAgentConfig: false,
        agentConfig: null,
      });
      expect(screen.queryByText("Agent Config")).toBeNull();
    });
  });

  describe("保存コールバック", () => {
    it("componentノードの保存時にonUpdateComponentを呼ぶ", () => {
      const onUpdateComponent = vi.fn();
      renderPanel({
        nodeId: "comp-1",
        nodeType: "component",
        componentType: "SKILL",
        name: "old-name",
        description: "desc",
        skillType: "WORKER",
        onUpdateComponent,
      });

      const nameInput = screen.getByDisplayValue("old-name");
      fireEvent.change(nameInput, { target: { value: "new-name" } });

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      expect(onUpdateComponent).toHaveBeenCalledWith("comp-1", {
        name: "new-name",
        description: "desc",
        content: "",
        input: "",
        output: "",
        skillType: "WORKER",
      });
    });

    it("agentTeamノードの保存時にonUpdateAgentTeamを呼ぶ", () => {
      const onUpdateAgentTeam = vi.fn();
      renderPanel({
        nodeId: "team-1",
        nodeType: "agentTeam",
        componentType: "AGENT_TEAM",
        name: "old-team",
        description: "team desc",
        onUpdateAgentTeam,
      });

      const nameInput = screen.getByDisplayValue("old-team");
      fireEvent.change(nameInput, { target: { value: "new-team" } });

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      expect(onUpdateAgentTeam).toHaveBeenCalledWith("team-1", {
        name: "new-team",
        description: "team desc",
      });
    });

    it("WORKER Skill + agentConfig有りの保存時にagentConfigフィールドが含まれる", () => {
      const onUpdateComponent = vi.fn();
      renderPanel({
        nodeId: "comp-1",
        nodeType: "component",
        componentType: "SKILL",
        name: "my-skill",
        description: "desc",
        skillType: "WORKER",
        hasAgentConfig: true,
        agentConfig: {
          model: "sonnet",
          tools: "",
          disallowedTools: "",
          permissionMode: "",
          hooks: "",
          memory: "",
          agentContent: "# body",
        },
        onUpdateComponent,
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      const call = onUpdateComponent.mock.calls[0];
      expect(call[1].agentConfig).toBeDefined();
      expect(call[1].agentConfig.model).toBe("sonnet");
      expect(call[1].agentConfig.agentContent).toBe("# body");
    });
  });

  describe("閉じるボタン", () => {
    it("閉じるボタンをクリックするとonCloseが呼ばれる", () => {
      const onClose = vi.fn();
      renderPanel({ onClose });

      const closeButton = screen.getByRole("button", { name: "Close" });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("フォームの初期値同期", () => {
    it("propsが変わるとフォーム値がリセットされる", () => {
      const { rerender, props } = renderPanel({
        nodeId: "comp-1",
        name: "original",
        description: "original desc",
      });

      const nameInput = screen.getByDisplayValue("original");
      fireEvent.change(nameInput, { target: { value: "edited" } });
      expect(screen.getByDisplayValue("edited")).toBeTruthy();

      rerender(
        <SidePanel
          {...props}
          nodeId="comp-2"
          name="other-node"
          description="other desc"
        />,
      );

      expect(screen.getByDisplayValue("other-node")).toBeTruthy();
      expect(screen.getByDisplayValue("other desc")).toBeTruthy();
    });
  });

  describe("ノード切り替え時の自動保存", () => {
    it("ノードを切り替えたときに前のノードの編集値が自動保存される", () => {
      const onUpdateComponent = vi.fn();
      const { rerender, props } = renderPanel({
        nodeId: "comp-1",
        nodeType: "component",
        componentType: "SKILL",
        name: "original",
        description: "original desc",
        skillType: "WORKER",
        onUpdateComponent,
      });

      const nameInput = screen.getByDisplayValue("original");
      fireEvent.change(nameInput, { target: { value: "edited-name" } });

      rerender(
        <SidePanel
          {...props}
          nodeId="comp-2"
          name="other-node"
          description="other desc"
        />,
      );

      expect(onUpdateComponent).toHaveBeenCalledWith("comp-1", {
        name: "edited-name",
        description: "original desc",
        content: "",
        input: "",
        output: "",
        skillType: "WORKER",
      });
    });

    it("agentTeamノードの切り替え時にonUpdateAgentTeamが呼ばれる", () => {
      const onUpdateAgentTeam = vi.fn();
      const { rerender, props } = renderPanel({
        nodeId: "team-1",
        nodeType: "agentTeam",
        componentType: "AGENT_TEAM",
        name: "team-name",
        description: "team desc",
        onUpdateAgentTeam,
      });

      const nameInput = screen.getByDisplayValue("team-name");
      fireEvent.change(nameInput, { target: { value: "edited-team" } });

      rerender(
        <SidePanel
          {...props}
          nodeId="team-2"
          name="other-team"
          description="other desc"
        />,
      );

      expect(onUpdateAgentTeam).toHaveBeenCalledWith("team-1", {
        name: "edited-team",
        description: "team desc",
      });
    });

    it("前のノードの名前が空文字の場合は自動保存しない", () => {
      const onUpdateComponent = vi.fn();
      const { rerender, props } = renderPanel({
        nodeId: "comp-1",
        nodeType: "component",
        componentType: "SKILL",
        name: "original",
        description: "desc",
        onUpdateComponent,
      });

      const nameInput = screen.getByDisplayValue("original");
      fireEvent.change(nameInput, { target: { value: "   " } });

      rerender(
        <SidePanel
          {...props}
          nodeId="comp-2"
          name="other-node"
          description="other desc"
        />,
      );

      expect(onUpdateComponent).not.toHaveBeenCalled();
    });
  });

  describe("空文字バリデーション", () => {
    it("名前が空文字の場合は保存を実行しない", () => {
      const onUpdateComponent = vi.fn();
      renderPanel({
        nodeId: "comp-1",
        nodeType: "component",
        componentType: "SKILL",
        name: "my-skill",
        onUpdateComponent,
      });

      const nameInput = screen.getByDisplayValue("my-skill");
      fireEvent.change(nameInput, { target: { value: "" } });

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      expect(onUpdateComponent).not.toHaveBeenCalled();
    });

    it("名前が空白のみの場合も保存を実行しない", () => {
      const onUpdateComponent = vi.fn();
      renderPanel({
        nodeId: "comp-1",
        nodeType: "component",
        componentType: "SKILL",
        name: "my-skill",
        onUpdateComponent,
      });

      const nameInput = screen.getByDisplayValue("my-skill");
      fireEvent.change(nameInput, { target: { value: "   " } });

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      expect(onUpdateComponent).not.toHaveBeenCalled();
    });
  });
});
