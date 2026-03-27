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
      <div className="home-hero">
        <div className="home-hero-badge">
          <span className="home-hero-badge-dot" />
          v1.0.0 Development
        </div>
        <h2>
          Design Skills with
          <br />
          <span className="text-gradient">Structural Precision</span>
        </h2>
        <p className="home-hero-subtitle">
          Claude Code のスキル設計パターンをスキーマとして形式化し、
          GUI上でスキルを組み立てることで設計の一貫性を構造的に保証するツール。
        </p>
        <div className="home-hero-actions">
          <Link to="/plugins" className="btn btn-primary">
            View Plugins
          </Link>
        </div>
      </div>

      <div className="home-features">
        <div className="home-feature">
          <div className="home-feature-icon home-feature-icon--teal">S</div>
          <h4>Skill Schema</h4>
          <p>Orchestrator + Worker + Agent パターンに沿ったスキルを構造的に定義</p>
        </div>
        <div className="home-feature">
          <div className="home-feature-icon home-feature-icon--amber">O</div>
          <h4>Orchestrator View</h4>
          <p>ワークフロー全体の構造をツリー状に可視化し、設計を俯瞰</p>
        </div>
        <div className="home-feature">
          <div className="home-feature-icon home-feature-icon--blue">P</div>
          <h4>Plugin Export</h4>
          <p>設計したスキルをClaude Code互換のプラグインとしてエクスポート</p>
        </div>
      </div>
    </div>
  );
}
