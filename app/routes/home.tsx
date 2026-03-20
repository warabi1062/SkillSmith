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
      <h2>Welcome to SkillSmith</h2>
      <p style={{ marginTop: "1rem", color: "#6b7280" }}>
        Design and manage Claude Code skills, agents, and plugins.
      </p>
      <div style={{ marginTop: "1.5rem" }}>
        <Link to="/plugins" className="btn btn-primary">
          View Plugins
        </Link>
      </div>
    </div>
  );
}
