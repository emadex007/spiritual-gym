// Scripture memory helpers (client-side, pure)

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

/** Share of the verse's words the user produced in order (LCS / target length), 0..1 */
export function accuracy(target: string, attempt: string) {
  const a = normalize(target)
  const b = normalize(attempt)
  if (!a.length) return 0
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  const penalty = Math.max(0, b.length - a.length) * 0.5 // extra words count a little
  return Math.max(0, (dp[a.length][b.length] - penalty) / a.length)
}

/** Split into tokens keeping punctuation, and choose which words to blank */
export function blanks(text: string, level: number) {
  const tokens = text.split(/(\s+)/)
  let wordIndex = 0
  const every = level >= 4 ? 2 : level >= 2 ? 3 : 4
  return tokens.map((tok) => {
    if (/^\s+$/.test(tok) || !tok) return { tok, blank: false, answer: '' }
    const core = tok.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9’']+$/g, '')
    const i = wordIndex++
    const blank = core.length > 2 && i % every === every - 1
    return { tok, blank, answer: core }
  })
}

export function firstLetters(text: string) {
  return text.replace(/([A-Za-z])[A-Za-z’']*/g, '$1')
}
