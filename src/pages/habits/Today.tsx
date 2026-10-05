import { Link } from 'react-router-dom'
import { useHabitsContext } from './context'
import { streak } from '../../lib/streak'
import { parseISODate, today, toISODate, weekday } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'

export default function Today() {
  const { active, doneByHabit, toggle } = useHabitsContext()
  const date = today()
  const due = active.filter((h) => h.days.includes(weekday(date)))
  const doneCount = due.filter((h) => doneByHabit.get(h.id)?.has(date)).length
  const title = parseISODate(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const allDone = due.length > 0 && doneCount === due.length

  return (
    <Panel title={title} meta={<span className={allDone ? 'badge ok' : 'tag'}>{doneCount} of {due.length} done</span>}>
      {active.length === 0 ? (
        <EmptyState>
          Your habits will appear here once you've added some. <Link to="/habits/manage">Add your first habit</Link>.
        </EmptyState>
      ) : due.length === 0 ? (
        <EmptyState>Nothing is due today.</EmptyState>
      ) : (
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
                {s > 0 && <span className={isDone ? 'badge ok' : 'badge'}>{s}-day streak</span>}
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
