type FrontmatterValue = string | number | boolean | string[] | null | undefined;

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
  // quotes, newlines, leading/trailing whitespace, pipe, ampersand, asterisk,
  // exclamation, at, backtick, greater-than (YAML block/flow indicators)
  return /[:#{[}"'\n\r|&*!@`>]|^\s|\s$/.test(value);
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
    // 配列値は改行で始まるため、コロン直後に連結する
    if (serialized.startsWith("\n")) {
      lines.push(`${key}:${serialized}`);
    } else {
      lines.push(`${key}: ${serialized}`);
    }
  }

  if (lines.length === 0) {
    return "---\n---";
  }

  return `---\n${lines.join("\n")}\n---`;
}
