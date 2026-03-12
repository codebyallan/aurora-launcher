import type { SgdbCovers } from '../../app/types/index'
import { downloadCover } from './covers'

const SGDB_BASE = 'https://www.steamgriddb.com/api/v2'

// The actual shape returned by the SGDB API for image assets.
// `score` is SGDB's native ranking (upvote% based — do NOT recompute it).
// `mime`, `width`, `height` are available since a 2020 changelog update.
interface SgdbImage {
  url: string
  score: number
  style?: string
  mime?: string
  width?: number
  height?: number
}

interface SgdbSearchResult {
  id: number
  verified: boolean
}

async function sgdbGet<T>(endpoint: string): Promise<T | null> {
  const key = process.env.STEAMGRIDDB_API_KEY ?? ''
  if (!key) return null
  try {
    const res = await fetch(`${SGDB_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    if (!res.ok) return null
    const json = await res.json() as { success: boolean, data: T }
    return json.success ? json.data : null
  } catch {
    return null
  }
}

/**
 * Resolves the SteamGridDB internal game ID from our stored metadata.
 *
 * Priority:
 *   1. Steam App ID  — extracted from umu-id ("umu-1245620" → "1245620")
 *   2. EGS App ID    — when store is egs/epic
 *   3. GOG App ID    — when store is gog
 *   4. Text search   — prefers verified entries (tied to a real store ID on SGDB)
 */
async function resolveSgdbId(name: string, gameId: string, store: string): Promise<number | null> {
  // umu-ids are formatted as "umu-XXXXXXX" where XXXXXXX is the Steam App ID.
  const rawId = gameId.startsWith('umu-') ? gameId.slice(4) : gameId

  // Steam direct lookup — most accurate, zero ambiguity
  if (rawId !== 'default' && /^\d+$/.test(rawId)) {
    const game = await sgdbGet<{ id: number }>(`/games/steam/${rawId}`)
    if (game?.id) return game.id
  }

  const lc = store?.toLowerCase() ?? ''

  if ((lc === 'egs' || lc === 'epic') && rawId !== 'default') {
    const game = await sgdbGet<{ id: number }>(`/games/egs/${rawId}`)
    if (game?.id) return game.id
  }

  if (lc === 'gog' && rawId !== 'default') {
    const game = await sgdbGet<{ id: number }>(`/games/gog/${rawId}`)
    if (game?.id) return game.id
  }

  // Text search fallback — prefer verified entries over unverified ones
  const results = await sgdbGet<SgdbSearchResult[]>(
    `/search/autocomplete/${encodeURIComponent(name)}`
  )
  if (!results?.length) return null

  const verified = results.find(r => r.verified)
  return (verified ?? results[0]!).id
}

/**
 * Fetches the best hero (background) image for the launcher.
 *
 * The SGDB API already returns results sorted by score (upvote% based) so we
 * use the native score rather than recomputing it from upvotes/downvotes.
 *
 * Hero strategy (two-pass):
 *   Pass 1 — request only "alternate" style at 1920x620 or 3840x1240.
 *             "alternate" = clean cinematic art with no logo/text overlay,
 *             exactly what looks great as a full-screen launcher background.
 *             This is the default style recommended by the SGDB community
 *             and tools like steamgrid / steam-rom-manager.
 *   Pass 2 — if no alternate images exist, fall back to all styles.
 *             Use the native `score` as primary sort, break ties by resolution.
 *             "blurred" and "material" are intentionally deprioritized in the
 *             tiebreaker because they tend to look generic for a TV launcher.
 */
async function bestHero(sgdbId: number): Promise<string | null> {
  // Pass 1: alternate style only, standard hero dimensions
  const altItems = await sgdbGet<SgdbImage[]>(
    `/heroes/game/${sgdbId}?styles=alternate&dimensions=1920x620,3840x1240,1600x650&nsfw=false&humor=false`
  )

  if (altItems?.length) {
    // API already sorted by score — just pick the first (highest score).
    // Break ties by resolution so we get the crispest result.
    return altItems
      .sort((a, b) => b.score - a.score || (b.width ?? 0) - (a.width ?? 0))[0]!.url
  }

  // Pass 2: no alternate found — take the best-scored image from all styles,
  // but penalize "blurred" and "material" which rarely look good as backgrounds.
  const allItems = await sgdbGet<SgdbImage[]>(
    `/heroes/game/${sgdbId}?nsfw=false&humor=false`
  )
  if (!allItems?.length) return null

  const STYLE_PENALTY: Record<string, number> = { blurred: -50, material: -30 }

  return allItems
    .map(img => ({
      url: img.url,
      sort: img.score + (STYLE_PENALTY[img.style ?? ''] ?? 0) + ((img.width ?? 0) >= 1920 ? 5 : 0)
    }))
    .sort((a, b) => b.sort - a.sort)[0]!.url
}

/**
 * Fetches the best icon image for the carousel card.
 *
 * Icon strategy (two-pass):
 *   Pass 1 — request only PNG and WebP, which support transparency.
 *             A transparent icon looks dramatically better on the dark card
 *             background vs a JPEG with a white/black fill.
 *   Pass 2 — if no transparent icons exist, fall back to all mimes.
 *             Use native score as the sole sort key.
 */
async function bestIcon(sgdbId: number): Promise<string | null> {
  // Pass 1: transparent formats only
  const transparentItems = await sgdbGet<SgdbImage[]>(
    `/icons/game/${sgdbId}?mimes=image/png,image/webp&nsfw=false&humor=false`
  )

  if (transparentItems?.length) {
    return transparentItems.sort((a, b) => b.score - a.score)[0]!.url
  }

  // Pass 2: any mime type
  const allItems = await sgdbGet<SgdbImage[]>(
    `/icons/game/${sgdbId}?nsfw=false&humor=false`
  )
  if (!allItems?.length) return null

  return allItems.sort((a, b) => b.score - a.score)[0]!.url
}

export async function sgdbFetchCovers(
  name: string,
  gameId: string,
  store: string
): Promise<SgdbCovers> {
  const sgdbId = await resolveSgdbId(name, gameId, store)
  if (!sgdbId) return { hero: null, icon: null }

  const [heroUrl, iconUrl] = await Promise.all([
    bestHero(sgdbId),
    bestIcon(sgdbId)
  ])

  const [hero, icon] = await Promise.all([
    heroUrl ? downloadCover(heroUrl, 'hero') : null,
    iconUrl ? downloadCover(iconUrl, 'icon') : null
  ])

  return { hero, icon }
}
