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
    stepsData: Array<string | { inline: string } | { decisionPoint: string; cases: Record<string, Array<string | { inline: string }>> }>;
    skillType: string | null;
  }> = {},
) {
  const data = {
    label: "test-orchestrator",
    description: "A test orchestrator",
    stepsData: [],
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

  it("stepsDataのスキル名を番号付きで表示すること", () => {
    renderOrchestratorNode({
      stepsData: ["plan-team", "implement-team"],
    });
    expect(screen.getByText("plan-team")).toBeTruthy();
    expect(screen.getByText("implement-team")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("インラインステップを番号付きで表示すること", () => {
    renderOrchestratorNode({
      stepsData: [{ inline: "ブランチ作成" }, "plan-team"],
    });
    expect(screen.getByText("ブランチ作成")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("分岐を階層番号付きで表示すること", () => {
    renderOrchestratorNode({
      stepsData: [
        {
          decisionPoint: "入力判定",
          cases: {
            "Linearモード": ["triage"],
            "Quickモード": [{ inline: "タスクID生成" }],
          },
        },
        "plan-team",
      ],
    });
    expect(screen.getByText("入力判定")).toBeTruthy();
    expect(screen.getByText("A: Linearモード")).toBeTruthy();
    expect(screen.getByText("B: Quickモード")).toBeTruthy();
    expect(screen.getByText("triage")).toBeTruthy();
    expect(screen.getByText("タスクID生成")).toBeTruthy();
    expect(screen.getByText("plan-team")).toBeTruthy();
  });

  it("+ Stepボタンが存在しないこと（read-only）", () => {
    renderOrchestratorNode();
    expect(screen.queryByText("+ Step")).toBeNull();
  });

  it("並べ替え・削除ボタンが存在しないこと（read-only）", () => {
    renderOrchestratorNode({
      stepsData: ["plan-team"],
    });
    expect(screen.queryByTitle("Move up")).toBeNull();
    expect(screen.queryByTitle("Move down")).toBeNull();
    expect(screen.queryByTitle("Delete step")).toBeNull();
  });
});
