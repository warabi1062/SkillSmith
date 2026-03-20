import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("plugins", "routes/plugins.tsx"),
  route("plugins/new", "routes/plugins.new.tsx"),
  route("plugins/:id", "routes/plugins.$id.tsx"),
  route("plugins/:id/edit", "routes/plugins.$id.edit.tsx"),
  route("plugins/:id/destroy", "routes/plugins.$id.destroy.tsx"),
  route(
    "plugins/:id/components/new",
    "routes/plugins.$id.components.new.tsx",
  ),
] satisfies RouteConfig;
