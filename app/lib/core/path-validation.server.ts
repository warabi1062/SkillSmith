import path from "node:path";

/**
 * ファイル名が安全かどうかを検証する。
 * 以下の場合に false を返す:
 * - ".." セグメントを含む（パスセパレータで区切られた ".."）
 * - 絶対パスである（"/" で始まる）
 * - null バイトを含む
 * - 空文字列である
 */
export function isSafeFilename(filename: string): boolean {
  if (!filename || filename.length === 0) {
    return false;
  }

  if (filename.includes("\0")) {
    return false;
  }

  if (path.isAbsolute(filename)) {
    return false;
  }

  const segments = filename.split(/[/\\]/);
  if (segments.some((seg) => seg === "..")) {
    return false;
  }

  return true;
}

/**
 * 解決済みパスが指定されたベースディレクトリ内にあるかを検証する。
 * resolvedPath が baseDir と一致するか、baseDir + path.sep で始まるかを確認。
 */
export function isWithinDirectory(
  resolvedPath: string,
  baseDir: string,
): boolean {
  if (resolvedPath === baseDir) {
    return true;
  }

  return resolvedPath.startsWith(baseDir + path.sep);
}
