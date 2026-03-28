import { Link } from "react-router";
import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "SkillSmith" },
    { name: "description", content: "SkillSmith - Skill Design Tool" },
  ];
}

export default function Home() {
  return (
    <div>
      <div className="flex flex-col items-center justify-center text-center flex-1 px-4 py-12">
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-accent-teal-dim border border-accent-teal-glow rounded-full font-mono text-xs font-medium text-accent-teal mb-8 tracking-[0.03em]">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" />
          v1.0.0 Development
        </div>
        <h2 className="font-display text-[clamp(2rem,5vw,3rem)] max-md:text-[1.75rem] font-bold tracking-tighter leading-[1.15] mb-4 text-text-primary">
          Design Skills with
          <br />
          <span className="bg-gradient-to-br from-accent-teal to-accent-blue bg-clip-text text-transparent">
            Structural Precision
          </span>
        </h2>
        <p className="text-[1.0625rem] text-text-secondary max-w-[480px] leading-relaxed mb-8">
          Claude Code のスキル設計パターンをスキーマとして形式化し、
          GUI上でスキルを組み立てることで設計の一貫性を構造的に保証するツール。
        </p>
        <div className="flex gap-4 items-center">
          <Link
            to="/plugins"
            className="inline-flex items-center gap-2 px-[1.125rem] py-2 font-display text-sm font-medium rounded-md bg-gradient-to-br from-accent-teal to-accent-teal-hover text-text-inverse shadow-sm shadow-glow-teal hover:from-accent-teal-light hover:to-accent-teal hover:shadow-md transition-all tracking-[0.01em]"
          >
            View Plugins
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 max-md:grid-cols-1 gap-4 py-8">
        <div className="p-6 bg-bg-surface border border-border-subtle rounded-lg transition-all hover:border-border-default hover:-translate-y-0.5">
          <div className="w-9 h-9 flex items-center justify-center rounded-md mb-4 text-base bg-accent-teal-dim text-accent-teal border border-[rgba(10,158,128,0.15)]">
            S
          </div>
          <h4 className="font-display text-[0.9375rem] font-semibold text-text-primary mb-1">
            Skill Schema
          </h4>
          <p className="text-sm text-text-tertiary leading-relaxed">
            Orchestrator + Worker + Agent パターンに沿ったスキルを構造的に定義
          </p>
        </div>
        <div className="p-6 bg-bg-surface border border-border-subtle rounded-lg transition-all hover:border-border-default hover:-translate-y-0.5">
          <div className="w-9 h-9 flex items-center justify-center rounded-md mb-4 text-base bg-accent-amber-dim text-accent-amber border border-[rgba(196,122,24,0.15)]">
            O
          </div>
          <h4 className="font-display text-[0.9375rem] font-semibold text-text-primary mb-1">
            Orchestrator View
          </h4>
          <p className="text-sm text-text-tertiary leading-relaxed">
            ワークフロー全体の構造をツリー状に可視化し、設計を俯瞰
          </p>
        </div>
        <div className="p-6 bg-bg-surface border border-border-subtle rounded-lg transition-all hover:border-border-default hover:-translate-y-0.5">
          <div className="w-9 h-9 flex items-center justify-center rounded-md mb-4 text-base bg-accent-blue-dim text-accent-blue border border-[rgba(46,111,214,0.15)]">
            P
          </div>
          <h4 className="font-display text-[0.9375rem] font-semibold text-text-primary mb-1">
            Plugin Export
          </h4>
          <p className="text-sm text-text-tertiary leading-relaxed">
            設計したスキルをClaude Code互換のプラグインとしてエクスポート
          </p>
        </div>
      </div>
    </div>
  );
}
