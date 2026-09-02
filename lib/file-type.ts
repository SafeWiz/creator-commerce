/**
 * A short display label for a file, from its extension.
 *
 * Cosmetic only — nothing branches on the result, so a missing or unrecognised
 * extension is a fallback rather than an error. Capped at four characters so a
 * pathological name cannot stretch a table column.
 */
export function fileTypeLabel(fileName: string): string {
  const extension = fileName.split('.').pop()
  // No dot at all means `pop()` returned the whole name, which is not an
  // extension.
  if (!extension || extension === fileName) return 'FILE'
  return extension.slice(0, 4).toUpperCase()
}
