import type { Category, Rule, Transaction } from '../types'

export const CURRENCY = 'EUR'

const euro = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY })

/** "€12.50"; pass signed to show a plus for money in. */
export function formatMoney(amount: number, signed = false): string {
  const text = euro.format(amount)
  return signed && amount > 0 ? `+${text}` : text
}

/** Reads a typed amount like "12.50", "12,50" or "€12" as a positive number of cents-rounded euro. Returns null if it is not above zero. */
export function parseAmountInput(raw: string): number | null {
  const s = raw.replace(/[€\s]/g, '').replace(',', '.')
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null
  const n = Math.round(Number(s) * 100) / 100
  return n > 0 ? n : null
}

/** The first rule whose text appears in the description, ignoring case. */
export function matchRule(description: string, rules: Rule[]): Rule | undefined {
  const d = description.toLowerCase()
  return [...rules].sort((a, b) => a.position - b.position).find((r) => r.pattern.trim() && d.includes(r.pattern.trim().toLowerCase()))
}

/** A starting rule pattern from a description: the leading words, without long numbers or dates. */
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
