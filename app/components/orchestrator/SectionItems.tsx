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
          <label className="block font-display text-xs font-semibold mb-1 text-text-tertiary uppercase tracking-widest">
            {s.heading}
          </label>
          <BodyContent body={s.body} supportFiles={supportFiles} />
        </div>
      ))}
    </>
  );
}
