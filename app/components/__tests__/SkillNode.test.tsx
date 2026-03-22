// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SkillNode from "../SkillNode";

// React Flowのモック
vi.mock("@xyflow/react", () => ({
  Handle: ({ type, position }: { type: string; position: string }) => (
    <div data-testid={`handle-${type}`} data-position={position} />
  ),
  Position: { Left: "left", Right: "right" },
}));

afterEach(() => {
  cleanup();
});

function renderSkillNode(
  overrides: Partial<{
    label: string;
    description: string | null;
    skillType: string | null;
    hasAgentConfig: boolean;
    componentId: string;
    pluginId: string;
  }> = {},
) {
  const data = {
    label: "test-skill",
    description: "A test skill",
    componentType: "SKILL" as const,
    skillType: "WORKER",
    hasAgentConfig: false,
    componentId: "comp-1",
    pluginId: "plugin-1",
    ...overrides,
  };
  const nodeProps = {
    id: "comp-1",
    data,
    type: "skill",
    selected: false,
    draggable: true,
    dragging: false,
    selectable: true,
    deletable: false,
    zIndex: 0,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };
  return render(<SkillNode {...nodeProps} />);
}

describe("SkillNode", () => {
  it("labelをテキスト表示する", () => {
    renderSkillNode({ label: "my-skill" });
    expect(screen.getByText("my-skill")).toBeTruthy();
  });

  it("descriptionをテキスト表示する", () => {
    renderSkillNode({ description: "Skill description" });
    expect(screen.getByText("Skill description")).toBeTruthy();
  });

  it("descriptionがnullの場合はプレースホルダを表示する", () => {
    renderSkillNode({ description: null });
    expect(screen.getByText("(no description)")).toBeTruthy();
  });

  it("skillTypeを表示する", () => {
    renderSkillNode({ skillType: "WORKER" });
    expect(screen.getByText("WORKER")).toBeTruthy();
  });

  it("SKILLバッジを表示する", () => {
    renderSkillNode();
    expect(screen.getByText("SKILL")).toBeTruthy();
  });

  it("InlineEditableFieldが存在しない（inputやtextareaがない）", () => {
    renderSkillNode();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("hasAgentConfig=trueの場合に'+ AGENT'バッジを表示する", () => {
    renderSkillNode({ hasAgentConfig: true });
    expect(screen.getByText("+ AGENT")).toBeTruthy();
  });

  it("hasAgentConfig=falseの場合に'+ AGENT'バッジを表示しない", () => {
    renderSkillNode({ hasAgentConfig: false });
    expect(screen.queryByText("+ AGENT")).toBeNull();
  });
});
