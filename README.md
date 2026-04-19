# SkillSmith

A tool that formalizes Claude Code skill design patterns as a schema. Define skills in TypeScript and generate plugins that follow the Orchestrator + Worker skill + Agent pattern — the structural consistency is enforced by the schema itself.

## How it works

Write skill definitions as TypeScript (`packages/web/marketplaces/{marketplace}/plugins/{name}/plugin.ts`), and SkillSmith converts them into Claude Code plugin files (`SKILL.md`, `agent.md`, etc.).

- **Web UI** for browsing plugin structure and visualizing orchestrators
- **CLI** (`skillsmith plugin export` / `skillsmith marketplace export`) for writing plugins to the filesystem

### Skill types

| Type | Purpose |
|---|---|
| `EntryPointSkill` | Orchestrator invoked by the user via `/skill-name` |
| `WorkerSkill` | Simple worker (generates `SKILL.md` only) |
| `WorkerWithSubAgent` | Worker backed by a Sub Agent (`SKILL.md` + `agent.md`) |
| `WorkerWithAgentTeam` | Worker backed by an Agent Team (`SKILL.md` + TeamCreate instructions) |

## Architecture

### Monorepo layout

SkillSmith is a pnpm workspaces monorepo with three packages under `packages/`:

| Package | Directory | Role |
|---|---|---|
| [`@warabi1062/skillsmith-core`](packages/core) | `packages/core/` | Generation engine: type definitions, loader, generator, exporter |
| [`@warabi1062/skillsmith`](packages/cli) | `packages/cli/` | CLI: `skillsmith plugin export` and related commands |
| [`@warabi1062/skillsmith-viewer`](packages/web) | `packages/web/` | Web UI: React Router v7 viewer and visualizer |

### Layered structure (`packages/core/src/`)

The generation engine uses a four-layer structure with controlled dependency direction:

```
packages/core/src/
├── types/       # Layer 0: type definitions and constants (no deps)
├── core/        # Layer 1: shared logic (depends only on types)
├── loader/      # Layer 2a: dynamic loading of plugin definitions
├── generator/   # Layer 2b: Markdown generation pipeline
├── exporter/    # Layer 3: filesystem output
└── utils/       # Cross-cutting: UI helpers
```

Dependency rule: higher layers depend on lower layers only. `loader` and `generator` do not depend on each other.

### Generation pipeline (`packages/core/src/generator/`)

The `generator/` directory splits into two responsibilities:

- **Content Generator**: pure functions that assemble Markdown body per skill type (orchestrator / worker / agent / team)
- **Serializer**: combines frontmatter and content into `GeneratedFile` objects (skill-generator / agent-generator / …)

`content-resolver.server.ts` centralizes the branching by skill type, and `plugin-generator.server.ts` orchestrates the pipeline.

### File naming conventions

- `.server.ts`: server-only modules (mirrors the React Router convention used in `packages/web/` — excluded from client bundles)
- `.ts`: dual client/server (type definitions, logic referenced from the UI)

## Setup

```bash
pnpm install
```

## Development

```bash
pnpm dev          # Start the dev server
pnpm build        # Production build
pnpm typecheck    # Type check
pnpm lint         # Lint (oxlint)
pnpm format       # Format (Biome)
pnpm test         # Run tests
pnpm cli          # Run the CLI directly
pnpm cli plugin export {plugin.ts-path} --output {dir}           # Export a single plugin
pnpm cli marketplace export {marketplace-dir} --output {dir}     # Export an entire marketplace
```

## Using the Web viewer

The Web viewer visualizes a local `marketplaces/` directory in the browser. Install it alongside the CLI (`@warabi1062/skillsmith`):

```bash
# CLI
pnpm add -D @warabi1062/skillsmith

# Viewer (optional peer — install only if you want the UI)
pnpm add -D @warabi1062/skillsmith-viewer

# Launch
pnpm skillsmith web
```

`skillsmith web` runs as a local SPA + thin HTTP API server that visualizes a `marketplaces/` directory. Edit a `plugin.ts` file and reload the browser to see the updated output.

```bash
# Without args: auto-detect ./marketplaces in the current working directory
pnpm skillsmith web

# With a positional path: point the viewer at a specific marketplaces dir
pnpm skillsmith web ./some/other/marketplaces
```

If the viewer is not installed, `skillsmith web` prints an install hint and exits.

## Documentation

| Document | Content |
|---|---|
| [docs/reference.md](docs/reference.md) | Plugin authoring reference: skill/agent design patterns, frontmatter fields, anti-patterns |
| [docs/tool-design.md](docs/tool-design.md) | SkillSmith tool design: how the patterns in `reference.md` are mapped into the tool |

## License

MIT © warabi1062
