const STORAGE_KEY_PREFIX = "skillsmith:graph-positions:";

export function loadGraphPositions(
  pluginId: string,
): Record<string, { x: number; y: number }> | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${pluginId}`);
    if (raw === null) return null;
    return JSON.parse(raw) as Record<string, { x: number; y: number }>;
  } catch {
    return null;
  }
}

export function saveGraphPositions(
  pluginId: string,
  positions: Record<string, { x: number; y: number }>,
): void {
  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${pluginId}`,
    JSON.stringify(positions),
  );
}

export function clearGraphPositions(pluginId: string): void {
  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${pluginId}`);
}
