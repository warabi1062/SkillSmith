import type { GenerationValidationError } from "./types";

type FrontmatterValue =
  | string
  | number
  | boolean
  | string[]
  | null
  | undefined;

/**
 * Parse a JSON string field into a string array.
 * Returns the parsed array on success, or null with a validation error on failure.
 */
export function parseJsonArrayField(
  value: string | null | undefined,
  fieldName: string,
  componentId?: string,
): {
  parsed: string[] | null;
  error: GenerationValidationError | null;
} {
  if (value == null) {
    return { parsed: null, error: null };
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return {
        parsed: null,
        error: {
          severity: "warning",
          code: "JSON_PARSE_FAILED",
          message: `Field "${fieldName}" is not a JSON array`,
          componentId,
          field: fieldName,
        },
      };
    }
    return { parsed: parsed.map(String), error: null };
  } catch {
    return {
      parsed: null,
      error: {
        severity: "warning",
        code: "JSON_PARSE_FAILED",
        message: `Failed to parse JSON for field "${fieldName}"`,
        componentId,
        field: fieldName,
      },
    };
  }
}

function serializeYamlValue(value: FrontmatterValue): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }
    return "\n" + value.map((item) => `  - ${item}`).join("\n");
  }

  // string - escape if it contains special YAML characters
  if (needsYamlQuoting(value)) {
    return `"${escapeYamlDoubleQuoted(value)}"`;
  }
  return value;
}

/**
 * Check if a string value needs to be quoted in YAML.
 * Values containing special characters must be double-quoted to avoid
 * YAML parsing ambiguity.
 */
function needsYamlQuoting(value: string): boolean {
  if (value === "") {
    return true;
  }
  // Characters that require quoting: colon+space, hash, braces, brackets,
  // quotes, newlines, leading/trailing whitespace
  return /[:#{\[}"'\n\r]|^\s|\s$/.test(value);
}

/**
 * Escape special characters inside a YAML double-quoted string.
 */
function escapeYamlDoubleQuoted(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

/**
 * Serialize a record of key-value pairs into YAML frontmatter format.
 * Fields with null/undefined values are omitted.
 */
export function serializeFrontmatter(
  fields: Record<string, FrontmatterValue>,
): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(fields)) {
    const serialized = serializeYamlValue(value);
    if (serialized == null) {
      continue;
    }
    lines.push(`${key}: ${serialized}`);
  }

  if (lines.length === 0) {
    return "---\n---";
  }

  return `---\n${lines.join("\n")}\n---`;
}

/**
 * Check if a hooks field is set and return a validation warning if so.
 */
export function checkHooksField(
  hooks: string | null | undefined,
  componentId?: string,
): GenerationValidationError | null {
  if (hooks != null && hooks !== "") {
    return {
      severity: "warning",
      code: "HOOKS_NOT_SUPPORTED",
      message:
        "hooks field is not supported in the current version and will be omitted",
      componentId,
      field: "hooks",
    };
  }
  return null;
}
