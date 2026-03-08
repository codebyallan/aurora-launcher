/**
 * Converts an iconPath stored in the library to a displayable URL.
 *
 * Covers copied by Electron are stored as plain filenames e.g. "1748000000000.jpg"
 * and served via the cover:// protocol as cover://localhost/<filename>
 *
 * The localhost host is required so Electron doesn't mistake the filename for the hostname.
 */
export function toImageUrl(iconPath?: string): string | undefined {
  if (!iconPath) return undefined
  if (iconPath.startsWith('http://') || iconPath.startsWith('https://') || iconPath.startsWith('cover://')) {
    return iconPath
  }
  // Plain filename → cover://localhost/<filename>
  return `cover://localhost/${iconPath}`
}
