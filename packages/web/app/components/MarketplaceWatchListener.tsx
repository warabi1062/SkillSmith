import { useEffect } from "react";
import { useRevalidator } from "react-router";

// /api/events からの marketplaces-changed イベントを受信して全 loader を再実行するコンポーネント。
// サーバー側の chokidar が plugin.ts や marketplace.ts の変更を検知すると SSE で通知される。
export function MarketplaceWatchListener() {
  const revalidator = useRevalidator();

  useEffect(() => {
    const es = new EventSource("/api/events");
    const onChange = () => {
      revalidator.revalidate();
    };
    es.addEventListener("marketplaces-changed", onChange);
    return () => {
      es.removeEventListener("marketplaces-changed", onChange);
      es.close();
    };
  }, [revalidator]);

  return null;
}
