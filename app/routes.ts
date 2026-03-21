import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("plugins", "routes/plugins.tsx"),
  route("plugins/new", "routes/plugins.new.tsx"),
  route("plugins/:id", "routes/plugins.$id.tsx"),
  route("plugins/:id/edit", "routes/plugins.$id.edit.tsx"),
  route("plugins/:id/export", "routes/plugins.$id.export.tsx"),
] satisfies RouteConfig;
