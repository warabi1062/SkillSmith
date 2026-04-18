import { isSafeFilename } from "../core/path-validation.server";
import type { GeneratedFile } from "./types";

// サポートファイルの入力データ
interface SupportFileInput {
  filename: string;
  content: string;
}

/**
 * コンポーネントのサポートファイル（template.md, reference.md等）を生成する。
 *
 * @param componentDir - コンポーネントのディレクトリパス（例: "skills/my-skill"）
 * @param files - サポートファイルデータ
 * @param skillName - トレーサビリティ用スキル名
 */
export function generateSupportFiles(
  componentDir: string,
  files: SupportFileInput[],
  skillName: string,
): GeneratedFile[] {
  return files
    .filter((f) => isSafeFilename(f.filename))
    .map((f) => ({
      path: `${componentDir}/${f.filename}`,
      content: f.content.endsWith("\n") ? f.content : f.content + "\n",
      skillName,
    }));
}
