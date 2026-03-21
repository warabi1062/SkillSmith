import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["app/**/__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
