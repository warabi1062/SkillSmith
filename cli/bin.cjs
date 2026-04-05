#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");

const entry = path.resolve(__dirname, "index.ts");
const args = process.argv.slice(2).join(" ");

try {
  execSync(`npx tsx ${entry} ${args}`, {
    stdio: "inherit",
  });
} catch (e) {
  process.exit(e.status ?? 1);
}
