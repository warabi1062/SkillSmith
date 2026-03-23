import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("plugins", "routes/plugins.tsx"),
  route("plugins/:id", "routes/plugins.$id.tsx"),
] satisfies RouteConfig;
