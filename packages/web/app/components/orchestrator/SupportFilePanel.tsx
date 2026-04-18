import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// サポートファイルの内容をサイドパネルで表示するコンポーネント（Portalで body 直下にレンダリング）
export function SupportFilePanel({
  filename,
  content,
  onClose,
}: {
  filename: string;
  content: string;
  onClose: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-scrim/30 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-[min(600px,90vw)] h-screen bg-surface-container-lowest shadow-level4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <span className="font-mono text-sm font-semibold text-on-surface">
            {filename}
          </span>
          <button
            className="bg-transparent border-none text-2xl text-on-surface-variant cursor-pointer px-1 leading-none hover:text-on-surface"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="ov-sidepanel-content flex-1 overflow-y-auto p-5 text-sm leading-relaxed text-on-surface">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </div>
      </div>
    </div>,
    document.body,
  );
}
