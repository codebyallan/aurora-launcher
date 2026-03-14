import type { UmuSearchResult } from '../../app/types/index'

const UMU_API = 'https://umu.openwinecomponents.org/umu_api.php'

/** Search order — Steam is tried first because it has the most coverage. */
const STORE_PRIORITY = ['steam', 'egs', 'gog', 'ubisoft', 'battlenet', 'ea', 'none'] as const
type Store = typeof STORE_PRIORITY[number]

interface StoreMatch { gameId: string, store: Store, priority: number }

async function fetchForStore<T>(params: Record<string, string>): Promise<T[] | null> {
  try {
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')
    const res = await fetch(`${UMU_API}?${qs}`)
    if (!res.ok) return null
    const data = await res.json() as T[]
    return Array.isArray(data) && data.length > 0 ? data : null
  } catch {
    return null
  }
}

/**
 * Searches the UMU database for the best matching entry.
 * All stores are queried in parallel for speed, but the result is chosen by
 * STORE_PRIORITY order — not by which response arrived first — so Steam always
 * wins over EGS even if EGS happened to respond faster.
 * Falls back to `{ gameId: 'umu-default', store: 'none' }` when nothing is found.
 */
export async function umuSearch(name: string): Promise<UmuSearchResult> {
  const settled = await Promise.allSettled(
    STORE_PRIORITY.map((store, priority) =>
      fetchForStore<{ umu_id: string }>({ title: name, store })
        .then((rows): StoreMatch | null => rows ? { gameId: rows[0]!.umu_id, store, priority } : null)
    )
  )

  const match = settled
    .filter((r): r is PromiseFulfilledResult<StoreMatch> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .sort((a, b) => a.value.priority - b.value.priority)[0]

  if (match) return { gameId: match.value.gameId, store: match.value.store }

  return { gameId: 'umu-default', store: 'none' }
}
