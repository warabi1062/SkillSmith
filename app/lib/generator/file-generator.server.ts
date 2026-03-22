import { isSafeFilename } from "../path-validation.server";
import type { GeneratedFile } from "./types";

interface ComponentFileData {
  id: string;
  role: string;
  filename: string;
  content: string;
}

/**
 * コンポーネントのサポートファイル（template.md, reference.md等）を生成する。
 *
 * @param componentDir - コンポーネントのディレクトリパス（例: "skills/my-skill"）
 * @param files - コンポーネントの全ComponentFileレコード
 * @param componentId - トレーサビリティ用コンポーネントID
 */
export function generateSupportFiles(
  componentDir: string,
  files: ComponentFileData[],
  componentId: string,
): GeneratedFile[] {
  return files
    .filter((f) => isSafeFilename(f.filename))
    .map((f) => ({
      path: `${componentDir}/${f.filename}`,
      content: f.content.endsWith("\n") ? f.content : f.content + "\n",
      componentId,
    }));
}
