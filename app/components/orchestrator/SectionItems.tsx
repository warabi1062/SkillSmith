import { BodyContent } from "./BodyContent";
import type { SectionFields, SupportFileMap } from "./types";

// セクション一覧の表示
export function SectionItems({
  sections,
  supportFiles,
}: {
  sections: SectionFields[];
  supportFiles?: SupportFileMap;
}) {
  return (
    <>
      {sections.map((s) => (
        <div
          key={s.heading}
          className="border border-border-subtle rounded-md mb-2 overflow-hidden bg-bg-surface"
        >
          <div className="px-3.5 py-2 font-display text-sm font-medium text-text-tertiary bg-bg-elevated border-b border-border-subtle">
            {s.heading}
          </div>
          <div className="px-3.5 py-2.5">
            <BodyContent body={s.body} supportFiles={supportFiles} />
          </div>
        </div>
      ))}
    </>
  );
}
