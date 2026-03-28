import { Link } from "react-router";
import { buttonVariants } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "SkillSmith" },
    { name: "description", content: "SkillSmith - Skill Design Tool" },
  ];
}

const features = [
  {
    icon: "S",
    title: "Skill Schema",
    description:
      "Orchestrator + Worker + Agent パターンに沿ったスキルを構造的に定義",
    colorClass: "bg-[var(--accent-teal-dim)] text-[var(--accent-teal)] border border-[rgba(10,158,128,0.15)]",
  },
  {
    icon: "O",
    title: "Orchestrator View",
    description: "ワークフロー全体の構造をツリー状に可視化し、設計を俯瞰",
    colorClass: "bg-[var(--accent-amber-dim)] text-[var(--accent-amber)] border border-[rgba(196,122,24,0.15)]",
  },
  {
    icon: "P",
    title: "Plugin Export",
    description:
      "設計したスキルをClaude Code互換のプラグインとしてエクスポート",
    colorClass: "bg-[var(--accent-blue-dim)] text-[var(--accent-blue)] border border-[rgba(46,111,214,0.15)]",
  },
] as const;

export default function Home() {
  return (
    <div>
      <div className="flex flex-col items-center justify-center text-center flex-1 py-16 px-4 animate-in fade-in slide-in-from-bottom-4 duration-600">
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-[var(--accent-teal-dim)] border border-[rgba(10,158,128,0.2)] rounded-full font-mono text-xs font-medium text-[var(--accent-teal)] mb-8 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)] animate-pulse" />
          v1.0.0 Development
        </div>
        <h2 className="font-display text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight leading-tight mb-4 text-[var(--text-primary)]">
          Design Skills with
          <br />
          <span className="bg-gradient-to-br from-[var(--accent-teal)] to-[var(--accent-blue)] bg-clip-text text-transparent">
            Structural Precision
          </span>
        </h2>
        <p className="text-base text-[var(--text-secondary)] max-w-[480px] leading-relaxed mb-8">
          Claude Code のスキル設計パターンをスキーマとして形式化し、
          GUI上でスキルを組み立てることで設計の一貫性を構造的に保証するツール。
        </p>
        <div className="flex gap-4 items-center">
          <Link
            to="/plugins"
            className={buttonVariants({ variant: "default", size: "lg" })}
          >
            View Plugins
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-600 delay-200">
        {features.map((feature) => (
          <Card
            key={feature.icon}
            className="transition-all hover:border-[var(--border-default)] hover:-translate-y-0.5"
          >
            <CardHeader>
              <div
                className={`w-9 h-9 flex items-center justify-center rounded-md mb-1 text-base ${feature.colorClass}`}
              >
                {feature.icon}
              </div>
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
