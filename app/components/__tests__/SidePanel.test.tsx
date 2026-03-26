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
    componentType: "SKILL",
    name: "my-skill",
    description: "A test skill",
    content: "",
    input: "",
    output: "",
    skillType: "WORKER",
    allowedTools: null,
    argumentHint: null,
    hasAgentConfig: false,
    agentConfig: null,
    teammates: null,
    steps: null,
    sections: null,
    onClose: vi.fn(),
    ...overrides,
  };
  const result = render(<SidePanel {...defaultProps} />);
  return { ...result, props: defaultProps };
}

describe("SidePanel", () => {
  describe("SKILLノードの表示", () => {
    it("名前と説明をread-onlyで表示すること", () => {
      renderPanel({
        componentType: "SKILL",
        name: "my-skill",
        description: "Skill description",
        skillType: "WORKER",
      });
      expect(screen.getByText("my-skill")).toBeTruthy();
      expect(screen.getByText("Skill description")).toBeTruthy();
    });

    it("SKILLバッジを表示すること", () => {
      renderPanel({ componentType: "SKILL" });
      expect(screen.getByText("SKILL")).toBeTruthy();
    });

    it("inputやtextareaが存在しないこと（read-only）", () => {
      renderPanel();
      expect(screen.queryByRole("textbox")).toBeNull();
    });

    it("Saveボタンが存在しないこと", () => {
      renderPanel();
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });
  });

  describe("ORCHESTRATORノードの表示", () => {
    it("名前と説明とskillTypeをread-onlyで表示すること", () => {
      renderPanel({
        componentType: "ORCHESTRATOR",
        name: "my-orchestrator",
        description: "Orchestrator description",
        skillType: "ENTRY_POINT",
      });
      expect(screen.getByText("my-orchestrator")).toBeTruthy();
      expect(screen.getByText("Orchestrator description")).toBeTruthy();
      expect(screen.getByText("ENTRY_POINT")).toBeTruthy();
    });

    it("ORCHESTRATORバッジを表示すること", () => {
      renderPanel({ componentType: "ORCHESTRATOR" });
      expect(screen.getByText("ORCHESTRATOR")).toBeTruthy();
    });

    it("Argument Hintをread-onlyで表示すること", () => {
      renderPanel({
        componentType: "ORCHESTRATOR",
        skillType: "ENTRY_POINT",
        argumentHint: "<file-path>",
      });
      expect(screen.getByText("Argument Hint")).toBeTruthy();
      expect(screen.getByText("<file-path>")).toBeTruthy();
    });
  });

  describe("AgentConfig表示セクション", () => {
    it("WORKER_WITH_SUB_AGENT + agentConfig有りの場合にAgentConfigフィールドを表示すること", () => {
      renderPanel({
        componentType: "SKILL",
        skillType: "WORKER_WITH_SUB_AGENT",
        hasAgentConfig: true,
        agentConfig: {
          model: "sonnet",
          tools: ["Read"],
          agentContent: "# Agent body",
        },
      });
      expect(screen.getByText("Agent Config")).toBeTruthy();
      expect(screen.getByText("sonnet")).toBeTruthy();
      expect(screen.getByText("Read")).toBeTruthy();
      expect(screen.getByText("# Agent body")).toBeTruthy();
    });

    it("ENTRY_POINT SkillにはAgentConfigセクションを表示しないこと", () => {
      renderPanel({
        componentType: "ORCHESTRATOR",
        skillType: "ENTRY_POINT",
        hasAgentConfig: false,
        agentConfig: null,
      });
      expect(screen.queryByText("Agent Config")).toBeNull();
    });

    it("WORKER Skill + agentConfig無しの場合にAgentConfigセクションを表示しないこと", () => {
      renderPanel({
        componentType: "SKILL",
        skillType: "WORKER",
        hasAgentConfig: false,
        agentConfig: null,
      });
      expect(screen.queryByText("Agent Config")).toBeNull();
    });
  });

  describe("Allowed Tools表示", () => {
    it("Allowed Toolsをread-onlyで表示すること", () => {
      renderPanel({
        componentType: "SKILL",
        skillType: "WORKER",
        allowedTools: '["Read", "Write"]',
      });
      expect(screen.getByText("Allowed Tools")).toBeTruthy();
      expect(screen.getByText('["Read", "Write"]')).toBeTruthy();
    });
  });

  describe("閉じるボタン", () => {
    it("閉じるボタンをクリックするとonCloseが呼ばれること", () => {
      const onClose = vi.fn();
      renderPanel({ onClose });

      const closeButton = screen.getByRole("button", { name: "Close" });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
