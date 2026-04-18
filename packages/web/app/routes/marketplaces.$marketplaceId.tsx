import { Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import Breadcrumb from "../components/Breadcrumb";

// marketplace レイアウト: params だけを返す軽量 loader（API 呼び出しは不要）
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
  useLoaderData() as { marketplaceId: string };
  return (
    <>
      <Breadcrumb />
      <Outlet />
    </>
  );
}
