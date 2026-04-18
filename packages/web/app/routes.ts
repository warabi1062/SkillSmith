import {
  type RouteConfig,
  index,
  route,
  layout,
} from "@react-router/dev/routes";

export default [
  index("routes/marketplaces.tsx"),
  layout("routes/marketplaces.$marketplaceId.tsx", [
    route(
      "marketplaces/:marketplaceId",
      "routes/marketplaces.$marketplaceId._index.tsx",
    ),
    layout("routes/marketplaces.$marketplaceId.plugins.$id.tsx", [
      route(
        "marketplaces/:marketplaceId/plugins/:id",
        "routes/marketplaces.$marketplaceId.plugins.$id._index.tsx",
      ),
      route(
        "marketplaces/:marketplaceId/plugins/:id/orchestrators/:name",
        "routes/marketplaces.$marketplaceId.plugins.$id.orchestrators.$name.tsx",
      ),
      route(
        "marketplaces/:marketplaceId/plugins/:id/skills/:name",
        "routes/marketplaces.$marketplaceId.plugins.$id.skills.$name.tsx",
      ),
    ]),
  ]),
] satisfies RouteConfig;
