import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useHabitsContext } from './context'
import { completionRate } from '../../lib/streak'
import { addDays, parseISODate, today, weekday, weekOf } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'

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
    <Panel
      title={`${label(dates[0])} to ${label(dates[6])}`}
      meta={
        <>
          {overall !== null && <span className={overall === 100 ? 'badge ok' : 'tag'}>{overall}% overall</span>}
          <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setAnchor(addDays(anchor, -7))}>
            <ChevronLeftIcon />
          </button>
          <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setAnchor(addDays(anchor, 7))} disabled={dates[6] >= now}>
            <ChevronRightIcon />
          </button>
        </>
      }
    >
      {active.length === 0 ? (
        <EmptyState>
          Your week will appear here once you've added habits. <Link to="/habits/manage">Add a habit</Link>.
        </EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Habit</th>
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
                    {dates.map((d) => (
                      <td key={d}>
                        {h.days.includes(weekday(d)) ? (
                          <input
                            type="checkbox"
                            checked={done.has(d)}
                            disabled={d > now}
                            onChange={() => toggle(h.id, d)}
                            aria-label={`${h.name} on ${d}`}
                          />
                        ) : (
                          <span className="muted">·</span>
                        )}
                      </td>
                    ))}
                    <td>{rate === null ? '' : `${Math.round(rate * 100)}%`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
