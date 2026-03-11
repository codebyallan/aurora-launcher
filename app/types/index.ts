// ─────────────────────────────────────────────────────────────────────────────
// Domain models
// ─────────────────────────────────────────────────────────────────────────────

/** Full config persisted per game in library.json and passed to umu-run. */
export interface UMUConfig {
  name: string
  description?: string
  heroPath: string
  iconPath: string
  /** Absolute Linux path to the Wine prefix (WINEPREFIX). */
  winePath: string
  /** Absolute path to the Windows executable. */
  executable: string
  /** umu-id from the UMU database, e.g. "umu-12345" or "umu-default". */
  gameId: string
  /** Store slug: steam | egs | gog | ubisoft | battlenet | ea | none. */
  store: string
  /** Proton build path or "GE-Proton" to let umu-run resolve automatically. */
  protonPath: string
  /** Positional CLI args passed to umu-run after the executable path. */
  arguments: string[]
  /** Extra env vars injected into the game process (e.g. MANGOHUD=1, DXVK_HUD=fps,frametimes). */
  extraEnv?: Record<string, string>
}

/** A single entry shown in the game carousel. */
export interface CarouselItem {
  id: number
  title: string
  description?: string
  /** Hero/banner image — filename served via cover:// or a full URL. */
  image: string
  /** Square icon — filename served via cover:// or a full URL. */
  icon: string
  rawData?: UMUConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC payload types  (renderer ↔ main, both sides use the same shapes)
// ─────────────────────────────────────────────────────────────────────────────

/** Payload sent over IPC to launch a game process. */
export interface LaunchPayload extends UMUConfig {
  /** CarouselItem.id — used to correlate log/exit events back to the item. */
  gameItemId: number
}

export interface GameLogPayload {
  gameItemId: number
  msg: string
}

export interface GameExitPayload {
  code: number | null
  gameItemId: number
}

export interface SgdbFetchParams {
  name: string
  gameId: string
  store: string
}

export interface SgdbCovers {
  hero: string | null
  icon: string | null
}

export interface UmuSearchResult {
  gameId: string
  store: string
}
