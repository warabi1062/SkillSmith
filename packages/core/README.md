# @warabi1062/skillsmith-core

Core generation engine for [SkillSmith](https://github.com/warabi1062/SkillSmith) — a tool that formalizes Claude Code skill design patterns as a schema and generates plugins that follow the Orchestrator + Worker skill + Agent pattern.

This package provides the type definitions, loader, generator, and exporter used by the `@warabi1062/skillsmith` CLI and the `@warabi1062/skillsmith-viewer` Web UI. Most users should install the CLI instead of depending on this package directly.

## Install

```bash
pnpm add @warabi1062/skillsmith-core
```

## Entry points

| Export | Purpose |
|---|---|
| `@warabi1062/skillsmith-core/types` | Skill / plugin type definitions (`EntryPointSkill`, `WorkerSkill`, `WorkerWithSubAgent`, `WorkerWithAgentTeam`, `PluginDefinition`, `ToolRef`, etc.) |
| `@warabi1062/skillsmith-core/types/constants` | Skill type constants |
| `@warabi1062/skillsmith-core/loader` | Dynamically load `plugin.ts` files via jiti |
| `@warabi1062/skillsmith-core/generator` | Transform loaded plugin definitions into Markdown (`SKILL.md`, `agent.md`, etc.) |
| `@warabi1062/skillsmith-core/generator/types` | Types consumed by the generator pipeline |
| `@warabi1062/skillsmith-core/exporter` | Write generated files to the filesystem via a safe two-phase write |
| `@warabi1062/skillsmith-core/utils/skill-type` | Runtime helpers for skill-type discrimination |

Both ESM (`import`) and CommonJS (`require`) builds are shipped.

## Usage

```ts
import { loadPluginDefinition } from "@warabi1062/skillsmith-core/loader";
import { generatePlugin } from "@warabi1062/skillsmith-core/generator";
import { exportPlugin } from "@warabi1062/skillsmith-core/exporter";

const definition = await loadPluginDefinition("./plugin.ts");
const generated = generatePlugin(definition);
await exportPlugin(generated, { outputDir: "./out" });
```

## Documentation

- [Plugin authoring reference](https://github.com/warabi1062/SkillSmith/blob/main/docs/reference.md)
- [Tool design notes](https://github.com/warabi1062/SkillSmith/blob/main/docs/tool-design.md)

## License

MIT © warabi1062
