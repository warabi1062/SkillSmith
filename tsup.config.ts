import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

// ビルド時に package.json のバージョンを文字列リテラルとして埋め込む
const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

// publish 用ビルド設定
// ESM + CJS + .d.ts を dist/ に出力する
// エントリ名は publish 後の import パスと一致させる（.server サフィックスは剥がす）
export default defineConfig({
  entry: {
    "types/index": "app/lib/types/index.ts",
    "types/constants": "app/lib/types/constants.ts",
    "generator/index": "app/lib/generator/index.ts",
    "generator/types": "app/lib/generator/types.ts",
    "exporter/index": "app/lib/exporter/exporter.server.ts",
    "loader/index": "app/lib/loader/index.ts",
    "cli/index": "cli/index.ts",
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
  // ビルド時にパッケージバージョンを埋め込む（ランタイムで package.json を読まなくて済む）
  define: {
    __SKILLSMITH_VERSION__: JSON.stringify(pkg.version),
  },
});
