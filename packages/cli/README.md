# @warabi1062/skillsmith

CLI for [SkillSmith](https://github.com/warabi1062/SkillSmith) — a tool that formalizes Claude Code skill design patterns as a schema and generates plugins that follow the Orchestrator + Worker skill + Agent pattern.

Write your skill definitions in TypeScript, then export them as Claude Code plugin files (`SKILL.md`, `agent.md`, and supporting assets).

## Install

```bash
pnpm add -D @warabi1062/skillsmith
```

To also launch the local Web viewer, add the optional peer:

```bash
pnpm add -D @warabi1062/skillsmith-viewer
```

## Commands

### Export a single plugin

```bash
skillsmith plugin export <plugin.ts> --output <dir>
```

Loads a TypeScript `plugin.ts` file that `default export`s a `PluginDefinition` and writes the generated Markdown files to the target directory.

### Export an entire marketplace

```bash
skillsmith marketplace export <marketplace-dir> --output <dir>
```

Walks `marketplace-dir/plugins/*/plugin.ts` and exports every plugin in one run.

### Launch the local Web viewer

```bash
skillsmith web [marketplaces-dir]
```

Starts a local SPA + thin HTTP API server that visualizes plugin definitions and orchestrator structure in the browser. When `marketplaces-dir` is omitted, `skillsmith web` falls back to `./marketplaces` in the current working directory. Requires `@warabi1062/skillsmith-viewer` to be installed; if it's missing, the command prints install instructions and exits.

## Writing a plugin

Each plugin lives in `marketplaces/{marketplace}/plugins/{name}/plugin.ts` and default-exports a `PluginDefinition`. Skills are instances of one of four classes (`EntryPointSkill`, `WorkerSkill`, `WorkerWithSubAgent`, `WorkerWithAgentTeam`) composed from `steps[]`, `sections[]`, and tool references (`tool()`, `bash()`, `mcp()`).

See the [plugin authoring reference](https://github.com/warabi1062/SkillSmith/blob/main/docs/reference.md) for the full schema, design patterns, and anti-patterns.

## License

MIT © warabi1062
