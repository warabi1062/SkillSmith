#!/usr/bin/env node
const { execFileSync } = require("child_process");
const path = require("path");

const tsxBin = path.resolve(__dirname, "..", "node_modules", ".bin", "tsx");
const entry = path.resolve(__dirname, "index.ts");

try {
  execFileSync(tsxBin, [entry, ...process.argv.slice(2)], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
  });
} catch (e) {
  process.exit(e.status ?? 1);
}
