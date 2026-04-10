import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SupportFilePanel } from "./SupportFilePanel";
import type { SupportFileMap } from "./types";

// body テキスト内をMarkdownレンダリングするコンポーネント
// supportFiles内のファイルへのリンクはクリックでサイドパネルを開く
export function BodyContent({
  body,
  supportFiles,
}: {
  body: string;
  supportFiles?: SupportFileMap;
}) {
  const [openFile, setOpenFile] = useState<string | null>(null);

  if (!body) return null;

  return (
    <>
      <div className="my-1 mb-2 font-body text-sm break-words text-text-secondary leading-relaxed ov-markdown">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            strong: ({ children }) => <span>{children}</span>,
            a: ({ href, children }) => {
              const filename = href?.replace(/^\.\//, "") ?? "";
              const fileContent = supportFiles?.[filename];
              if (fileContent !== undefined) {
                return (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 font-mono text-[0.8rem] text-accent-teal bg-bg-elevated border border-border-subtle rounded-sm cursor-pointer hover:border-accent-teal hover:bg-accent-teal-dim transition-all before:content-['📄'] before:text-xs"
                    onClick={() => setOpenFile(filename)}
                  >
                    {children}
                  </span>
                );
              }
              return <a href={href}>{children}</a>;
            },
          }}
        >
          {body}
        </Markdown>
      </div>
      {openFile && supportFiles?.[openFile] !== undefined && (
        <SupportFilePanel
          filename={openFile}
          content={supportFiles[openFile]}
          onClose={() => setOpenFile(null)}
        />
      )}
    </>
  );
}
