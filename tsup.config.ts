import { defineConfig } from 'tsup'

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
    clean: true
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
