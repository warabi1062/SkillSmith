import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadGraphPositions,
  saveGraphPositions,
  clearGraphPositions,
} from "../graph-positions";

// Mock localStorage for Node.js test environment
const store = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  get length() {
    return store.size;
  },
  key: (_index: number) => null,
};

vi.stubGlobal("localStorage", localStorageMock);

describe("graph-positions", () => {
  beforeEach(() => {
    store.clear();
  });

  describe("loadGraphPositions", () => {
    it("returns null when no data is stored", () => {
      expect(loadGraphPositions("plugin-1")).toBeNull();
    });

    it("returns saved positions", () => {
      const positions = { "node-1": { x: 100, y: 200 } };
      store.set(
        "skillsmith:graph-positions:plugin-1",
        JSON.stringify(positions),
      );

      expect(loadGraphPositions("plugin-1")).toEqual(positions);
    });

    it("returns null when stored data is invalid JSON", () => {
      store.set("skillsmith:graph-positions:plugin-1", "not-json");

      expect(loadGraphPositions("plugin-1")).toBeNull();
    });
  });

  describe("saveGraphPositions", () => {
    it("saves positions to localStorage", () => {
      const positions = {
        "node-1": { x: 10, y: 20 },
        "node-2": { x: 30, y: 40 },
      };

      saveGraphPositions("plugin-1", positions);

      const raw = store.get("skillsmith:graph-positions:plugin-1");
      expect(raw).toBeDefined();
      expect(JSON.parse(raw!)).toEqual(positions);
    });
  });

  describe("clearGraphPositions", () => {
    it("removes the key from localStorage", () => {
      store.set(
        "skillsmith:graph-positions:plugin-1",
        JSON.stringify({ "node-1": { x: 0, y: 0 } }),
      );

      clearGraphPositions("plugin-1");

      expect(store.has("skillsmith:graph-positions:plugin-1")).toBe(false);
    });

    it("does not throw when key does not exist", () => {
      expect(() => clearGraphPositions("nonexistent")).not.toThrow();
    });
  });
});
