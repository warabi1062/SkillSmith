// dev server ラッパー: --target オプションでマーケットプレース探索パスを指定可能
import { execSync } from "node:child_process";
import path from "node:path";

const targetArg = process.argv.find((a) => a.startsWith("--target="));
if (targetArg) {
  const targetPath = targetArg.split("=")[1];
  process.env.SKILLSMITH_MARKETPLACES_DIR = path.resolve(targetPath);
}

execSync("react-router dev", { stdio: "inherit", env: process.env });
