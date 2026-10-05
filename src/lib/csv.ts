// A small CSV reader for bank exports: quoted fields, "" escapes, commas, semicolons or tabs.

/** Picks the delimiter that splits the first lines most consistently. */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20)
  let best = ','
  let bestScore = -1
  for (const d of [',', ';', '\t', '|']) {
    const counts = lines.map((l) => splitLine(l, d).length)
    const most = mode(counts)
    if (most < 2) continue
    const score = counts.filter((c) => c === most).length * most
    if (score > bestScore) {
      best = d
      bestScore = score
    }
  }
  return best
}

function splitLine(line: string, d: string): string[] {
  return parseCsv(line, d)[0] ?? []
}

/** Parses CSV text into rows of trimmed cells. Blank lines are dropped. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
    } else if (c === '"' && cell.trim() === '') {
      quoted = true
      cell = ''
    } else if (c === delimiter) {
      row.push(cell.trim())
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell.trim())
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  row.push(cell.trim())
  if (row.some((x) => x !== '')) rows.push(row)
  return rows
}

/** The most common value; the larger one wins a tie. */
export function mode(values: number[]): number {
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best = 0
  let bestCount = 0
  for (const [v, n] of counts) if (n > bestCount || (n === bestCount && v > best)) [best, bestCount] = [v, n]
  return best
}

/** Banks often put an account summary above the table, so the header is the first row as wide as most rows. */
export function guessHeaderRow(rows: string[][]): number {
  const width = mode(rows.map((r) => r.length))
  const i = rows.findIndex((r) => r.length === width)
  return i < 0 ? 0 : i
}
