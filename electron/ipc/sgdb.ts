import { ipcMain } from 'electron'
import type { SgdbFetchParams, SgdbCovers } from '../../app/types/index'
import { sgdbFetchCovers } from '../lib/sgdb'

export function registerSgdbHandlers(): void {
  ipcMain.handle(
    'sgdb:fetchCovers',
    (_e, params: SgdbFetchParams): Promise<SgdbCovers> =>
      sgdbFetchCovers(params.name, params.gameId, params.store)
  )
}
