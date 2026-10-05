import type { Category, CsvFormat, Rule, Transaction } from '../types'

export const CURRENCY = 'EUR'

const euro = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY })

/** "€12.50"; pass signed to show a plus for money in. */
export function formatMoney(amount: number, signed = false): string {
  const text = euro.format(amount)
  return signed && amount > 0 ? `+${text}` : text
}

/** Reads a bank amount like "-1,234.56", "1.234,56", "€12.50", "(12.50)" or "12.50 DR". Returns null if it is not a number. */
export function parseAmount(raw: string): number | null {
  let s = raw.trim()
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  if (/\bDR\b/i.test(s)) negative = true
  s = s.replace(/\b(CR|DR)\b/gi, '').replace(/[^\d,.\-+]/g, '')
  if (s.startsWith('-') || s.endsWith('-')) negative = !negative
  s = s.replace(/[-+]/g, '')
  if (!/\d/.test(s)) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  // The separator that comes last, followed by one or two digits, is the decimal point.
  const decimal = lastComma > lastDot && /,\d{1,2}$/.test(s) ? ',' : '.'
  const thousands = decimal === ',' ? '.' : ','
  s = s.split(thousands).join('')
  if (decimal === ',') s = s.replace(',', '.')
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return Math.round((negative ? -n : n) * 100) / 100
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

export type DateOrder = CsvFormat['dateOrder']

/** Reads a bank date into YYYY-MM-DD. Handles 05/10/2026, 2026-10-05 12:00:00, 5 Oct 2026 and two-digit years. */
export function parseDate(raw: string, order: DateOrder): string | null {
  const s = raw.trim().toLowerCase()
  const named = s.match(/^(\d{1,2})[\s\-/.]+([a-z]{3})[a-z]*[\s\-/.,]+(\d{2,4})/)
  if (named) return build(named[3], MONTHS.indexOf(named[2]) + 1, Number(named[1]))
  const m = s.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/)
  if (!m) return null
  const [a, b, c] = [m[1], m[2], m[3]]
  if (a.length === 4) return build(a, Number(b), Number(c))
  if (order === 'mdy') return build(c, Number(a), Number(b))
  return build(c, Number(b), Number(a))
}

function build(year: string, month: number, day: number): string | null {
  const y = year.length === 2 ? 2000 + Number(year) : Number(year)
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31 && y >= 1900 && y <= 2200)) return null
  const d = new Date(y, month - 1, day)
  if (d.getMonth() !== month - 1) return null
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Day-first unless a value shows the month must come first. Year-first dates read the same either way. */
export function guessDateOrder(values: string[]): DateOrder {
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/)
    if (m && Number(m[2]) > 12) return 'mdy'
  }
  return 'dmy'
}

const HINTS = {
  date: ['completed date', 'transaction date', 'booking date', 'posting date', 'value date', 'date'],
  description: ['description', 'details', 'narrative', 'payee', 'merchant', 'name', 'reference', 'memo', 'particulars'],
  amount: ['amount', 'value'],
  out: ['money out', 'paid out', 'debit', 'withdrawal', 'out'],
  in: ['money in', 'paid in', 'credit', 'deposit', 'in'],
}

function findColumn(headers: string[], hints: string[], exclude: string[] = []): string {
  const lower = headers.map((h) => h.toLowerCase())
  for (const hint of hints) {
    const i = lower.findIndex((h, idx) => !exclude.includes(headers[idx]) && (h === hint || h.split(/[^a-z]+/).includes(hint) || (hint.length > 3 && h.includes(hint))))
    if (i >= 0) return headers[i]
  }
  return ''
}

/** Column names for a header row, with blanks named by position. */
export function headerNames(row: string[]): string[] {
  return row.map((h, i) => h || `Column ${i + 1}`)
}

/** A first guess at which columns hold what, from the header names. */
export function guessFormat(rows: string[][], headerRow: number): CsvFormat {
  const headers = headerNames(rows[headerRow] ?? [])
  const date = findColumn(headers, HINTS.date)
  const description = findColumn(headers, HINTS.description, [date])
  const amount = findColumn(headers, HINTS.amount, [date, description])
  const out = findColumn(headers, HINTS.out, [date, description])
  const inCol = findColumn(headers, HINTS.in, [date, description, out])
  const split = !amount && !!out && !!inCol
  const dateIdx = headers.indexOf(date)
  return {
    headerRow,
    dateCol: date,
    descriptionCols: description ? [description] : [],
    amountMode: split ? 'split' : 'single',
    amountCol: amount,
    outCol: split ? out : '',
    inCol: split ? inCol : '',
    flipSign: false,
    dateOrder: guessDateOrder(rows.slice(headerRow + 1).map((r) => r[dateIdx] ?? '')),
  }
}

export type ParsedRow = {
  line: number
  date: string
  description: string
  amount: number
  importKey: string
}

export type ParseResult = { rows: ParsedRow[]; skipped: number[] }

