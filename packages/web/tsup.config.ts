import { defineConfig } from "tsup";

// packages/web の server エントリをバンドルする
// dist/server.js から dist/spa/ を同一 dist 直下で参照するため、outDir は dist 直下
export default defineConfig({
  entry: {
    server: "src/server.ts",
  },
  format: ["esm"],
  dts: true,
  clean: false,
  sourcemap: false,
  target: "node20",
  outDir: "dist",
  splitting: false,
  // SPA 配信は Vite で作った dist/spa を参照するため、実行時 external とする
  external: [
    "express",
    "react",
    "react-dom",
    "@warabi1062/skillsmith-core",
    "@warabi1062/skillsmith-core/loader",
  ],
});
