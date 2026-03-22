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
    skillType: "WORKER",
    orchestratorName: null,
    mainFileId: null,
    mainFileContent: null,
    onUpdateComponent: vi.fn(),
    onUpdateAgentTeam: vi.fn(),
    onUpdateMainFile: vi.fn(),
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
      // 名前の入力フィールド
      expect(screen.getByDisplayValue("my-skill")).toBeTruthy();
      // 説明のテキストエリア
      expect(screen.getByDisplayValue("Skill description")).toBeTruthy();
      // skillTypeを読み取り専用で表示
      expect(screen.getByText("WORKER")).toBeTruthy();
    });

    it("SKILLバッジを表示する", () => {
      renderPanel({ componentType: "SKILL" });
      expect(screen.getByText("SKILL")).toBeTruthy();
    });
  });

  describe("AGENTノードの表示", () => {
    it("名前と説明のフィールドを表示する", () => {
      renderPanel({
        componentType: "AGENT",
        name: "my-agent",
        description: "Agent description",
        skillType: null,
      });
      expect(screen.getByDisplayValue("my-agent")).toBeTruthy();
      expect(screen.getByDisplayValue("Agent description")).toBeTruthy();
    });

    it("AGENTバッジを表示する", () => {
      renderPanel({ componentType: "AGENT" });
      expect(screen.getByText("AGENT")).toBeTruthy();
    });

    it("skillTypeを表示しない", () => {
      renderPanel({ componentType: "AGENT", skillType: null });
      expect(screen.queryByText("Skill Type")).toBeNull();
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

      // 名前を変更（未保存）
      const nameInput = screen.getByDisplayValue("original");
      fireEvent.change(nameInput, { target: { value: "edited" } });
      expect(screen.getByDisplayValue("edited")).toBeTruthy();

      // propsが変わる（別ノード選択）
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

      // 名前を変更（未保存）
      const nameInput = screen.getByDisplayValue("original");
      fireEvent.change(nameInput, { target: { value: "edited-name" } });

      // 別ノードに切り替え
      rerender(
        <SidePanel
          {...props}
          nodeId="comp-2"
          name="other-node"
          description="other desc"
        />,
      );

      // 前のノードの値で自動保存が呼ばれる
      expect(onUpdateComponent).toHaveBeenCalledWith("comp-1", {
        name: "edited-name",
        description: "original desc",
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

      // 名前を変更（未保存）
      const nameInput = screen.getByDisplayValue("team-name");
      fireEvent.change(nameInput, { target: { value: "edited-team" } });

      // 別ノードに切り替え
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

      // 名前を空にする
      const nameInput = screen.getByDisplayValue("original");
      fireEvent.change(nameInput, { target: { value: "   " } });

      // 別ノードに切り替え
      rerender(
        <SidePanel
          {...props}
          nodeId="comp-2"
          name="other-node"
          description="other desc"
        />,
      );

      // 空文字名なので自動保存されない
      expect(onUpdateComponent).not.toHaveBeenCalled();
    });
  });

  describe("MAINファイル本文の編集", () => {
    it("mainFileIdがある場合にContentテキストエリアを表示する", () => {
      renderPanel({
        componentType: "SKILL",
        mainFileId: "file-1",
        mainFileContent: "# Hello",
      });
      const textarea = screen.getByLabelText("Content");
      expect(textarea).toBeTruthy();
      expect((textarea as HTMLTextAreaElement).value).toBe("# Hello");
    });

    it("mainFileIdがnullの場合はContentテキストエリアを表示しない", () => {
      renderPanel({
        componentType: "SKILL",
        mainFileId: null,
        mainFileContent: null,
      });
      expect(screen.queryByLabelText("Content")).toBeNull();
    });

    it("AGENT_TEAMの場合はContentテキストエリアを表示しない", () => {
      renderPanel({
        nodeType: "agentTeam",
        componentType: "AGENT_TEAM",
        mainFileId: "file-1",
        mainFileContent: "content",
      });
      expect(screen.queryByLabelText("Content")).toBeNull();
    });

    it("保存時にonUpdateMainFileが呼ばれる", () => {
      const onUpdateMainFile = vi.fn();
      renderPanel({
        nodeId: "comp-1",
        componentType: "SKILL",
        mainFileId: "file-1",
        mainFileContent: "original content",
        onUpdateMainFile,
      });

      const textarea = screen.getByLabelText("Content");
      fireEvent.change(textarea, { target: { value: "updated content" } });

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      expect(onUpdateMainFile).toHaveBeenCalledWith("file-1", "updated content");
    });

    it("ノード切り替え時にMAINファイルの内容が自動保存される", () => {
      const onUpdateMainFile = vi.fn();
      const { rerender, props } = renderPanel({
        nodeId: "comp-1",
        componentType: "SKILL",
        mainFileId: "file-1",
        mainFileContent: "original content",
        onUpdateMainFile,
      });

      const textarea = screen.getByLabelText("Content");
      fireEvent.change(textarea, { target: { value: "edited content" } });

      // 別ノードに切り替え
      rerender(
        <SidePanel
          {...props}
          nodeId="comp-2"
          name="other-node"
          description="other desc"
          mainFileId="file-2"
          mainFileContent="other content"
          onUpdateMainFile={onUpdateMainFile}
        />,
      );

      expect(onUpdateMainFile).toHaveBeenCalledWith("file-1", "edited content");
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

      // 名前を空にする
      const nameInput = screen.getByDisplayValue("my-skill");
      fireEvent.change(nameInput, { target: { value: "" } });

      // 保存ボタンをクリック
      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      // 保存が呼ばれない
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

      // 名前を空白のみにする
      const nameInput = screen.getByDisplayValue("my-skill");
      fireEvent.change(nameInput, { target: { value: "   " } });

      const saveButton = screen.getByRole("button", { name: "Save" });
      fireEvent.click(saveButton);

      expect(onUpdateComponent).not.toHaveBeenCalled();
    });
  });
});