/** Turns CSV rows into transactions using a format. Rows without a readable date or amount are skipped and their line numbers returned. */
export function readTransactions(rows: string[][], format: CsvFormat): ParseResult {
  const headers = headerNames(rows[format.headerRow] ?? [])
  const col = (name: string) => headers.indexOf(name)
  const dateIdx = col(format.dateCol)
  const descIdx = format.descriptionCols.map(col).filter((i) => i >= 0)
  const out: ParsedRow[] = []
  const skipped: number[] = []
  const seen = new Map<string, number>()

  rows.slice(format.headerRow + 1).forEach((r, i) => {
    const line = format.headerRow + i + 2
    const date = dateIdx >= 0 ? parseDate(r[dateIdx] ?? '', format.dateOrder) : null
    let amount: number | null
    if (format.amountMode === 'split') {
      const o = parseAmount(r[col(format.outCol)] ?? '')
      const n = parseAmount(r[col(format.inCol)] ?? '')
      amount = o === null && n === null ? null : (n ?? 0) - Math.abs(o ?? 0)
    } else amount = parseAmount(r[col(format.amountCol)] ?? '')
    if (!date || amount === null) {
      skipped.push(line)
      return
    }
    if (format.flipSign) amount = -amount
    const description = descIdx
      .map((j) => r[j] ?? '')
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 500)
    // Identical rows in one file (two coffees on the same day) get a running number so both are kept.
    const base = `${date}|${amount.toFixed(2)}|${description.toLowerCase()}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    out.push({ line, date, description, amount, importKey: `${base}|${n}` })
  })
  return { rows: out, skipped }
}

/** The first rule whose text appears in the description, ignoring case. */
export function matchRule(description: string, rules: Rule[]): Rule | undefined {
  const d = description.toLowerCase()
  return [...rules].sort((a, b) => a.position - b.position).find((r) => r.pattern.trim() && d.includes(r.pattern.trim().toLowerCase()))
}

/** A starting rule pattern from a description: the leading words, without card numbers, dates or references. */
export function suggestPattern(description: string): string {
  const words = description
    .replace(/[*#]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !/\d{3,}/.test(w) && !/^\d+[/.-]\d+/.test(w))
  return words.slice(0, 3).join(' ').trim() || description.trim()
}

/** YYYY-MM for a date. */
export function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** First and last date of a YYYY-MM month. */
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return [`${month}-01`, `${month}-${String(last).padStart(2, '0')}`]
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export type CategoryLine = { category: Category; spent: number; budget: number | null }

export type MonthSummary = {
  income: number
  spending: number
  /** Expense lines in category order; spending is net of refunds. */
  lines: CategoryLine[]
  uncategorisedSpending: number
  uncategorisedCount: number
  budgeted: number
}

/** Money in, money out and spending per expense category for a set of transactions. Transfers count towards neither. */
export function summarise(transactions: Transaction[], categories: Category[]): MonthSummary {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const spent = new Map<string, number>()
  let income = 0
  let spending = 0
  let uncategorisedSpending = 0
  let uncategorisedCount = 0
  for (const t of transactions) {
    const c = t.category_id ? byId.get(t.category_id) : undefined
    if (!c) {
      uncategorisedCount++
      if (t.amount < 0) {
        uncategorisedSpending -= t.amount
        spending -= t.amount
      } else income += t.amount
    } else if (c.kind === 'income') income += t.amount
    else if (c.kind === 'expense') {
      spent.set(c.id, (spent.get(c.id) ?? 0) - t.amount)
      spending -= t.amount
    }
  }
  const lines = categories
    .filter((c) => c.kind === 'expense')
    .map((c) => ({ category: c, spent: round(spent.get(c.id) ?? 0), budget: c.monthly_budget }))
  return {
    income: round(income),
    spending: round(spending),
    lines,
    uncategorisedSpending: round(uncategorisedSpending),
    uncategorisedCount,
    budgeted: round(lines.reduce((s, l) => s + (l.budget ?? 0), 0)),
  }
}

/** '' while under 85% of budget, 'warn' from 85%, 'over' once past it (or any spending with no budget). */
export function budgetState(spent: number, budget: number | null): '' | 'warn' | 'over' {
  if (!budget) return spent > 0 ? 'over' : ''
  if (spent > budget) return 'over'
  return spent >= budget * 0.85 ? 'warn' : ''
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export const STARTER_CATEGORIES: Pick<Category, 'name' | 'kind'>[] = [
  { name: 'Groceries', kind: 'expense' },
  { name: 'Eating out', kind: 'expense' },
  { name: 'Transport', kind: 'expense' },
  { name: 'Rent and bills', kind: 'expense' },
  { name: 'Shopping', kind: 'expense' },
  { name: 'Health and fitness', kind: 'expense' },
  { name: 'Entertainment', kind: 'expense' },
  { name: 'Travel', kind: 'expense' },
  { name: 'Subscriptions', kind: 'expense' },
  { name: 'Other spending', kind: 'expense' },
  { name: 'Salary', kind: 'income' },
  { name: 'Other income', kind: 'income' },
  { name: 'Transfers and savings', kind: 'transfer' },
]
