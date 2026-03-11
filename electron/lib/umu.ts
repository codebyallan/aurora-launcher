import type { UmuSearchResult } from '../../app/types/index'

const UMU_API = 'https://umu.openwinecomponents.org/umu_api.php'

/** Search order — Steam is tried first because it has the most coverage. */
const STORE_PRIORITY = ['steam', 'egs', 'gog', 'ubisoft', 'battlenet', 'ea', 'none'] as const

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
 * Falls back to `{ gameId: 'umu-default', store: 'none' }` when nothing is found.
 */
export async function umuSearch(name: string): Promise<UmuSearchResult> {
  const settled = await Promise.allSettled(
    STORE_PRIORITY.map(store =>
      fetchForStore<{ umu_id: string }>({ title: name, store })
        .then(rows => rows ? { gameId: rows[0]!.umu_id, store } : null)
    )
  )

  const match = settled.find(r => r.status === 'fulfilled' && r.value !== null)
  if (match?.status === 'fulfilled' && match.value) return match.value

  return { gameId: 'umu-default', store: 'none' }
}
