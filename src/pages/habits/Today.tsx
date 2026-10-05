import { Link } from 'react-router-dom'
import { useHabitsContext } from './context'
import { streak } from '../../lib/streak'
import { parseISODate, today, toISODate, weekday } from '../../lib/dates'

export default function Today() {
  const { active, doneByHabit, toggle } = useHabitsContext()
  const date = today()
  const due = active.filter((h) => h.days.includes(weekday(date)))
  const doneCount = due.filter((h) => doneByHabit.get(h.id)?.has(date)).length

  if (active.length === 0) {
    return (
      <p className="notice">
        No habits yet. <Link to="/habits/manage">Add your first habit</Link>.
      </p>
    )
  }

  return (
    <div className="panel">
      <div className="row spread">
        <h2>{parseISODate(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <span className="muted">
          {doneCount} of {due.length} done
        </span>
      </div>
      {due.length === 0 && <p className="muted">Nothing due today.</p>}
      <ul className="checklist">
        {due.map((h) => {
          const done = doneByHabit.get(h.id) ?? new Set<string>()
          const isDone = done.has(date)
          const s = streak(done, h.days, date, toISODate(new Date(h.created_at)))
          return (
            <li key={h.id}>
              <label className={isDone ? 'done' : ''}>
                <input type="checkbox" checked={isDone} onChange={() => toggle(h.id, date)} />
                {h.name}
              </label>
              <span className="streak" title="Current streak">
                {s > 0 ? `🔥 ${s}` : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
