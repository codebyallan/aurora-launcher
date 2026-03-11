import { ipcMain } from 'electron'
import type { UmuSearchResult } from '../../app/types/index'
import { umuSearch } from '../lib/umu'

export function registerUmuHandlers(): void {
  ipcMain.handle(
    'umu:search',
    (_e, name: string): Promise<UmuSearchResult> => umuSearch(name)
  )
}
