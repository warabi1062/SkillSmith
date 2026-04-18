import { Outlet } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import Breadcrumb from "../components/Breadcrumb";

// marketplace レイアウト: handle.breadcrumb から参照するため loader は残すが、
// Component 側では loaderData を直接使わないため useLoaderData は呼ばない
export async function loader({ params }: LoaderFunctionArgs) {
  return { marketplaceId: params.marketplaceId ?? "" };
}

// ブレッドクラム: 「Top > {marketplace名}」
export const handle = {
  breadcrumb: ({ data: loaderData }: { data: { marketplaceId: string } }) => ({
    label: loaderData.marketplaceId,
    to: `/marketplaces/${loaderData.marketplaceId}`,
  }),
};

export default function MarketplaceLayout() {
  return (
    <>
      <Breadcrumb />
      <Outlet />
    </>
  );
}
