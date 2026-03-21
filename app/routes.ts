import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("plugins", "routes/plugins.tsx"),
  route("plugins/new", "routes/plugins.new.tsx"),
  route("plugins/:id", "routes/plugins.$id.tsx"),
  route("plugins/:id/edit", "routes/plugins.$id.edit.tsx"),
  route("plugins/:id/destroy", "routes/plugins.$id.destroy.tsx"),
  route("plugins/:id/generate", "routes/plugins.$id.generate.tsx"),
  route("plugins/:id/export", "routes/plugins.$id.export.tsx"),
  route(
    "plugins/:id/dependencies/new",
    "routes/plugins.$id.dependencies.new.tsx",
  ),
  route(
    "plugins/:id/dependencies/:dependencyId/destroy",
    "routes/plugins.$id.dependencies.$dependencyId.destroy.tsx",
  ),
  route(
    "plugins/:id/dependencies/:dependencyId/reorder",
    "routes/plugins.$id.dependencies.$dependencyId.reorder.tsx",
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
  route(
    "plugins/:id/components/:componentId/files/:fileId/fields/new",
    "routes/plugins.$id.components.$componentId.files.$fileId.fields.new.tsx",
  ),
  route(
    "plugins/:id/components/:componentId/files/:fileId/fields/:fieldId/edit",
    "routes/plugins.$id.components.$componentId.files.$fileId.fields.$fieldId.edit.tsx",
  ),
  route(
    "plugins/:id/components/:componentId/files/:fileId/fields/:fieldId/destroy",
    "routes/plugins.$id.components.$componentId.files.$fileId.fields.$fieldId.destroy.tsx",
  ),
  route(
    "plugins/:id/components/:componentId/files/:fileId/fields/:fieldId/reorder",
    "routes/plugins.$id.components.$componentId.files.$fileId.fields.$fieldId.reorder.tsx",
  ),
] satisfies RouteConfig;
