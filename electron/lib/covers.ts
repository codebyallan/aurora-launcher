import { copyFileSync, writeFileSync } from 'fs'
import path from 'path'
import { getCoversDir } from './paths'

/**
 * Copies a user-selected local image into the covers directory and returns
 * the generated filename (not the full path — served via cover:// protocol).
 */
export function copyLocalImage(srcPath: string): string {
  const ext = path.extname(srcPath) || '.jpg'
  const filename = `${Date.now()}${ext}`
  copyFileSync(srcPath, path.join(getCoversDir(), filename))
  return filename
}

/**
 * Downloads a remote image URL, saves it to the covers directory, and returns
 * the filename. Returns null on any network or I/O error.
 */
export async function downloadCover(url: string, prefix: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    // Extract extension from URL path (before any query string)
    const ext = url.split('?')[0]!.match(/\.(png|jpg|jpeg|webp)$/i)?.[0] ?? '.jpg'
    const filename = `${prefix}_${Date.now()}${ext}`
    writeFileSync(path.join(getCoversDir(), filename), buf)
    return filename
  } catch {
    return null
  }
}
