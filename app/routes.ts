import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("plugins", "routes/plugins.tsx"),
  route("plugins/new", "routes/plugins.new.tsx"),
  route("plugins/:id", "routes/plugins.$id.tsx"),
  route("plugins/:id/edit", "routes/plugins.$id.edit.tsx"),
  route("plugins/:id/destroy", "routes/plugins.$id.destroy.tsx"),
  route("plugins/:id/generate", "routes/plugins.$id.generate.tsx"),
  route(
    "plugins/:id/components/new",
    "routes/plugins.$id.components.new.tsx",
  ),
  route(
    "plugins/:id/components/:componentId",
    "routes/plugins.$id.components.$componentId.tsx",
  ),
  route(
    "plugins/:id/components/:componentId/edit",
    "routes/plugins.$id.components.$componentId.edit.tsx",
  ),
  route(
    "plugins/:id/components/:componentId/destroy",
    "routes/plugins.$id.components.$componentId.destroy.tsx",
  ),
  route(
    "plugins/:id/agent-teams/new",
    "routes/plugins.$id.agent-teams.new.tsx",
  ),
  route(
    "plugins/:id/agent-teams/:teamId",
    "routes/plugins.$id.agent-teams.$teamId.tsx",
  ),
  route(
    "plugins/:id/agent-teams/:teamId/edit",
    "routes/plugins.$id.agent-teams.$teamId.edit.tsx",
  ),
  route(
    "plugins/:id/agent-teams/:teamId/destroy",
    "routes/plugins.$id.agent-teams.$teamId.destroy.tsx",
  ),
  route(
    "plugins/:id/agent-teams/:teamId/members/new",
    "routes/plugins.$id.agent-teams.$teamId.members.new.tsx",
  ),
  route(
    "plugins/:id/agent-teams/:teamId/members/:memberId/destroy",
    "routes/plugins.$id.agent-teams.$teamId.members.$memberId.destroy.tsx",
  ),
  route(
    "plugins/:id/components/:componentId/files/new",
    "routes/plugins.$id.components.$componentId.files.new.tsx",
  ),
  route(
    "plugins/:id/components/:componentId/files/:fileId/edit",
    "routes/plugins.$id.components.$componentId.files.$fileId.edit.tsx",
  ),
  route(
    "plugins/:id/components/:componentId/files/:fileId/destroy",
    "routes/plugins.$id.components.$componentId.files.$fileId.destroy.tsx",
  ),
] satisfies RouteConfig;
