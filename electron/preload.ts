import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  window: { minimize: () => void, maximize: () => void, close: () => void }
  library: {
    load: () => Promise<object[]>
    append: (game: object) => Promise<object>
    update: (id: number, game: object) => Promise<object | null>
    remove: (id: number) => Promise<boolean>
  }
  dialog: {
    openFile: () => Promise<string | null>
    openFolder: () => Promise<string | null>
    openImage: () => Promise<string | null>
  }
  game: {
    launch: (config: object) => Promise<{ ok?: boolean, error?: string }>
    kill: (gameItemId: number) => Promise<boolean>
    onLog: (cb: (payload: { gameItemId: number, msg: string }) => void) => () => void
    onExit: (cb: (payload: { code: number | null, gameItemId: number }) => void) => () => void
  }
  sgdb: {
    fetchCovers: (params: { name: string, gameId: string, store: string }) => Promise<{ hero: string | null, icon: string | null }>
  }
  umu: {
    search: (name: string) => Promise<{ gameId: string, store: string } | null>
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  library: {
    load: () => ipcRenderer.invoke('library:load'),
    append: (game: object) => ipcRenderer.invoke('library:append', game),
    update: (id: number, game: object) => ipcRenderer.invoke('library:update', id, game),
    remove: (id: number) => ipcRenderer.invoke('library:remove', id)
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    openImage: () => ipcRenderer.invoke('dialog:openImage')
  },
  game: {
    launch: (config: object) => ipcRenderer.invoke('game:launch', config),
    kill: (gameItemId: number) => ipcRenderer.invoke('game:kill', gameItemId),
    onLog: (cb: (payload: { gameItemId: number, msg: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, payload: { gameItemId: number, msg: string }) => cb(payload)
      ipcRenderer.on('game:log', handler)
      return () => ipcRenderer.removeListener('game:log', handler)
    },
    onExit: (cb: (payload: { code: number | null, gameItemId: number }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, payload: { code: number | null, gameItemId: number }) => cb(payload)
      ipcRenderer.on('game:exit', handler)
      return () => ipcRenderer.removeListener('game:exit', handler)
    }
  },
  sgdb: {
    fetchCovers: (params: { name: string, gameId: string, store: string }) => ipcRenderer.invoke('sgdb:fetchCovers', params)
  },
  umu: {
    search: (name: string) => ipcRenderer.invoke('umu:search', name)
  }
} satisfies ElectronAPI)
