import type { SgdbCovers } from '../../app/types/index'
import { downloadCover } from './covers'

const SGDB_BASE = 'https://www.steamgriddb.com/api/v2'

interface SgdbImage {
  url: string
  upvotes: number
  downvotes: number
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
 * Tries Steam app ID first (most common), then EGS, then a text search.
 */
async function resolveSgdbId(name: string, gameId: string, store: string): Promise<number | null> {
  if (gameId !== 'umu-default' && /^\d+$/.test(gameId)) {
    const game = await sgdbGet<{ id: number }>(`/games/steam/${gameId}`)
    if (game?.id) return game.id
  }

  const lc = store?.toLowerCase() ?? ''
  if ((lc === 'egs' || lc === 'epic') && gameId !== 'umu-default') {
    const game = await sgdbGet<{ id: number }>(`/games/egs/${gameId}`)
    if (game?.id) return game.id
  }

  const results = await sgdbGet<Array<{ id: number }>>(`/search/autocomplete/${encodeURIComponent(name)}`)
  return results?.[0]?.id ?? null
}

/** Picks the highest-rated image from a SGDB endpoint. */
async function bestImage(endpoint: string): Promise<string | null> {
  const items = await sgdbGet<SgdbImage[]>(endpoint)
  if (!items?.length) return null
  return items
    .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))[0]!
    .url
}

export async function sgdbFetchCovers(
  name: string,
  gameId: string,
  store: string
): Promise<SgdbCovers> {
  const sgdbId = await resolveSgdbId(name, gameId, store)
  if (!sgdbId) return { hero: null, icon: null }

  const [heroUrl, iconUrl] = await Promise.all([
    bestImage(`/heroes/game/${sgdbId}?nsfw=false&humor=false`),
    bestImage(`/icons/game/${sgdbId}?nsfw=false&humor=false`)
  ])

  const [hero, icon] = await Promise.all([
    heroUrl ? downloadCover(heroUrl, 'hero') : null,
    iconUrl ? downloadCover(iconUrl, 'icon') : null
  ])

  return { hero, icon }
}
