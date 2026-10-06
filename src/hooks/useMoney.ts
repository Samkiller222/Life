import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { STARTER_CATEGORIES, monthOf, monthRange } from '../lib/money'
import { today } from '../lib/dates'
import type { Account, Category, Rule, SavingsGoal, Transaction } from '../types'

// Supabase returns at most 1000 rows per request, so transactions are read in pages.
const PAGE = 1000

async function fetchSetup() {
  if (!supabase) return { error: '', accounts: [], categories: [], rules: [], goals: [] }
  const [a, c, r, g] = await Promise.all([
    supabase.from('money_accounts').select('id, name').order('created_at'),
    supabase.from('money_categories').select('id, name, kind, monthly_budget, position').order('position').order('created_at'),
    supabase.from('money_rules').select('id, pattern, category_id, position').order('position').order('created_at'),
    supabase.from('money_savings_goals').select('id, name, target_amount, saved_amount, target_date').order('created_at'),
  ])
  return {
    error: (a.error ?? c.error ?? r.error ?? g.error)?.message ?? '',
    accounts: (a.data ?? []) as Account[],
    categories: (c.data ?? []) as Category[],
    rules: (r.data ?? []) as Rule[],
    goals: (g.data ?? []) as SavingsGoal[],
  }
}

async function fetchMonth(month: string) {
  if (!supabase) return { error: '', transactions: [] as Transaction[] }
  const [from, to] = monthRange(month)
  const transactions: Transaction[] = []
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supabase
      .from('money_transactions')
      .select('id, account_id, date, description, amount, category_id, categorised_by')
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id')
      .range(start, start + PAGE - 1)
    if (error) return { error: error.message, transactions }
    transactions.push(...((data ?? []) as Transaction[]))
    if (!data || data.length < PAGE) return { error: '', transactions }
  }
}

export type TransactionInput = {
  id?: string
  /** Leave empty to use your first account, created as "Main account" if you have none. */
  account_id: string
  date: string
  description: string
  /** Negative for money out, positive for money in. */
  amount: number
  category_id: string | null
  categorised_by: Transaction['categorised_by']
}

