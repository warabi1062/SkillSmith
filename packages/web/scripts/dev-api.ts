// dev 用の API サーバー起動エントリ。src/server.ts の start() を process.cwd() で起動する
import { start } from "../src/server";

await start({ cwd: process.cwd() });
