import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/plugins.tsx"),
  layout("routes/plugins.$id.tsx", [
    route("plugins/:id", "routes/plugins.$id._index.tsx"),
    route(
      "plugins/:id/orchestrators/:name",
      "routes/plugins.$id.orchestrators.$name.tsx",
    ),
  ]),
] satisfies RouteConfig;
