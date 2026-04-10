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
          className="border border-border-subtle rounded-md mb-2 bg-bg-surface transition-all hover:border-border-default"
        >
          <div className="px-3.5 py-2.5 font-display text-base font-semibold text-text-primary">
            {s.heading}
          </div>
          <div className="px-3.5 pb-3.5">
            <BodyContent body={s.body} supportFiles={supportFiles} />
          </div>
        </div>
      ))}
    </>
  );
}
