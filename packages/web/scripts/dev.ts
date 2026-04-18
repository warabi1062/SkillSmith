// dev ランチャー: Vite dev server と HTTP API サーバーを並列起動する
// --target=<path> が指定された場合は SKILLSMITH_MARKETPLACES_DIR に反映
import { spawn } from "node:child_process";
import path from "node:path";

const targetArg = process.argv.find((a) => a.startsWith("--target="));
if (targetArg) {
  const targetPath = targetArg.split("=")[1];
  if (targetPath) {
    process.env.SKILLSMITH_MARKETPLACES_DIR = path.resolve(targetPath);
  }
}

const apiPort = Number(process.env.SKILLSMITH_API_PORT ?? 5174);

// API サーバー（静的配信を無効化した状態で起動、Vite の proxy から叩かれる）
const api = spawn("tsx", ["src/server.ts"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(apiPort),
    SKILLSMITH_DEV_API_ONLY: "1",
  },
});

// Vite dev server（/api を apiPort に proxy）
const vite = spawn("vite", [], {
  stdio: "inherit",
  env: { ...process.env, SKILLSMITH_API_PORT: String(apiPort) },
});

// いずれかの子が落ちたら両方落とし、親の exit code に伝搬する
let shuttingDown = false;
const shutdown = (signal: NodeJS.Signals | null, exitCode: number) => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!api.killed) api.kill(signal ?? "SIGTERM");
  if (!vite.killed) vite.kill(signal ?? "SIGTERM");
  // 子の exit を軽く待ってから親を終了
  setTimeout(() => process.exit(exitCode), 200);
};

api.on("exit", (code, signal) => shutdown(signal, code ?? 1));
vite.on("exit", (code, signal) => shutdown(signal, code ?? 0));

// 親への SIGINT/SIGTERM を子に伝搬する（Ctrl+C で両方落とす）
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => shutdown(sig, 0));
}
