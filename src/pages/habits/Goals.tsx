import { useState, type FormEvent } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { daysBetween, parseISODate, today } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
import type { Goal } from '../../types'

function dueText(targetDate: string) {
  const left = daysBetween(today(), targetDate)
  const date = parseISODate(targetDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  if (left > 0) return `${date} · ${left} day${left === 1 ? '' : 's'} left`
  if (left === 0) return `${date} · due today`
  return `${date} · ${-left} day${left === -1 ? '' : 's'} overdue`
}

function GoalPanel({ goal, onLog, onRemove }: { goal: Goal; onLog: (v: number) => void; onRemove: () => void }) {
  const [value, setValue] = useState('')
  const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  const overdue = goal.target_date && pct < 100 && daysBetween(today(), goal.target_date) < 0

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(value)
    if (!value || Number.isNaN(n)) return
    onLog(n)
    setValue('')
  }

  return (
    <Panel title={goal.title} meta={<span className={pct >= 100 ? 'badge ok' : overdue ? 'badge err' : 'badge'}>{pct >= 100 ? 'Reached' : overdue ? 'Overdue' : `${pct}%`}</span>}>
      <div className="stat-head">
        <span className="stat-count">
          {goal.current_value} of {goal.target_value} {goal.unit}
        </span>
        {goal.target_date && <span className="stat-count">{dueText(goal.target_date)}</span>}
      </div>
      <div className="stat-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={pct >= 100 ? 'stat-fill done' : 'stat-fill'} style={{ width: `${pct}%` }} />
      </div>
      <form className="actions" onSubmit={submit}>
        <input className="input" style={{ flex: '1 1 120px', width: 'auto' }} type="number" step="any" placeholder={`+ ${goal.unit || 'amount'}`} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Progress to add" />
        <button type="submit" className="btn sm">
          Log progress
        </button>
        <button type="button" className="link-btn danger" onClick={() => confirm(`Delete "${goal.title}"?`) && onRemove()}>
          Delete
        </button>
      </form>
    </Panel>
  )
}

export default function Goals() {
  const { goals, loading, error, add, logProgress, remove } = useGoals()
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [date, setDate] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(target)
    if (!title.trim() || !(n > 0)) return
    await add({ title: title.trim(), target_value: n, unit: unit.trim(), target_date: date || null })
    setTitle('')
    setTarget('')
    setUnit('')
    setDate('')
  }

  if (loading) return <div className="status">Loading…</div>

  return (
    <>
      {error && <div className="status err">{error}</div>}
      <div className="grid">
        <Panel title="Add a goal">
          <form onSubmit={submit}>
            <div className="fields-grid">
              <div className="field prose full">
                <label className="field-label" htmlFor="goal-title">
                  Goal
                </label>
                <input id="goal-title" placeholder="Read 12 books" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="goal-target">
                  Target
                </label>
                <input id="goal-target" type="number" step="any" min="0" placeholder="12" value={target} onChange={(e) => setTarget(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="goal-unit">
                  Unit
                </label>
                <input id="goal-unit" placeholder="books" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div className="field full">
                <label className="field-label" htmlFor="goal-date">
                  Target date
                </label>
                <input id="goal-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="actions">
              <button type="submit" className="btn stamp" disabled={!title.trim() || !(Number(target) > 0)}>
                Add goal
              </button>
            </div>
          </form>
        </Panel>
        {goals.length === 0 && (
          <Panel title="Your goals">
            <EmptyState>Goals you add will appear here with a progress bar.</EmptyState>
          </Panel>
        )}
        {goals.map((g) => (
          <GoalPanel key={g.id} goal={g} onLog={(v) => logProgress(g.id, v)} onRemove={() => remove(g.id)} />
        ))}
      </div>
    </>
  )
}
