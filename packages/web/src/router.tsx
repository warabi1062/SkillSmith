import { createBrowserRouter } from "react-router";
import Root, { ErrorBoundary } from "../app/root";
import Marketplaces, {
  loader as marketplacesLoader,
} from "../app/routes/marketplaces";
import MarketplaceLayout, {
  loader as marketplaceLayoutLoader,
  handle as marketplaceLayoutHandle,
} from "../app/routes/marketplaces.$marketplaceId";
import MarketplacePlugins, {
  loader as marketplacePluginsLoader,
} from "../app/routes/marketplaces.$marketplaceId._index";
import PluginLayout, {
  loader as pluginLayoutLoader,
  handle as pluginLayoutHandle,
} from "../app/routes/marketplaces.$marketplaceId.plugins.$id";
import PluginDetail from "../app/routes/marketplaces.$marketplaceId.plugins.$id._index";
import OrchestratorDetail, {
  handle as orchestratorHandle,
} from "../app/routes/marketplaces.$marketplaceId.plugins.$id.orchestrators.$name";
import SkillDetailPage, {
  handle as skillHandle,
} from "../app/routes/marketplaces.$marketplaceId.plugins.$id.skills.$name";

// ルート定義: 既存 7 ルートを Data mode で 1:1 に移植
export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    ErrorBoundary,
    children: [
      { index: true, Component: Marketplaces, loader: marketplacesLoader },
      {
        path: "marketplaces/:marketplaceId",
        Component: MarketplaceLayout,
        loader: marketplaceLayoutLoader,
        handle: marketplaceLayoutHandle,
        children: [
          {
            index: true,
            Component: MarketplacePlugins,
            loader: marketplacePluginsLoader,
          },
          {
            path: "plugins/:id",
            Component: PluginLayout,
            loader: pluginLayoutLoader,
            handle: pluginLayoutHandle,
            children: [
              { index: true, Component: PluginDetail },
              {
                path: "orchestrators/:name",
                Component: OrchestratorDetail,
                handle: orchestratorHandle,
              },
              {
                path: "skills/:name",
                Component: SkillDetailPage,
                handle: skillHandle,
              },
            ],
          },
        ],
      },
    ],
  },
]);
