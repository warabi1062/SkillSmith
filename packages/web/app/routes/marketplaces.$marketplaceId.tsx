import { Outlet } from "react-router";
import Breadcrumb from "../components/Breadcrumb";
import type { Route } from "./+types/marketplaces.$marketplaceId";

export async function loader({ params }: Route.LoaderArgs) {
  return { marketplaceId: params.marketplaceId };
}

// ブレッドクラム: 「Top > {marketplace名}」
export const handle = {
  breadcrumb: ({ data: loaderData }: { data: { marketplaceId: string } }) => ({
    label: loaderData.marketplaceId,
    to: `/marketplaces/${loaderData.marketplaceId}`,
  }),
};

export default function MarketplaceLayout(_props: Route.ComponentProps) {
  return (
    <>
      <Breadcrumb />
      <Outlet />
    </>
  );
}
