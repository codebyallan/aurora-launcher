import type { SgdbCovers } from '../../app/types/index'
import { downloadCover } from './covers'

// ── Proxy URL ─────────────────────────────────────────────────────────────────
// All SGDB requests go through the Aurora proxy (Vercel Edge Function).
// The API key lives server-side — it is never bundled into the AppImage.
//
// PROXY_BASE is injected at build time by tsup via process.env.AURORA_SGDB_PROXY.
// If the variable is not set (e.g. local dev without .env), SGDB is disabled
// and all cover fetches return { hero: null, icon: null } silently.
//
// In production, set the GitHub Actions secret AURORA_SGDB_PROXY before building.
// For local dev, add AURORA_SGDB_PROXY=http://localhost:3000/api/sgdb to .env.
const PROXY_BASE = process.env.AURORA_SGDB_PROXY

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

// ── HTTP helper ───────────────────────────────────────────────────────────────
// No Authorization header here — the proxy adds it server-side.
async function sgdbGet<T>(endpoint: string): Promise<T | null> {
  // Proxy not configured — silently disable SGDB for this build.
  if (!PROXY_BASE) return null

  try {
    const res = await fetch(`${PROXY_BASE}${endpoint}`)

    // 429 = rate limit hit on the proxy
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After')
      console.warn(`[sgdb] rate limited by proxy. Retry after ${retryAfter ?? '?'}s`)
      return null
    }

    if (!res.ok) return null
    const json = await res.json() as { success: boolean, data: T }
    return json.success ? json.data : null
  } catch {
    return null
  }
}

// ── SGDB ID resolution ────────────────────────────────────────────────────────
// Priority:
//   1. Steam App ID  — extracted from umu-id ("umu-1245620" → "1245620")
//   2. EGS App ID    — when store is egs/epic
//   3. GOG App ID    — when store is gog
//   4. Text search   — prefers verified entries (tied to a real store ID on SGDB)
async function resolveSgdbId(name: string, gameId: string, store: string): Promise<number | null> {
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

// ── Hero image ────────────────────────────────────────────────────────────────
// Two-pass strategy:
//   Pass 1 — "alternate" style only (clean cinematic art, no logo overlay).
//   Pass 2 — fallback to all styles, penalizing "blurred" and "material".
async function bestHero(sgdbId: number): Promise<string | null> {
  const altItems = await sgdbGet<SgdbImage[]>(
    `/heroes/game/${sgdbId}?styles=alternate&dimensions=1920x620,3840x1240,1600x650&nsfw=false&humor=false`
  )

  if (altItems?.length) {
    return altItems
      .sort((a, b) => b.score - a.score || (b.width ?? 0) - (a.width ?? 0))[0]!.url
  }

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

// ── Icon image ────────────────────────────────────────────────────────────────
// Two-pass strategy:
//   Pass 1 — PNG and WebP only (support transparency — looks better on dark cards).
//   Pass 2 — fallback to all mimes, sorted by native score.
async function bestIcon(sgdbId: number): Promise<string | null> {
  const transparentItems = await sgdbGet<SgdbImage[]>(
    `/icons/game/${sgdbId}?mimes=image/png,image/webp&nsfw=false&humor=false`
  )

  if (transparentItems?.length) {
    return transparentItems.sort((a, b) => b.score - a.score)[0]!.url
  }

  const allItems = await sgdbGet<SgdbImage[]>(
    `/icons/game/${sgdbId}?nsfw=false&humor=false`
  )
  if (!allItems?.length) return null

  return allItems.sort((a, b) => b.score - a.score)[0]!.url
}

// ── Public API ────────────────────────────────────────────────────────────────

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
