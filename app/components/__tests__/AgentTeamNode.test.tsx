// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AgentTeamNode from "../AgentTeamNode";

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

function renderAgentTeamNode(
  overrides: Partial<{
    label: string;
    description: string | null;
    orchestratorName: string;
    teamId: string;
    pluginId: string;
  }> = {},
) {
  const data = {
    label: "test-team",
    description: "A test team",
    orchestratorName: "dev",
    teamId: "team-1",
    pluginId: "plugin-1",
    ...overrides,
  };
  const nodeProps = {
    id: "agentteam-team-1",
    data,
    type: "agentteam",
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
  return render(<AgentTeamNode {...nodeProps} />);
}

describe("AgentTeamNode", () => {
  it("labelをテキスト表示する", () => {
    renderAgentTeamNode({ label: "my-team" });
    expect(screen.getByText("my-team")).toBeTruthy();
  });

  it("descriptionをテキスト表示する", () => {
    renderAgentTeamNode({ description: "Team description" });
    expect(screen.getByText("Team description")).toBeTruthy();
  });

  it("descriptionがnullの場合はプレースホルダを表示する", () => {
    renderAgentTeamNode({ description: null });
    expect(screen.getByText("(no description)")).toBeTruthy();
  });

  it("AGENT TEAMバッジを表示する", () => {
    renderAgentTeamNode();
    expect(screen.getByText("AGENT TEAM")).toBeTruthy();
  });

  it("orchestratorNameを表示する", () => {
    renderAgentTeamNode({ orchestratorName: "dev" });
    expect(screen.getByText(/dev/)).toBeTruthy();
  });

  it("InlineEditableFieldが存在しない（inputやtextareaがない）", () => {
    renderAgentTeamNode();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
