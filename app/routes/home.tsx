import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "SkillSmith" },
    { name: "description", content: "SkillSmith - Skill Design Tool" },
  ];
}

export default function Home() {
  return <h1>Hello World</h1>;
}
