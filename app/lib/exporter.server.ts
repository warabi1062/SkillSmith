import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { generatePlugin } from "./generator/index";

export interface ExportOptions {
  targetDir: string;
  overwrite: boolean;
}

export interface ExportResult {
  success: boolean;
  exportedDir: string;
  writtenFiles: string[];
  skippedFiles: string[];
  errors: string[];
}

export async function exportPlugin(
  pluginId: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const result: ExportResult = {
    success: false,
    exportedDir: "",
    writtenFiles: [],
    skippedFiles: [],
    errors: [],
  };

  const generateResult = await generatePlugin(pluginId);
  if (!generateResult) {
    result.errors.push("Plugin not found");
    return result;
  }

  const { plugin } = generateResult;
  const resolvedTargetDir = path.resolve(options.targetDir);

  for (const file of plugin.files) {
    const filePath = path.join(resolvedTargetDir, file.path);
    const fileDir = path.dirname(filePath);

    try {
      await mkdir(fileDir, { recursive: true });

      if (!options.overwrite) {
        try {
          await access(filePath);
          result.skippedFiles.push(file.path);
          continue;
        } catch {
          // File does not exist, proceed to write
        }
      }

      await writeFile(filePath, file.content, "utf-8");
      result.writtenFiles.push(file.path);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error writing file";
      result.errors.push(`${file.path}: ${message}`);
    }
  }

  result.exportedDir = resolvedTargetDir;
  result.success = result.errors.length === 0;
  return result;
}
