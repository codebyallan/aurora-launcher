/**
 * Converts a raw image path (filename or URL) into a displayable URL.
 *
 * - Full URLs (http/https/cover://) are returned unchanged.
 * - Plain filenames are prefixed with `cover://localhost/` so Electron's
 *   custom protocol can serve them from ~/.config/aurora-launcher/covers.
 */
export function toImageUrl(path?: string): string | undefined {
  if (!path) return undefined
  if (
    path.startsWith('http://')
    || path.startsWith('https://')
    || path.startsWith('cover://')
  ) return path
  return `cover://localhost/${path}`
}
