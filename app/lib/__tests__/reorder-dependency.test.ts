import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock prisma
const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdateMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../db.server", () => ({
  prisma: {
    componentDependency: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { reorderDependency } from "../plugins.server";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reorderDependency", () => {
  it("存在しないIDでエラーになること", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue(null);

    // Act & Assert
    await expect(reorderDependency("non-existent", "up")).rejects.toThrow(
      "Dependency not found",
    );
  });

  it("先頭で上移動しても何もしないこと", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "dep-1",
      sourceId: "source-1",
      order: 0,
    });
    mockFindFirst.mockResolvedValue(null); // no adjacent

    // Act
    await reorderDependency("dep-1", "up");

    // Assert
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("末尾で下移動しても何もしないこと", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "dep-1",
      sourceId: "source-1",
      order: 2,
    });
    mockFindFirst.mockResolvedValue(null); // no adjacent

    // Act
    await reorderDependency("dep-1", "down");

    // Assert
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("上移動: 隣接orderとスワップされること", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "dep-2",
      sourceId: "source-1",
      order: 1,
    });
    mockFindFirst.mockResolvedValue({
      id: "dep-1",
      sourceId: "source-1",
      order: 0,
    });
    mockTransaction.mockResolvedValue(undefined);

    // Act
    await reorderDependency("dep-2", "up");

    // Assert
    expect(mockTransaction).toHaveBeenCalledOnce();
    // Verify 3-step update pattern
    const transactionArgs = mockTransaction.mock.calls[0][0];
    expect(transactionArgs).toHaveLength(3);
  });

  it("下移動: 隣接orderとスワップされること", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "dep-1",
      sourceId: "source-1",
      order: 0,
    });
    mockFindFirst.mockResolvedValue({
      id: "dep-2",
      sourceId: "source-1",
      order: 1,
    });
    mockTransaction.mockResolvedValue(undefined);

    // Act
    await reorderDependency("dep-1", "down");

    // Assert
    expect(mockTransaction).toHaveBeenCalledOnce();
    const transactionArgs = mockTransaction.mock.calls[0][0];
    expect(transactionArgs).toHaveLength(3);
  });

  it("上移動時にdirection='up'に対応する検索条件が使われること", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "dep-2",
      sourceId: "source-1",
      order: 1,
    });
    mockFindFirst.mockResolvedValue({
      id: "dep-1",
      sourceId: "source-1",
      order: 0,
    });
    mockTransaction.mockResolvedValue(undefined);

    // Act
    await reorderDependency("dep-2", "up");

    // Assert: findFirst should search for order < 1
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        sourceId: "source-1",
        order: { lt: 1 },
      },
      orderBy: { order: "desc" },
    });
  });

  it("下移動時にdirection='down'に対応する検索条件が使われること", async () => {
    // Arrange
    mockFindUnique.mockResolvedValue({
      id: "dep-1",
      sourceId: "source-1",
      order: 0,
    });
    mockFindFirst.mockResolvedValue({
      id: "dep-2",
      sourceId: "source-1",
      order: 1,
    });
    mockTransaction.mockResolvedValue(undefined);

    // Act
    await reorderDependency("dep-1", "down");

    // Assert: findFirst should search for order > 0
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        sourceId: "source-1",
        order: { gt: 0 },
      },
      orderBy: { order: "asc" },
    });
  });
});
