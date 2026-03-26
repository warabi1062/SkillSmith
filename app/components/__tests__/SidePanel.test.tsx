// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SkillSidePanel from "../side-panel/SkillSidePanel";
import OrchestratorSidePanel from "../side-panel/OrchestratorSidePanel";
import type { SkillSidePanelProps } from "../side-panel/SkillSidePanel";
import type { OrchestratorSidePanelProps } from "../side-panel/OrchestratorSidePanel";

afterEach(() => {
  cleanup();
});

const defaultSkillProps: SkillSidePanelProps = {
  name: "my-skill",
  description: "A test skill",
  content: "",
  input: "",
  output: "",
  skillType: "WORKER",
  allowedTools: null,
  hasAgentConfig: false,
  agentConfig: null,
  teammates: null,
  workerSteps: null,
  workerSections: null,
  onClose: vi.fn(),
};

const defaultOrchestratorProps: OrchestratorSidePanelProps = {
  name: "my-orchestrator",
  description: "A test orchestrator",
  content: "",
  input: "",
  output: "",
  skillType: "ENTRY_POINT",
  allowedTools: null,
  argumentHint: null,
  steps: null,
  sections: null,
  onClose: vi.fn(),
};

describe("SkillSidePanel", () => {
  it("名前と説明をread-onlyで表示すること", () => {
    render(
      <SkillSidePanel {...defaultSkillProps} name="my-skill" description="Skill description" />
    );
    expect(screen.getByText("my-skill")).toBeTruthy();
    expect(screen.getByText("Skill description")).toBeTruthy();
  });

  it("SKILLバッジを表示すること", () => {
    render(<SkillSidePanel {...defaultSkillProps} />);
    expect(screen.getByText("SKILL")).toBeTruthy();
  });

  it("inputやtextareaが存在しないこと（read-only）", () => {
    render(<SkillSidePanel {...defaultSkillProps} />);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("Saveボタンが存在しないこと", () => {
    render(<SkillSidePanel {...defaultSkillProps} />);
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("Allowed Toolsをread-onlyで表示すること", () => {
    render(
      <SkillSidePanel {...defaultSkillProps} allowedTools='["Read", "Write"]' />
    );
    expect(screen.getByText("Allowed Tools")).toBeTruthy();
    expect(screen.getByText('["Read", "Write"]')).toBeTruthy();
  });

  it("閉じるボタンをクリックするとonCloseが呼ばれること", () => {
    const onClose = vi.fn();
    render(<SkillSidePanel {...defaultSkillProps} onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("AgentConfig表示セクション", () => {
    it("WORKER_WITH_SUB_AGENT + agentConfig有りの場合にAgentConfigフィールドを表示すること", () => {
      render(
        <SkillSidePanel
          {...defaultSkillProps}
          skillType="WORKER_WITH_SUB_AGENT"
          hasAgentConfig={true}
          agentConfig={{
            model: "sonnet",
            tools: ["Read"],
            agentContent: "# Agent body",
          }}
        />
      );
      expect(screen.getByText("Agent Config")).toBeTruthy();
      expect(screen.getByText("sonnet")).toBeTruthy();
      expect(screen.getByText("Read")).toBeTruthy();
      expect(screen.getByText("# Agent body")).toBeTruthy();
    });

    it("WORKER Skill + agentConfig無しの場合にAgentConfigセクションを表示しないこと", () => {
      render(<SkillSidePanel {...defaultSkillProps} />);
      expect(screen.queryByText("Agent Config")).toBeNull();
    });
  });
});

describe("OrchestratorSidePanel", () => {
  it("名前と説明とskillTypeをread-onlyで表示すること", () => {
    render(<OrchestratorSidePanel {...defaultOrchestratorProps} />);
    expect(screen.getByText("my-orchestrator")).toBeTruthy();
    expect(screen.getByText("A test orchestrator")).toBeTruthy();
    expect(screen.getByText("ENTRY_POINT")).toBeTruthy();
  });

  it("ORCHESTRATORバッジを表示すること", () => {
    render(<OrchestratorSidePanel {...defaultOrchestratorProps} />);
    expect(screen.getByText("ORCHESTRATOR")).toBeTruthy();
  });

  it("Argument Hintをread-onlyで表示すること", () => {
    render(
      <OrchestratorSidePanel {...defaultOrchestratorProps} argumentHint="<file-path>" />
    );
    expect(screen.getByText("Argument Hint")).toBeTruthy();
    expect(screen.getByText("<file-path>")).toBeTruthy();
  });

  it("AgentConfigセクションを表示しないこと", () => {
    render(<OrchestratorSidePanel {...defaultOrchestratorProps} />);
    expect(screen.queryByText("Agent Config")).toBeNull();
  });
});
