// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AgentNode from "../AgentNode";

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

function renderAgentNode(
  overrides: Partial<{
    label: string;
    description: string | null;
    componentId: string;
    pluginId: string;
  }> = {},
) {
  const data = {
    label: "test-agent",
    description: "A test agent",
    componentType: "AGENT" as const,
    skillType: null,
    componentId: "comp-1",
    pluginId: "plugin-1",
    ...overrides,
  };
  const nodeProps = {
    id: "comp-1",
    data,
    type: "agent",
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
  return render(<AgentNode {...nodeProps} />);
}

describe("AgentNode", () => {
  it("labelをテキスト表示する", () => {
    renderAgentNode({ label: "my-agent" });
    expect(screen.getByText("my-agent")).toBeTruthy();
  });

  it("descriptionをテキスト表示する", () => {
    renderAgentNode({ description: "Agent description" });
    expect(screen.getByText("Agent description")).toBeTruthy();
  });

  it("descriptionがnullの場合はプレースホルダを表示する", () => {
    renderAgentNode({ description: null });
    expect(screen.getByText("(no description)")).toBeTruthy();
  });

  it("AGENTバッジを表示する", () => {
    renderAgentNode();
    expect(screen.getByText("AGENT")).toBeTruthy();
  });

  it("InlineEditableFieldが存在しない（inputやtextareaがない）", () => {
    renderAgentNode();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
