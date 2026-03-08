import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  platform: NodeJS.Platform
  versions: {
    node: string
    chrome: string
    electron: string
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
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
}

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
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
  }
} satisfies ElectronAPI)
