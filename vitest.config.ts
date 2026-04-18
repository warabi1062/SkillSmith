import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "app/**/__tests__/**/*.test.{ts,tsx}",
      "packages/core/src/**/__tests__/**/*.test.{ts,tsx}",
      "packages/cli/src/**/__tests__/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