export function useMoney() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [month, setMonth] = useState(monthOf(today()))
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const applySetup = useCallback((r: Awaited<ReturnType<typeof fetchSetup>>) => {
    if (r.error) setError(r.error)
    else {
      setAccounts(r.accounts)
      setCategories(r.categories)
      setRules(r.rules)
      setGoals(r.goals)
    }
  }, [])

  const applyMonth = useCallback((r: Awaited<ReturnType<typeof fetchMonth>>) => {
    if (r.error) setError(r.error)
    setTransactions(r.transactions)
  }, [])

  useEffect(() => {
    fetchSetup().then((r) => {
      applySetup(r)
      setLoading(false)
    })
  }, [applySetup])

  useEffect(() => {
    fetchMonth(month).then(applyMonth)
  }, [month, applyMonth])

  const loadSetup = () => fetchSetup().then(applySetup)
  const loadMonth = () => fetchMonth(month).then(applyMonth)

  function fail(e: { message: string } | null) {
    if (e) setError(e.message)
    else setError('')
    return !e
  }

  // Accounts

  async function addAccount(name: string): Promise<Account | null> {
    if (!supabase) return null
    const { data, error } = await supabase.from('money_accounts').insert({ name }).select('id, name').single()
    fail(error)
    await loadSetup()
    return (data as Account) ?? null
  }

  async function removeAccount(id: string) {
    if (!supabase) return
    fail((await supabase.from('money_accounts').delete().eq('id', id)).error)
    await Promise.all([loadSetup(), loadMonth()])
  }

  // Transactions

  /** Adds or updates a transaction; returns false if it failed. Moves the month view to the transaction's month. */
  async function saveTransaction(input: TransactionInput) {
    if (!supabase) return false
    const { id, ...fields } = input
    if (!fields.account_id) {
      const account = accounts[0] ?? (await addAccount('Main account'))
      if (!account) return false
      fields.account_id = account.id
    }
    const { error } = id
      ? await supabase.from('money_transactions').update(fields).eq('id', id)
      : await supabase.from('money_transactions').insert(fields)
    if (!fail(error)) return false
    const target = monthOf(fields.date)
    if (target === month) await loadMonth()
    else setMonth(target)
    return true
  }

  async function setCategory(id: string, categoryId: string | null) {
    if (!supabase) return
    fail(
      (await supabase
        .from('money_transactions')
        .update({ category_id: categoryId, categorised_by: categoryId ? 'manual' : null })
        .eq('id', id)).error,
    )
    await loadMonth()
  }

  async function removeTransaction(id: string) {
    if (!supabase) return
    fail((await supabase.from('money_transactions').delete().eq('id', id)).error)
    await loadMonth()
  }

  // Categories

  async function addCategory(c: Pick<Category, 'name' | 'kind' | 'monthly_budget'>) {
    if (!supabase) return false
    const position = Math.max(0, ...categories.map((x) => x.position)) + 1
    const ok = fail((await supabase.from('money_categories').insert({ ...c, position })).error)
    await loadSetup()
    return ok
  }

  async function addStarterCategories() {
    if (!supabase) return
    const have = new Set(categories.map((c) => c.name.toLowerCase()))
    const rows = STARTER_CATEGORIES.filter((c) => !have.has(c.name.toLowerCase())).map((c, i) => ({ ...c, position: categories.length + i + 1 }))
    if (rows.length) fail((await supabase.from('money_categories').insert(rows)).error)
    await loadSetup()
  }

  async function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'kind' | 'monthly_budget'>>) {
    if (!supabase) return
    fail((await supabase.from('money_categories').update(patch).eq('id', id)).error)
    await loadSetup()
  }

  async function removeCategory(id: string) {
    if (!supabase) return
    fail((await supabase.from('money_categories').delete().eq('id', id)).error)
    await Promise.all([loadSetup(), loadMonth()])
  }

  // Rules

  /** Re-runs the rules over every transaction you have not categorised by hand. Returns how many changed. */
  async function applyRules(): Promise<number> {
    if (!supabase) return 0
    const { data, error } = await supabase.rpc('money_apply_rules')
    fail(error)
    await loadMonth()
    return (data as number) ?? 0
  }

  /** Adds a rule at the end of the list, then applies the rules. Returns how many transactions changed. */
  async function addRule(pattern: string, categoryId: string): Promise<number | null> {
    if (!supabase) return null
    const position = Math.max(0, ...rules.map((r) => r.position)) + 1
    const ok = fail((await supabase.from('money_rules').insert({ pattern, category_id: categoryId, position })).error)
    await loadSetup()
    return ok ? applyRules() : null
  }

  async function removeRule(id: string) {
    if (!supabase) return
    fail((await supabase.from('money_rules').delete().eq('id', id)).error)
    await loadSetup()
    await applyRules()
  }

  /** Swaps a rule with its neighbour, since the first matching rule wins. */
  async function moveRule(id: string, step: -1 | 1) {
    if (!supabase) return
    const i = rules.findIndex((r) => r.id === id)
    const j = i + step
    if (i < 0 || j < 0 || j >= rules.length) return
    const reordered = [...rules]
    ;[reordered[i], reordered[j]] = [reordered[j], reordered[i]]
    const client = supabase
    const results = await Promise.all(reordered.map((r, k) => client.from('money_rules').update({ position: k + 1 }).eq('id', r.id)))
    fail(results.find((r) => r.error)?.error ?? null)
    await loadSetup()
    await applyRules()
  }

  // Savings goals

  async function addGoal(g: Pick<SavingsGoal, 'name' | 'target_amount' | 'saved_amount' | 'target_date'>) {
    if (!supabase) return false
    const ok = fail((await supabase.from('money_savings_goals').insert(g)).error)
    await loadSetup()
    return ok
  }

  async function addSaved(goal: SavingsGoal, amount: number) {
    if (!supabase) return
    const saved = Math.round((goal.saved_amount + amount) * 100) / 100
    fail((await supabase.from('money_savings_goals').update({ saved_amount: saved }).eq('id', goal.id)).error)
    await loadSetup()
  }

  /** Saves edits to a goal; returns false if it failed. */
  async function updateGoal(id: string, patch: Pick<SavingsGoal, 'name' | 'target_amount' | 'saved_amount' | 'target_date'>) {
    if (!supabase) return false
    const ok = fail((await supabase.from('money_savings_goals').update(patch).eq('id', id)).error)
    await loadSetup()
    return ok
  }

  async function removeGoal(id: string) {
    if (!supabase) return
    fail((await supabase.from('money_savings_goals').delete().eq('id', id)).error)
    await loadSetup()
  }

  return {
    accounts,
    categories,
    rules,
    goals,
    month,
    setMonth,
    transactions,
    loading,
    error,
    addAccount,
    removeAccount,
    saveTransaction,
    setCategory,
    removeTransaction,
    addCategory,
    addStarterCategories,
    updateCategory,
    removeCategory,
    applyRules,
    addRule,
    removeRule,
    moveRule,
    addGoal,
    addSaved,
    updateGoal,
    removeGoal,
  }
}
