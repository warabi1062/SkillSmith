import { Link, useMatches } from "react-router";

// handleに設定するブレッドクラム定義の型
// 静的ラベルの場合はオブジェクト、動的ラベルの場合はloaderDataを受け取る関数
type BreadcrumbItem = { label: string; to: string };
type BreadcrumbDef =
  | BreadcrumbItem
  | ((args: {
      data: unknown;
      params: Record<string, string | undefined>;
    }) => BreadcrumbItem);

// ルート階層からブレッドクラムアイテムを構築する
function useBreadcrumbs(): BreadcrumbItem[] {
  const matches = useMatches();
  const items: BreadcrumbItem[] = [];

  for (const match of matches) {
    const handle = match.handle as { breadcrumb?: BreadcrumbDef } | undefined;
    if (!handle?.breadcrumb) continue;

    const def = handle.breadcrumb;
    const resolved =
      typeof def === "function"
        ? def({ data: match.data, params: match.params })
        : def;

    items.push(resolved);
  }

  return items;
}

export default function Breadcrumb() {
  const items = useBreadcrumbs();

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-sm font-body">
        <li className="flex items-center gap-1.5">
          <Link to="/" className="text-on-surface-variant hover:text-primary">
            Top
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.to} className="flex items-center gap-1.5">
              <span className="text-outline select-none text-xs">/</span>
              {isLast ? (
                <span className="font-medium text-on-surface">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="text-on-surface-variant hover:text-primary"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
