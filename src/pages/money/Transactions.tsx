import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMoneyContext } from './context'
import MonthNav from './MonthNav'
import { formatMoney, monthLabel, suggestPattern } from '../../lib/money'
import { parseISODate } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
import type { Category, Transaction } from '../../types'

const dayLabel = (d: string) => parseISODate(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

export function CategorySelect({ value, categories, onChange, id }: { value: string; categories: Category[]; onChange: (v: string) => void; id?: string }) {
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-label={id ? undefined : 'Category'}>
      <option value="">No category</option>
      {(['expense', 'income', 'transfer'] as const).map((kind) => (
        <optgroup key={kind} label={kind === 'expense' ? 'Spending' : kind === 'income' ? 'Money in' : 'Transfers'}>
          {categories
            .filter((c) => c.kind === kind)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}

/** Offered after you pick a category by hand, so the next import gets it right. */
function RuleOffer({ tx, categoryId, onDone }: { tx: Transaction; categoryId: string; onDone: () => void }) {
  const { categories, addRule } = useMoneyContext()
  const [pattern, setPattern] = useState(suggestPattern(tx.description))
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState<number | null>(null)
  const name = categories.find((c) => c.id === categoryId)?.name ?? ''

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!pattern.trim()) return
    setSaving(true)
    const n = await addRule(pattern.trim(), categoryId)
    setSaving(false)
    if (n !== null) setChanged(n)
  }

  if (changed !== null)
    return (
      <p className="notice ok">
        Rule added. {changed} other transaction{changed === 1 ? '' : 's'} moved to {name}.{' '}
        <button type="button" className="link-btn" onClick={onDone}>
          Close
        </button>
      </p>
    )

  return (
    <form className="notice" onSubmit={submit}>
      <span>Always put descriptions containing this in {name}?</span>
      <div className="row" style={{ marginTop: 8 }}>
        <input className="input prose" style={{ flex: '1 1 180px', width: 'auto' }} value={pattern} onChange={(e) => setPattern(e.target.value)} aria-label="Text to match" />
        <button type="submit" className="btn sm" disabled={!pattern.trim() || saving}>
          {saving ? 'Adding…' : 'Add rule'}
        </button>
        <button type="button" className="link-btn" onClick={onDone}>
          Not now
        </button>
      </div>
    </form>
  )
}

export default function Transactions() {
  const { accounts, categories, transactions, month, setMonth, setCategory, removeTransaction, applyRules } = useMoneyContext()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [offer, setOffer] = useState<{ tx: Transaction; categoryId: string } | null>(null)
  const [applied, setApplied] = useState<number | null>(null)
  const filter = params.get('category') ?? ''

  const accountName = new Map(accounts.map((a) => [a.id, a.name]))
  const q = search.trim().toLowerCase()
  const shown = transactions.filter(
    (t) => (!filter || (filter === 'none' ? !t.category_id : t.category_id === filter)) && (!q || t.description.toLowerCase().includes(q)),
  )
  const total = shown.reduce((s, t) => s + t.amount, 0)

  async function pick(t: Transaction, categoryId: string) {
    await setCategory(t.id, categoryId || null)
    setOffer(categoryId ? { tx: t, categoryId } : null)
  }

  return (
    <div className="grid">
      <Panel title={monthLabel(month)} meta={<MonthNav month={month} onChange={setMonth} />}>
        <div className="fields-grid">
          <div className="field">
            <label className="field-label" htmlFor="tx-filter">
              Category
            </label>
            <select
              id="tx-filter"
              value={filter}
              onChange={(e) => {
                const v = e.target.value
                setParams(v ? { category: v } : {}, { replace: true })
              }}
            >
              <option value="">All</option>
              <option value="none">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field prose">
            <label className="field-label" htmlFor="tx-search">
              Search
            </label>
            <input id="tx-search" placeholder="Lidl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="stat-count">
            {shown.length} transaction{shown.length === 1 ? '' : 's'} · {formatMoney(total, true)}
          </span>
          <span className="row">
            {applied !== null && <span className="muted">{applied === 0 ? 'Nothing changed.' : `${applied} changed.`}</span>}
            <button type="button" className="btn secondary sm" onClick={async () => setApplied(await applyRules())}>
              Apply rules again
            </button>
          </span>
        </div>
        {offer && <RuleOffer key={offer.tx.id + offer.categoryId} tx={offer.tx} categoryId={offer.categoryId} onDone={() => setOffer(null)} />}
        {transactions.length === 0 ? (
          <EmptyState>
            Transactions for {monthLabel(month)} will be listed here once you <Link to="/money/add">add one</Link>.
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState>No transactions this month match the filter.</EmptyState>
        ) : (
          <ul className="tx-list">
            {shown.map((t) => (
              <li key={t.id}>
                <div className="tx-main">
                  <Link to={`/money/add/${t.id}`} className="tx-desc">
                    {t.description || 'No description'}
                  </Link>
                  <span className="muted">
                    {dayLabel(t.date)}
                    {accounts.length > 1 ? ` · ${accountName.get(t.account_id) ?? ''}` : ''}
                    {t.categorised_by === 'rule' ? ' · by rule' : ''}
                  </span>
                </div>
                <span className={t.amount > 0 ? 'tx-amount in' : 'tx-amount'}>{formatMoney(t.amount, true)}</span>
                <div className="tx-side">
                  <CategorySelect value={t.category_id ?? ''} categories={categories} onChange={(v) => pick(t, v)} />
                  <button type="button" className="link-btn danger" onClick={() => confirm('Delete this transaction?') && removeTransaction(t.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
