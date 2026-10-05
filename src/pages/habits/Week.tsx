import { useState } from 'react'
import { useHabitsContext } from './context'
import { completionRate } from '../../lib/streak'
import { addDays, parseISODate, today, weekday, weekOf } from '../../lib/dates'

export default function Week() {
  const { active, doneByHabit, toggle } = useHabitsContext()
  const [anchor, setAnchor] = useState(today())
  const dates = weekOf(anchor)
  const now = today()

  const rates = active
    .map((h) => completionRate(doneByHabit.get(h.id) ?? new Set(), h.days, dates, now))
    .filter((r): r is number => r !== null)
  const overall = rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : null

  const label = (d: string) => parseISODate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <div className="panel">
      <div className="row spread">
        <div className="row">
          <button onClick={() => setAnchor(addDays(anchor, -7))}>←</button>
          <h2>
            {label(dates[0])} to {label(dates[6])}
          </h2>
          <button onClick={() => setAnchor(addDays(anchor, 7))} disabled={dates[6] >= now}>
            →
          </button>
        </div>
        {overall !== null && <span className="muted">{overall}% overall</span>}
      </div>
      <div className="table-wrap">
        <table className="week">
          <thead>
            <tr>
              <th />
              {dates.map((d) => (
                <th key={d} className={d === now ? 'today' : ''}>
                  {parseISODate(d).toLocaleDateString(undefined, { weekday: 'short' })}
                </th>
              ))}
              <th>Done</th>
            </tr>
          </thead>
          <tbody>
            {active.map((h) => {
              const done = doneByHabit.get(h.id) ?? new Set<string>()
              const rate = completionRate(done, h.days, dates, now)
              return (
                <tr key={h.id}>
                  <th>{h.name}</th>
                  {dates.map((d) => {
                    const due = h.days.includes(weekday(d))
                    const future = d > now
                    return (
                      <td key={d}>
                        {due ? (
                          <input
                            type="checkbox"
                            checked={done.has(d)}
                            disabled={future}
                            onChange={() => toggle(h.id, d)}
                            aria-label={`${h.name} on ${d}`}
                          />
                        ) : (
                          <span className="muted">·</span>
                        )}
                      </td>
                    )
                  })}
                  <td>{rate === null ? '' : `${Math.round(rate * 100)}%`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
