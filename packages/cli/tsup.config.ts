import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

// ビルド時に package.json のバージョンを文字列リテラルとして埋め込む
const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as {
  version: string;
};

// CLI パッケージの publish 用ビルド設定
// エントリは src/index.ts のみ、bin.cjs は dist/index.cjs を実行する
export default defineConfig({
  entry: {
    index: "src/index.ts",
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
