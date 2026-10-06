import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMoneyContext } from './context'
import { CategorySelect } from './Transactions'
import { formatMoney, matchRule, parseAmountInput } from '../../lib/money'
import { parseISODate, today } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
import type { Transaction } from '../../types'

const dayLabel = (d: string) => parseISODate(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

function TransactionForm({ tx }: { tx?: Transaction }) {
  const { accounts, categories, rules, transactions, saveTransaction, removeTransaction, addStarterCategories } = useMoneyContext()
  const navigate = useNavigate()
  const [direction, setDirection] = useState<'out' | 'in'>(tx && tx.amount > 0 ? 'in' : 'out')
  const [amount, setAmount] = useState(tx ? String(Math.abs(tx.amount)) : '')
  const [description, setDescription] = useState(tx?.description ?? '')
  // null means "follow the rules"; a string (even '') means you picked it.
  const [picked, setPicked] = useState<string | null>(tx ? (tx.category_id ?? '') : null)
  const [date, setDate] = useState(tx?.date ?? today())
  const [accountId, setAccountId] = useState(tx?.account_id ?? accounts[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  const value = parseAmountInput(amount)
  const suggested = matchRule(description, rules)?.category_id ?? ''
  const categoryId = picked ?? suggested
  const valid = value !== null && !!date
  // Past descriptions to pick from, most recent first.
  const recent = [...new Set(transactions.map((t) => t.description).filter(Boolean))].slice(0, 30)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (value === null || !date) return
    setSaving(true)
    const signed = direction === 'out' ? -value : value
    const ok = await saveTransaction({
      id: tx?.id,
      account_id: accountId,
      date,
      description: description.trim(),
      amount: signed,
      category_id: categoryId || null,
      categorised_by: !categoryId ? null : picked === null || picked === suggested ? 'rule' : 'manual',
    })
    setSaving(false)
    if (!ok) return
    if (tx) {
      navigate('/money/transactions')
      return
    }
    setSaved(`Saved ${formatMoney(signed, true)}${description.trim() ? ` for ${description.trim()}` : ''}.`)
    setAmount('')
    setDescription('')
    setPicked(null)
  }

  return (
    <Panel title={tx ? 'Edit transaction' : 'Add a transaction'}>
      <form onSubmit={submit}>
        <div className="segmented" role="group" aria-label="Money out or in">
          <button type="button" className={direction === 'out' ? 'on' : ''} aria-pressed={direction === 'out'} onClick={() => setDirection('out')}>
            Money out
          </button>
          <button type="button" className={direction === 'in' ? 'on' : ''} aria-pressed={direction === 'in'} onClick={() => setDirection('in')}>
            Money in
          </button>
        </div>
        <div className="fields-grid">
          <div className="field">
            <label className="field-label" htmlFor="tx-amount">
              Amount (€)
            </label>
            <input id="tx-amount" type="text" inputMode="decimal" autoComplete="off" placeholder="12.50" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-date">
              Date
            </label>
            <input id="tx-date" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field prose full">
            <label className="field-label" htmlFor="tx-desc">
              {direction === 'out' ? 'What for' : 'From'}
            </label>
            <input id="tx-desc" list="tx-recent" autoComplete="off" placeholder={direction === 'out' ? 'Lidl' : 'Salary'} value={description} onChange={(e) => setDescription(e.target.value)} />
            <datalist id="tx-recent">
              {recent.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div className="field full">
            <label className="field-label" htmlFor="tx-category">
              Category
            </label>
            <CategorySelect id="tx-category" value={categoryId} categories={categories} onChange={setPicked} />
            {picked === null && suggested && <div className="hint">Picked by a rule</div>}
            {categories.length === 0 && (
              <div className="hint">
                No categories yet.{' '}
                <button type="button" className="link-btn" onClick={addStarterCategories}>
                  Add starter categories
                </button>
              </div>
            )}
          </div>
          {accounts.length > 1 && (
            <div className="field full">
              <label className="field-label" htmlFor="tx-account">
                Account
              </label>
              <select id="tx-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="actions">
          <button type="submit" className="btn stamp" disabled={!valid || saving}>
            {saving ? 'Saving…' : tx ? 'Save changes' : 'Save'}
          </button>
          {tx && (
            <>
              <Link to="/money/transactions" className="btn secondary">
                Cancel
              </Link>
              <button
                type="button"
                className="link-btn danger"
                onClick={async () => {
                  if (!confirm('Delete this transaction?')) return
                  await removeTransaction(tx.id)
                  navigate('/money/transactions')
                }}
              >
                Delete
              </button>
            </>
          )}
          {saved && <span className="muted">{saved}</span>}
        </div>
      </form>
    </Panel>
  )
}

function Recent() {
  const { transactions, categories } = useMoneyContext()
  const name = new Map(categories.map((c) => [c.id, c.name]))
  const latest = transactions.slice(0, 8)
  return (
    <Panel title="Latest this month" meta={<Link to="/money/transactions">See all</Link>}>
      {latest.length === 0 ? (
        <EmptyState>What you add this month will be listed here, newest first.</EmptyState>
      ) : (
        <ul className="session-list">
          {latest.map((t) => (
            <li key={t.id}>
              <Link to={`/money/add/${t.id}`} className="session">
                <strong>{t.description || 'No description'}</strong>
                <span className={t.amount > 0 ? 'tx-amount in' : 'tx-amount'}>{formatMoney(t.amount, true)}</span>
                <span className="muted">
                  {dayLabel(t.date)} · {(t.category_id && name.get(t.category_id)) || 'No category'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export default function AddTransaction() {
  const { id } = useParams()
  const { transactions } = useMoneyContext()
  if (!id)
    return (
      <div className="grid">
        <TransactionForm key="new" />
        <Recent />
      </div>
    )
  const tx = transactions.find((t) => t.id === id)
  if (!tx)
    return (
      <Panel title="Transaction">
        <EmptyState>
          This transaction isn't in the month you're viewing. <Link to="/money/transactions">Back to transactions</Link>.
        </EmptyState>
      </Panel>
    )
  return <TransactionForm key={id} tx={tx} />
}
