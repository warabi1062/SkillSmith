# @warabi1062/skillsmith-viewer

Local Web viewer for [SkillSmith](https://github.com/warabi1062/SkillSmith) — browse plugin definitions and visualize orchestrator structure from a `marketplaces/` directory in your project.

This package is designed to be used via the `@warabi1062/skillsmith` CLI's `web` subcommand. It is declared as an **optional peer** of the CLI, so you only install it when you actually want the viewer.

## Install

```bash
# CLI (required)
pnpm add -D @warabi1062/skillsmith

# Viewer (optional, only when you want to browse in the UI)
pnpm add -D @warabi1062/skillsmith-viewer
```

## Usage

From a project that contains a `marketplaces/` directory:

```bash
pnpm skillsmith web
```

This starts a local SPA + thin HTTP API server that reads `marketplaces/{marketplace}/plugins/*/plugin.ts` from the current working directory. Edit a `plugin.ts` file and reload the browser to see the updated output.

## Programmatic use

The server can also be embedded directly. It reads `marketplaces/` relative to the `cwd` you pass in:

```ts
import { start } from "@warabi1062/skillsmith-viewer/server";

const server = await start({
  cwd: process.cwd(),
  port: 5173,
});

// later
await server.close();
```

## License

MIT © warabi1062
