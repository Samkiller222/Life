import { useState, type FormEvent } from 'react'
import { useMoneyContext } from './context'
import { formatMoney } from '../../lib/money'
import { EmptyState, Panel } from '../../components/Panel'
import { ChevronDownIcon, ChevronUpIcon } from '../../components/Icons'
import type { Category } from '../../types'

const KINDS: { value: Category['kind']; label: string }[] = [
  { value: 'expense', label: 'Spending' },
  { value: 'income', label: 'Money in' },
  { value: 'transfer', label: 'Transfer' },
]

const toBudget = (s: string) => (s.trim() === '' || !(Number(s) >= 0) ? null : Math.round(Number(s) * 100) / 100)

function CategoryRow({ category }: { category: Category }) {
  const { updateCategory, removeCategory } = useMoneyContext()
  const [name, setName] = useState(category.name)
  const [kind, setKind] = useState(category.kind)
  const [budget, setBudget] = useState(category.monthly_budget === null ? '' : String(category.monthly_budget))
  const dirty = name.trim() !== category.name || kind !== category.kind || toBudget(budget) !== category.monthly_budget

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await updateCategory(category.id, { name: name.trim(), kind, monthly_budget: kind === 'expense' ? toBudget(budget) : null })
  }

  return (
    <li>
      <form className="category-row" onSubmit={submit}>
        <input className="input prose" value={name} onChange={(e) => setName(e.target.value)} aria-label="Category name" />
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as Category['kind'])} aria-label="Type">
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder={kind === 'expense' ? 'No budget' : 'Not budgeted'}
          disabled={kind !== 'expense'}
          value={kind === 'expense' ? budget : ''}
          onChange={(e) => setBudget(e.target.value)}
          aria-label="Monthly budget"
        />
        <span className="row">
          {dirty && (
            <button type="submit" className="btn sm" disabled={!name.trim()}>
              Save
            </button>
          )}
          <button
            type="button"
            className="link-btn danger"
            onClick={() => confirm(`Delete "${category.name}"? Its transactions become uncategorised and its rules are removed.`) && removeCategory(category.id)}
          >
            Delete
          </button>
        </span>
      </form>
    </li>
  )
}

function Categories() {
  const { categories, addCategory, addStarterCategories } = useMoneyContext()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<Category['kind']>('expense')
  const [budget, setBudget] = useState('')
  const total = categories.filter((c) => c.kind === 'expense').reduce((s, c) => s + (c.monthly_budget ?? 0), 0)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    if (await addCategory({ name: name.trim(), kind, monthly_budget: kind === 'expense' ? toBudget(budget) : null })) {
      setName('')
      setBudget('')
    }
  }

  return (
    <Panel title="Categories and budgets" meta={<span className="tag">{formatMoney(total)} a month</span>}>
      <p className="muted">Spending counts towards budgets. Money in counts as income. Transfers, like moving money to savings, count as neither.</p>
      {categories.length === 0 ? (
        <EmptyState>
          Your categories will be listed here with their monthly budgets.{' '}
          <button type="button" className="link-btn" onClick={addStarterCategories}>
            Add starter categories
          </button>{' '}
          to begin with a common set you can rename.
        </EmptyState>
      ) : (
        <ul className="category-list">
          <li className="category-row head" aria-hidden>
            <span>Name</span>
            <span>Type</span>
            <span>Monthly budget</span>
            <span />
          </li>
          {categories.map((c) => (
            <CategoryRow key={`${c.id}-${c.name}-${c.kind}-${c.monthly_budget}`} category={c} />
          ))}
        </ul>
      )}
      <form className="category-row add" onSubmit={submit}>
        <input className="input prose" placeholder="New category" value={name} onChange={(e) => setName(e.target.value)} aria-label="New category name" />
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value as Category['kind'])} aria-label="Type">
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
        <input className="input" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Budget" disabled={kind !== 'expense'} value={kind === 'expense' ? budget : ''} onChange={(e) => setBudget(e.target.value)} aria-label="Monthly budget" />
        <button type="submit" className="btn stamp sm" disabled={!name.trim()}>
          Add
        </button>
      </form>
    </Panel>
  )
}

function Rules() {
  const { categories, rules, addRule, removeRule, moveRule } = useMoneyContext()
  const [pattern, setPattern] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [message, setMessage] = useState('')
  const name = new Map(categories.map((c) => [c.id, c.name]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!pattern.trim() || !categoryId) return
    const n = await addRule(pattern.trim(), categoryId)
    if (n !== null) {
      setMessage(`Rule added. ${n} transaction${n === 1 ? '' : 's'} changed category.`)
      setPattern('')
    }
  }

  return (
    <Panel title="Rules">
      <p className="muted">
        A rule puts every transaction whose description contains its text into a category. The first matching rule wins, and categories you picked by hand are left
        alone.
      </p>
      {rules.length === 0 ? (
        <EmptyState>Rules you add here, or from the transactions list, will appear in the order they are checked.</EmptyState>
      ) : (
        <ol className="rule-list">
          {rules.map((r, i) => (
            <li key={r.id}>
              <span className="tag">{r.pattern}</span>
              <span className="muted">to</span>
              <strong>{name.get(r.category_id)}</strong>
              <span className="row" style={{ marginLeft: 'auto' }}>
                <button type="button" className="icon-btn" aria-label="Check earlier" disabled={i === 0} onClick={() => moveRule(r.id, -1)}>
                  <ChevronUpIcon />
                </button>
                <button type="button" className="icon-btn" aria-label="Check later" disabled={i === rules.length - 1} onClick={() => moveRule(r.id, 1)}>
                  <ChevronDownIcon />
                </button>
                <button type="button" className="link-btn danger" onClick={() => removeRule(r.id)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <form className="row" style={{ marginTop: 12 }} onSubmit={submit}>
        <input className="input prose" style={{ flex: '2 1 160px', width: 'auto' }} placeholder="Description contains, like lidl" value={pattern} onChange={(e) => setPattern(e.target.value)} aria-label="Text to match" />
        <select className="input" style={{ flex: '1 1 140px', width: 'auto' }} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">Category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn stamp sm" disabled={!pattern.trim() || !categoryId}>
          Add rule
        </button>
      </form>
      {message && <div className="status">{message}</div>}
    </Panel>
  )
}

function Accounts() {
  const { accounts, removeAccount } = useMoneyContext()
  return (
    <Panel title="Accounts">
      {accounts.length === 0 ? (
        <EmptyState>Accounts appear here once you name one on the import page.</EmptyState>
      ) : (
        <ul className="session-list">
          {accounts.map((a) => (
            <li key={a.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                <strong>{a.name}</strong>
                <span className="muted"> · {a.csv_format.dateCol ? 'CSV layout saved' : 'No CSV layout yet'}</span>
              </span>
              <button
                type="button"
                className="link-btn danger"
                onClick={() => confirm(`Delete "${a.name}" and every transaction imported into it?`) && removeAccount(a.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export default function Budgets() {
  return (
    <div className="grid">
      <Categories />
      <Rules />
      <Accounts />
    </div>
  )
}
