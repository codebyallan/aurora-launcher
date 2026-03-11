import { contextBridge, ipcRenderer } from 'electron'
import type {
  CarouselItem,
  LaunchPayload,
  GameLogPayload,
  GameExitPayload,
  SgdbFetchParams,
  SgdbCovers,
  UmuSearchResult
} from '../app/types/index'

// ─────────────────────────────────────────────────────────────────────────────
// Public API surface — everything the renderer can call via window.electronAPI
// ─────────────────────────────────────────────────────────────────────────────

export interface ElectronAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  library: {
    load: () => Promise<CarouselItem[]>
    append: (game: CarouselItem) => Promise<CarouselItem>
    update: (id: number, game: Partial<CarouselItem>) => Promise<CarouselItem | null>
    remove: (id: number) => Promise<boolean>
  }
  dialog: {
    /** Returns the absolute path of the selected file, or null. */
    openFile: () => Promise<string | null>
    /** Returns the absolute path of the selected folder, or null. */
    openFolder: () => Promise<string | null>
    /** Copies the image into covers dir; returns the filename (not full path). */
    openImage: () => Promise<string | null>
  }
  game: {
    launch: (payload: LaunchPayload) => Promise<{ ok: boolean, error?: string }>
    kill: (gameItemId: number) => Promise<boolean>
    onLog: (cb: (payload: GameLogPayload) => void) => () => void
    onExit: (cb: (payload: GameExitPayload) => void) => () => void
  }
  sgdb: {
    fetchCovers: (params: SgdbFetchParams) => Promise<SgdbCovers>
  }
  umu: {
    search: (name: string) => Promise<UmuSearchResult>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  library: {
    load: () => ipcRenderer.invoke('library:load'),
    append: (game: CarouselItem) => ipcRenderer.invoke('library:append', game),
    update: (id: number, game: Partial<CarouselItem>) => ipcRenderer.invoke('library:update', id, game),
    remove: (id: number) => ipcRenderer.invoke('library:remove', id)
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    openImage: () => ipcRenderer.invoke('dialog:openImage')
  },
  game: {
    launch: (payload: LaunchPayload) => ipcRenderer.invoke('game:launch', payload),
    kill: (gameItemId: number) => ipcRenderer.invoke('game:kill', gameItemId),
    onLog: (cb: (payload: GameLogPayload) => void) => {
      const handler = (_: Electron.IpcRendererEvent, p: GameLogPayload) => cb(p)
      ipcRenderer.on('game:log', handler)
      return () => ipcRenderer.removeListener('game:log', handler)
    },
    onExit: (cb: (payload: GameExitPayload) => void) => {
      const handler = (_: Electron.IpcRendererEvent, p: GameExitPayload) => cb(p)
      ipcRenderer.on('game:exit', handler)
      return () => ipcRenderer.removeListener('game:exit', handler)
    }
  },
  sgdb: {
    fetchCovers: (params: SgdbFetchParams) => ipcRenderer.invoke('sgdb:fetchCovers', params)
  },
  umu: {
    search: (name: string) => ipcRenderer.invoke('umu:search', name)
  }
} satisfies ElectronAPI)
