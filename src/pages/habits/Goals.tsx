import { useState, type FormEvent } from 'react'
import { useGoals } from '../../hooks/useGoals'
import { daysBetween, parseISODate, today } from '../../lib/dates'
import type { Goal } from '../../types'

function GoalCard({ goal, onLog, onRemove }: { goal: Goal; onLog: (v: number) => void; onRemove: () => void }) {
  const [value, setValue] = useState('')
  const pct = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  const daysLeft = goal.target_date ? daysBetween(today(), goal.target_date) : null

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(value)
    if (!value || Number.isNaN(n)) return
    onLog(n)
    setValue('')
  }

  return (
    <div className="card">
      <div className="row spread">
        <h2>{goal.title}</h2>
        <button className="link danger" onClick={() => confirm(`Delete "${goal.title}"?`) && onRemove()}>
          Delete
        </button>
      </div>
      <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p>
        {goal.current_value} of {goal.target_value} {goal.unit} ({pct}%)
      </p>
      {goal.target_date && (
        <p className="muted">
          {parseISODate(goal.target_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
          {' · '}
          {daysLeft! > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'due today' : `${-daysLeft!} days overdue`}
        </p>
      )}
      <form className="row" onSubmit={submit}>
        <input type="number" step="any" placeholder={`+ ${goal.unit || 'amount'}`} value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="submit">Log</button>
      </form>
    </div>
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

  if (loading) return <p className="muted">Loading…</p>

  return (
    <>
      {error && <p className="error">{error}</p>}
      <form className="panel row wrap" onSubmit={submit}>
        <input placeholder="Goal, e.g. Read 12 books" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="number" step="any" min="0" placeholder="Target" value={target} onChange={(e) => setTarget(e.target.value)} className="short" />
        <input placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="short" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Target date" />
        <button type="submit" disabled={!title.trim() || !(Number(target) > 0)}>
          Add goal
        </button>
      </form>
      {goals.length === 0 && <p className="muted">No goals yet.</p>}
      <div className="cards">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} onLog={(v) => logProgress(g.id, v)} onRemove={() => remove(g.id)} />
        ))}
      </div>
    </>
  )
}
