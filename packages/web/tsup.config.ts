import { defineConfig } from "tsup";

// viewer の publish 用ビルド設定。
// src/server.ts を dist/server.js として生成し、CLI 等から import できる形で公開する。
// ESM のみ出力（React Router v7 が ESM 前提のため）。
export default defineConfig({
  entry: { server: "src/server.ts" },
  format: ["esm"],
  dts: true,
  // outDir（= dist）のみを削除対象とする。react-router build の build/ は別ディレクトリなので影響しない。
  clean: true,
  sourcemap: false,
  target: "node20",
  outDir: "dist",
  splitting: false,
  external: ["@react-router/express", "express", "compression", "morgan"],
});
