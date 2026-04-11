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
        <div key={s.heading} className="mb-3">
          <label className="block font-display text-[0.6875rem] font-semibold mb-1.5 text-on-surface-variant uppercase tracking-widest">
            {s.heading}
          </label>
          <BodyContent body={s.body} supportFiles={supportFiles} />
        </div>
      ))}
    </>
  );
}
