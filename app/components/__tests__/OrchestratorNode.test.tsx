// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import OrchestratorNode from "../OrchestratorNode";

// React Flowのモック
vi.mock("@xyflow/react", () => ({
  Handle: ({
    type,
    position,
    id,
  }: {
    type: string;
    position: string;
    id?: string;
  }) => (
    <div
      data-testid={id ? `handle-${type}-${id}` : `handle-${type}`}
      data-position={position}
    />
  ),
  Position: { Left: "left", Right: "right" },
}));

afterEach(() => {
  cleanup();
});

function renderOrchestratorNode(
  overrides: Partial<{
    label: string;
    description: string | null;
    steps: Array<{
      order: number;
      dependencies: Array<{ id: string; targetId: string }>;
    }>;
    onReorderStep: (dependencyId: string, direction: "up" | "down") => void;
    onDeleteStep: (dependencyIds: string[]) => void;
    componentId: string;
    pluginId: string;
    skillType: string | null;
  }> = {},
) {
  const data = {
    label: "test-orchestrator",
    description: "A test orchestrator",
    steps: [],
    componentId: "comp-1",
    pluginId: "plugin-1",
    skillType: "ENTRY_POINT",
    ...overrides,
  };
  const nodeProps = {
    id: "comp-1",
    data,
    type: "orchestrator",
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
  return render(<OrchestratorNode {...nodeProps} />);
}

describe("OrchestratorNode", () => {
  it("labelをテキスト表示する", () => {
    renderOrchestratorNode({ label: "my-orchestrator" });
    expect(screen.getByText("my-orchestrator")).toBeTruthy();
  });

  it("descriptionをテキスト表示する", () => {
    renderOrchestratorNode({ description: "Orchestrator description" });
    expect(screen.getByText("Orchestrator description")).toBeTruthy();
  });

  it("descriptionがnullの場合はプレースホルダを表示する", () => {
    renderOrchestratorNode({ description: null });
    expect(screen.getByText("(no description)")).toBeTruthy();
  });

  it("InlineEditableFieldが存在しない（inputやtextareaがない）", () => {
    renderOrchestratorNode();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("stepsを表示する", () => {
    renderOrchestratorNode({
      steps: [
        { order: 0, dependencies: [{ id: "dep-1", targetId: "comp-2" }] },
        { order: 1, dependencies: [{ id: "dep-2", targetId: "comp-3" }] },
      ],
    });
    expect(screen.getByText("Step 1")).toBeTruthy();
    expect(screen.getByText("Step 2")).toBeTruthy();
  });

  it("+ Stepボタンが表示される", () => {
    renderOrchestratorNode();
    expect(screen.getByText("+ Step")).toBeTruthy();
  });
});
