import { useState, type FormEvent } from 'react'
import { useMoneyContext } from './context'
import { formatMoney } from '../../lib/money'
import { daysBetween, parseISODate, today } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
import type { SavingsGoal } from '../../types'

function dueText(targetDate: string) {
  const left = daysBetween(today(), targetDate)
  const date = parseISODate(targetDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  if (left > 0) return `${date} · ${left} day${left === 1 ? '' : 's'} left`
  if (left === 0) return `${date} · due today`
  return `${date} · ${-left} day${left === -1 ? '' : 's'} overdue`
}

/** How much a month it takes to reach the target by its date, counting this month. */
function perMonth(goal: SavingsGoal): number | null {
  if (!goal.target_date) return null
  const left = goal.target_amount - goal.saved_amount
  if (left <= 0) return null
  const [ty, tm] = goal.target_date.split('-').map(Number)
  const [ny, nm] = today().split('-').map(Number)
  const months = (ty - ny) * 12 + (tm - nm) + 1
  return months > 0 ? left / months : null
}

function GoalPanel({ goal }: { goal: SavingsGoal }) {
  const { addSaved, removeGoal } = useMoneyContext()
  const [value, setValue] = useState('')
  const pct = Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100))
  const overdue = goal.target_date && pct < 100 && daysBetween(today(), goal.target_date) < 0
  const monthly = perMonth(goal)

  async function submit(e: { preventDefault(): void }, sign: 1 | -1) {
    e.preventDefault()
    const n = Number(value)
    if (!value || !(n > 0)) return
    await addSaved(goal, sign * n)
    setValue('')
  }

  return (
    <Panel title={goal.name} meta={<span className={pct >= 100 ? 'badge ok' : overdue ? 'badge err' : 'badge'}>{pct >= 100 ? 'Reached' : overdue ? 'Overdue' : `${pct}%`}</span>}>
      <div className="stat-head">
        <span className="stat-count">
          {formatMoney(goal.saved_amount)} of {formatMoney(goal.target_amount)}
        </span>
        {goal.target_date && <span className="stat-count">{dueText(goal.target_date)}</span>}
      </div>
      <div className="stat-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={pct >= 100 ? 'stat-fill done' : 'stat-fill'} style={{ width: `${pct}%` }} />
      </div>
      {monthly !== null && !overdue && <p className="hint">{formatMoney(monthly)} a month gets you there on time.</p>}
      <form className="actions" onSubmit={(e) => submit(e, 1)}>
        <input className="input" style={{ flex: '1 1 120px', width: 'auto' }} type="number" min="0" step="0.01" inputMode="decimal" placeholder="Amount" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Amount" />
        <button type="submit" className="btn sm">
          Add saved
        </button>
        <button type="button" className="btn secondary sm" onClick={(e) => submit(e, -1)}>
          Take out
        </button>
        <button type="button" className="link-btn danger" onClick={() => confirm(`Delete "${goal.name}"?`) && removeGoal(goal.id)}>
          Delete
        </button>
      </form>
    </Panel>
  )
}

export default function Savings() {
  const { goals, addGoal } = useMoneyContext()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [saved, setSaved] = useState('')
  const [date, setDate] = useState('')
  const valid = !!name.trim() && Number(target) > 0

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    const ok = await addGoal({ name: name.trim(), target_amount: Number(target), saved_amount: Number(saved) > 0 ? Number(saved) : 0, target_date: date || null })
    if (ok) {
      setName('')
      setTarget('')
      setSaved('')
      setDate('')
    }
  }

  return (
    <div className="grid">
      <Panel title="Add a savings goal">
        <form onSubmit={submit}>
          <div className="fields-grid">
            <div className="field prose full">
              <label className="field-label" htmlFor="sg-name">
                Saving for
              </label>
              <input id="sg-name" placeholder="Emergency fund" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="sg-target">
                Target
              </label>
              <input id="sg-target" type="number" min="0" step="0.01" inputMode="decimal" placeholder="3000" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="sg-saved">
                Already saved
              </label>
              <input id="sg-saved" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0" value={saved} onChange={(e) => setSaved(e.target.value)} />
            </div>
            <div className="field full">
              <label className="field-label" htmlFor="sg-date">
                Target date
              </label>
              <input id="sg-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="actions">
            <button type="submit" className="btn stamp" disabled={!valid}>
              Add goal
            </button>
          </div>
        </form>
      </Panel>
      {goals.length === 0 && (
        <Panel title="Your savings goals">
          <EmptyState>Savings goals you add will appear here with a progress bar and how much a month reaches them.</EmptyState>
        </Panel>
      )}
      {goals.map((g) => (
        <GoalPanel key={g.id} goal={g} />
      ))}
    </div>
  )
}
