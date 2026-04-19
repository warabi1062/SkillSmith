import path from "node:path";
import { registerCommand } from "../router";
import { createOutput } from "../output";
import {
  VIEWER_PACKAGE_NAME,
  loadViewer,
  type ViewerServerModule,
} from "./web-loader";

// viewer 未解決判定: Node の module-not-found エラーで、かつメッセージに viewer
// パッケージ名が含まれる場合のみ「未インストール」とみなす。別モジュール未解決の
// 誤判定を防ぐため、メッセージ一致を必須にしている。
function isViewerNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (!("code" in err)) return false;
  const code = (err as { code?: unknown }).code;
  if (code !== "ERR_MODULE_NOT_FOUND" && code !== "MODULE_NOT_FOUND") {
    return false;
  }
  return err.message.includes(VIEWER_PACKAGE_NAME);
}

// インストール案内を stderr に複数行で書き出す。
// 既存の output.error は 1 行フォーマット（`Error [type]: message (context)`）のため、
// 複数行のインストール案内には可読性が不足する。他コマンドへの影響を避けるため、
// output.error を拡張せず web コマンド内で stderr に直接書く例外運用とする。
function writeInstallInstructions(): void {
  const lines = [
    `Error: ${VIEWER_PACKAGE_NAME} がインストールされていません。`,
    "",
    "Web ビューアーを使うには viewer パッケージを追加してください:",
    `  pnpm add -D ${VIEWER_PACKAGE_NAME}`,
    `  npm install --save-dev ${VIEWER_PACKAGE_NAME}`,
    "",
  ];
  process.stderr.write(`${lines.join("\n")}`);
}

export function registerWebCommand(): void {
  registerCommand({
    entity: "web",
    description: "Web ビューアーを起動して marketplaces を閲覧する",
    handler: async (ctx) => {
      const output = createOutput(ctx.options);

      let viewer: ViewerServerModule;
      try {
        viewer = await loadViewer();
      } catch (err) {
        if (isViewerNotFoundError(err)) {
          if (ctx.options.json) {
            // JSON モード: インストール案内は単一の io エラーとして出力する
            output.error({
              type: "io",
              message: `${VIEWER_PACKAGE_NAME} がインストールされていません。pnpm add -D ${VIEWER_PACKAGE_NAME} を実行してください`,
              context: VIEWER_PACKAGE_NAME,
            });
          } else {
            writeInstallInstructions();
          }
          return 1;
        }
        // viewer 未解決以外のエラーは index.ts の catch で Fatal ログに集約させる
        throw err;
      }

      // viewer.start() は `{ port, close }` を返す。close() を await して初めて
      // listen が終わる構造のため、SIGINT/SIGTERM を受けるまで resolve しない
      // Promise を handler が返すことで、index.ts の `process.exit(exitCode)` が
      // サーバー停止後まで遅延される。
      const marketplacesDir = path.resolve(process.cwd(), "marketplaces");
      const server = await viewer.start({ marketplacesDir });

      if (ctx.options.json) {
        output.success({
          port: server.port,
          url: `http://127.0.0.1:${server.port}/`,
        });
      } else {
        process.stdout.write(
          `Viewer running on http://127.0.0.1:${server.port}/\n`,
        );
        process.stdout.write("Press Ctrl+C to stop.\n");
      }

      return await new Promise<number>((resolve) => {
        // process.once を使うのは二重登録と listener 残留を避けるため。
        // 同じシグナルで多重ハンドラが動くとテスト時の副作用源になる。
        const shutdown = async (): Promise<void> => {
          try {
            await server.close();
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            process.stderr.write(`Warning: server close failed: ${message}\n`);
          }
          resolve(0);
        };
        process.once("SIGINT", () => {
          void shutdown();
        });
        process.once("SIGTERM", () => {
          void shutdown();
        });
      });
    },
  });
}
