// viewer パッケージの識別子（import 呼び出し・未解決判定・インストール案内で共有）
export const VIEWER_PACKAGE_NAME = "@warabi1062/skillsmith-viewer";
export const VIEWER_SERVER_MODULE = `${VIEWER_PACKAGE_NAME}/server`;

// viewer server モジュールの型
export type ViewerServerModule =
  typeof import("@warabi1062/skillsmith-viewer/server");

// viewer 動的 import をモジュール境界に切り出す。
// web.ts 側から import されるため、テストでは `vi.mock("../web-loader")` で
// 差し替えてモックできる（同一モジュール内 spyOn の ESM 制約を回避）。
export async function loadViewer(): Promise<ViewerServerModule> {
  // 文字列リテラルを関数呼び出しに渡すことで tsup の external 判定を経由させ、
  // CLI bundle に viewer 本体が含まれないようにする。
  return await import(VIEWER_SERVER_MODULE);
}
