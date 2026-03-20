#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const reactRouterBin = path.resolve(
  projectRoot,
  "node_modules",
  ".bin",
  "react-router",
);

const child = spawn(reactRouterBin, ["dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
});

child.on("error", (err) => {
  console.error("Failed to start dev server:", err.message);
  process.exit(1);
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

function shutdown() {
  child.kill("SIGTERM");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
