import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { router } from "./router";
// Tailwind 等のグローバルスタイルを SPA エントリから読み込む
import "../app/app.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("ルート要素 #root が見つかりません");
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
