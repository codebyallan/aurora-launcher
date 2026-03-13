import { defineConfig } from 'tsup'
import { config } from 'dotenv'

config()

export default defineConfig([
  {
    entry: { main: 'electron/main.ts' },
    outDir: 'dist-electron',
    format: ['cjs'],
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    outExtension: () => ({ js: '.cjs' }),
    sourcemap: true,
    clean: true,
    define: {
      'process.env.AURORA_SGDB_PROXY': JSON.stringify(process.env.AURORA_SGDB_PROXY ?? '')
    }
  },
  {
    entry: { preload: 'electron/preload.ts' },
    outDir: 'dist-electron',
    format: ['cjs'],
    platform: 'node',
    target: 'node20',
    external: ['electron'],
    outExtension: () => ({ js: '.cjs' }),
    sourcemap: true,
    clean: false
  }
])
