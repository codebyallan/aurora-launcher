export function toImageUrl(iconPath?: string): string | undefined {
  if (!iconPath) return undefined
  if (
    iconPath.startsWith('http://')
    || iconPath.startsWith('https://')
    || iconPath.startsWith('cover://')
  ) return iconPath
  return `cover://localhost/${iconPath}`
}
