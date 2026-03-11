/**
 * Parses a shell-like string into environment variables and positional args.
 *
 * Tokenisation rules:
 *   - Whitespace (space / tab) separates tokens.
 *   - Single and double quotes preserve inner whitespace.
 *   - A token of the form KEY=VALUE where KEY matches /^[A-Za-z_][A-Za-z0-9_]*$/
 *     is treated as an environment variable.
 *   - Everything else becomes a positional argument.
 *
 * Examples:
 *   "MANGOHUD=1 -dx11"                     → env { MANGOHUD:'1' },       args ['-dx11']
 *   "DXVK_HUD=fps,frametimes,memory"       → env { DXVK_HUD:'fps,frametimes,memory' }, args []
 *   "mesa_glthread=true -dx11 -fullscreen" → env { mesa_glthread:'true' }, args ['-dx11','-fullscreen']
 *   '"My Game Arg" MANGOHUD=1'             → env { MANGOHUD:'1' },       args ['My Game Arg']
 */
export function parseArgs(raw: string): { env: Record<string, string>, args: string[] } {
  const env: Record<string, string> = {}
  const args: string[] = []
  const tokens: string[] = []

  let current = ''
  let inQuote: '"' | '\'' | null = null

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === '\'') {
      inQuote = ch
    } else if (ch === ' ' || ch === '\t') {
      if (current) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }
  if (current) tokens.push(current)

  for (const token of tokens) {
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token)) {
      const eq = token.indexOf('=')
      env[token.slice(0, eq)] = token.slice(eq + 1)
    } else {
      args.push(token)
    }
  }

  return { env, args }
}

/**
 * Serialises env vars + positional args back into a display string for the
 * Arguments input field. Tokens that contain spaces are wrapped in quotes.
 */
export function serializeArgs(env: Record<string, string>, args: string[]): string {
  const envParts = Object.entries(env).map(([k, v]) => `${k}=${v}`)
  const argParts = args.map(a => (a.includes(' ') ? `"${a}"` : a))
  return [...envParts, ...argParts].filter(Boolean).join(' ')
}
