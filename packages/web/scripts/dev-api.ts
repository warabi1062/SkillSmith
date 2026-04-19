// dev 用の API サーバー起動エントリ。src/server.ts の start() を起動する。
// SKILLSMITH_MARKETPLACES_DIR が指定されていればそれを、なければ cwd/marketplaces をフォールバックとして使う。
import path from "node:path";
import { start } from "../src/server";

const marketplacesDir =
  process.env.SKILLSMITH_MARKETPLACES_DIR ??
  path.join(process.cwd(), "marketplaces");

await start({ marketplacesDir });
