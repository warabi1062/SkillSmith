import {
  mkdir,
  writeFile,
  access,
  copyFile,
  rm,
  mkdtemp,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { LoadedPluginDefinition } from "./types/loader.server";
import { generatePlugin } from "./generator/index";
import { isWithinDirectory } from "./path-validation.server";

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
  plugin: LoadedPluginDefinition,
  options: ExportOptions,
): Promise<ExportResult> {
  const result: ExportResult = {
    success: false,
    exportedDir: "",
    writtenFiles: [],
    skippedFiles: [],
    errors: [],
  };

  // generatePlugin は同期関数
  const generateResult = generatePlugin(plugin);

  const { plugin: generatedPlugin } = generateResult;
  const resolvedTargetDir = path.resolve(options.targetDir);

  // Create a temporary directory to stage all writes
  const tempDir = await mkdtemp(path.join(tmpdir(), "skillsmith-export-"));

  try {
    // Phase 1: Write all files to the temporary directory
    for (const file of generatedPlugin.files) {
      const targetFilePath = path.resolve(resolvedTargetDir, file.path);

      // Path traversal check
      if (!isWithinDirectory(targetFilePath, resolvedTargetDir)) {
        result.errors.push(
          `${file.path}: Path traversal detected - file path escapes target directory`,
        );
        continue;
      }

      const tempFilePath = path.join(tempDir, file.path);
      const tempFileDir = path.dirname(tempFilePath);

      // Check overwrite against the actual target directory
      if (!options.overwrite) {
        try {
          await access(targetFilePath);
          result.skippedFiles.push(file.path);
          continue;
        } catch {
          // File does not exist in target, proceed to write
        }
      }

      try {
        await mkdir(tempFileDir, { recursive: true });
        await writeFile(tempFilePath, file.content, "utf-8");
        result.writtenFiles.push(file.path);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown error writing file";
        result.errors.push(`${file.path}: ${message}`);
      }
    }

    // If any errors occurred during staging, abort without modifying target
    if (result.errors.length > 0) {
      result.writtenFiles = [];
      return result;
    }

    // Phase 2: Copy staged files from temp to target directory
    const copiedFiles: string[] = [];
    try {
      for (const filePath of result.writtenFiles) {
        const src = path.join(tempDir, filePath);
        const dest = path.join(resolvedTargetDir, filePath);
        const destDir = path.dirname(dest);

        await mkdir(destDir, { recursive: true });
        await copyFile(src, dest);
        copiedFiles.push(dest);
      }
    } catch (err) {
      // Rollback: remove all files that were successfully copied
      for (const copied of copiedFiles) {
        await rm(copied, { force: true }).catch(() => {
          // Best-effort rollback; ignore errors
        });
      }
      const message =
        err instanceof Error ? err.message : "Unknown error copying file";
      result.errors.push(
        `Failed to copy files to target directory: ${message}`,
      );
      result.writtenFiles = [];
      return result;
    }

    result.exportedDir = resolvedTargetDir;
    result.success = true;
  } finally {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true }).catch(() => {
      // Best-effort cleanup; ignore errors
    });
  }

  return result;
}
