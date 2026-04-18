import { defineConfig } from "tsup";

// core パッケージの publish 用ビルド設定
// エントリ名は publish 後の import パスと一致させる（.server サフィックスは剥がす）
export default defineConfig({
  entry: {
    "types/index": "src/types/index.ts",
    "types/constants": "src/types/constants.ts",
    "generator/index": "src/generator/index.ts",
    "generator/types": "src/generator/types.ts",
    "exporter/index": "src/exporter/exporter.server.ts",
    "loader/index": "src/loader/index.ts",
    "utils/skill-type": "src/utils/skill-type.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: false,
  target: "node20",
  outDir: "dist",
  splitting: false,
  // CJS ビルドで import.meta.url を __filename ベースで埋める shim を有効化する
  shims: true,
});
