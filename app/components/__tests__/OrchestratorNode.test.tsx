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
    skillType: string | null;
  }> = {},
) {
  const data = {
    label: "test-orchestrator",
    description: "A test orchestrator",
    steps: [],
    skillType: "ENTRY_POINT",
    ...overrides,
  };
  const nodeProps = {
    id: "orch-1",
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
  it("labelをテキスト表示すること", () => {
    renderOrchestratorNode({ label: "my-orchestrator" });
    expect(screen.getByText("my-orchestrator")).toBeTruthy();
  });

  it("descriptionをテキスト表示すること", () => {
    renderOrchestratorNode({ description: "Orchestrator description" });
    expect(screen.getByText("Orchestrator description")).toBeTruthy();
  });

  it("descriptionがnullの場合はプレースホルダを表示すること", () => {
    renderOrchestratorNode({ description: null });
    expect(screen.getByText("(no description)")).toBeTruthy();
  });

  it("input/textareaが存在しないこと（read-only）", () => {
    renderOrchestratorNode();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("stepsをread-onlyで表示すること", () => {
    renderOrchestratorNode({
      steps: [
        { order: 0, dependencies: [{ id: "dep-1", targetId: "comp-2" }] },
        { order: 1, dependencies: [{ id: "dep-2", targetId: "comp-3" }] },
      ],
    });
    expect(screen.getByText("Step 1")).toBeTruthy();
    expect(screen.getByText("Step 2")).toBeTruthy();
  });

  it("複数依存関係のあるステップにカウントが表示されること", () => {
    renderOrchestratorNode({
      steps: [
        {
          order: 0,
          dependencies: [
            { id: "dep-1", targetId: "comp-2" },
            { id: "dep-2", targetId: "comp-3" },
          ],
        },
      ],
    });
    expect(screen.getByText("Step 1 (x2)")).toBeTruthy();
  });

  it("+ Stepボタンが存在しないこと（read-only）", () => {
    renderOrchestratorNode();
    expect(screen.queryByText("+ Step")).toBeNull();
  });

  it("並べ替え・削除ボタンが存在しないこと（read-only）", () => {
    renderOrchestratorNode({
      steps: [
        { order: 0, dependencies: [{ id: "dep-1", targetId: "comp-2" }] },
      ],
    });
    // 上下移動ボタンや削除ボタンが存在しないことを確認
    expect(screen.queryByTitle("Move up")).toBeNull();
    expect(screen.queryByTitle("Move down")).toBeNull();
    expect(screen.queryByTitle("Delete step")).toBeNull();
  });
});
