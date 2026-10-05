import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTrainingContext } from './context'
import { addDays, parseISODate, today, weekOf } from '../../lib/dates'
import { exerciseOrder, formatKg, formatMetres, formatMinutes, swimPace, weekTotals } from '../../lib/training'
import { EmptyState, Panel } from '../../components/Panel'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'

export default function Week() {
  const { gym, swims, exerciseName } = useTrainingContext()
  const [anchor, setAnchor] = useState(today())
  const dates = weekOf(anchor)
  const now = today()
  const totals = weekTotals(gym, swims, dates)
  const empty = totals.gymSessions === 0 && totals.swims === 0

  const label = (d: string) => parseISODate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <div className="grid">
      <Panel
        title={`${label(dates[0])} to ${label(dates[6])}`}
        meta={
          <>
            <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setAnchor(addDays(anchor, -7))}>
              <ChevronLeftIcon />
            </button>
            <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setAnchor(addDays(anchor, 7))} disabled={dates[6] >= now}>
              <ChevronRightIcon />
            </button>
          </>
        }
      >
        <dl className="totals">
          <div>
            <dt>Gym</dt>
            <dd>
              {totals.gymSessions} session{totals.gymSessions === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt>Sets</dt>
            <dd>{totals.sets}</dd>
          </div>
          <div>
            <dt>Volume</dt>
            <dd>{formatKg(totals.volumeKg)}</dd>
          </div>
          <div>
            <dt>Swim</dt>
            <dd>{formatMetres(totals.metres)}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{formatMinutes(totals.minutes)}</dd>
          </div>
        </dl>
        {empty ? (
          <EmptyState>
            Gym sessions and swims you log for this week will appear here by day. <Link to="/training/gym">Log gym</Link> or{' '}
            <Link to="/training/swim">log a swim</Link>.
          </EmptyState>
        ) : (
          <ol className="day-list">
            {dates.map((d) => {
              const dayGym = gym.filter((s) => s.date === d)
              const daySwims = swims.filter((s) => s.date === d)
              return (
                <li key={d} className={d === now ? 'today' : ''}>
                  <span className="day-label">{parseISODate(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</span>
                  <div className="day-items">
                    {dayGym.length === 0 && daySwims.length === 0 && <span className="muted">Rest</span>}
                    {dayGym.map((s) => (
                      <Link key={s.id} to={`/training/gym/${s.id}`} className="session">
                        <span className="tag">Gym</span>
                        <strong>{s.name || 'Gym session'}</strong>
                        <span className="muted">
                          {exerciseOrder(s.sets)
                            .map((id) => exerciseName.get(id))
                            .join(', ') || 'No exercises'}
                          {s.duration_min ? ` · ${formatMinutes(s.duration_min)}` : ''}
                        </span>
                      </Link>
                    ))}
                    {daySwims.map((s) => (
                      <Link key={s.id} to={`/training/swim/${s.id}`} className="session">
                        <span className="tag">Swim</span>
                        <strong>{formatMetres(s.distance_m)}</strong>
                        <span className="muted">
                          {[s.focus, s.duration_min ? formatMinutes(s.duration_min) : '', swimPace(s.distance_m, s.duration_min)]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </Link>
                    ))}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Panel>
    </div>
  )
}
