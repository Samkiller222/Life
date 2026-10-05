import { Link } from 'react-router-dom'
import { useTrainingContext } from './context'
import { parseISODate } from '../../lib/dates'
import { bestSets, formatKg, formatMetres, formatMinutes, swimPace } from '../../lib/training'
import { EmptyState, Panel } from '../../components/Panel'

const dateLabel = (d: string) => parseISODate(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default function History() {
  const { gym, swims, exerciseName } = useTrainingContext()

  const sessions = [
    ...gym.map((s) => ({
      key: `g-${s.id}`,
      date: s.date,
      to: `/training/gym/${s.id}`,
      kind: 'Gym',
      title: s.name || 'Gym session',
      detail: [`${s.sets.length} set${s.sets.length === 1 ? '' : 's'}`, s.duration_min ? formatMinutes(s.duration_min) : ''],
    })),
    ...swims.map((s) => ({
      key: `s-${s.id}`,
      date: s.date,
      to: `/training/swim/${s.id}`,
      kind: 'Swim',
      title: formatMetres(s.distance_m),
      detail: [s.focus, s.duration_min ? formatMinutes(s.duration_min) : '', swimPace(s.distance_m, s.duration_min)],
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const best = bestSets(gym)
    .map((b) => ({ ...b, name: exerciseName.get(b.exerciseId) ?? '' }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="grid">
      <Panel title="Sessions" meta={<span className="tag">Last 12 months</span>}>
        {sessions.length === 0 ? (
          <EmptyState>Every gym session and swim you log will be listed here, newest first.</EmptyState>
        ) : (
          <ul className="session-list">
            {sessions.map((s) => (
              <li key={s.key}>
                <Link to={s.to} className="session">
                  <span className="tag">{s.kind}</span>
                  <strong>{s.title}</strong>
                  <span className="muted">{[dateLabel(s.date), ...s.detail].filter(Boolean).join(' · ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Best sets">
        {best.length === 0 ? (
          <EmptyState>Your heaviest set for each exercise will appear here once you log a gym session.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Exercise</th>
                  <th>Best</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {best.map((b) => (
                  <tr key={b.exerciseId}>
                    <th>{b.name}</th>
                    <td>
                      {b.reps} × {formatKg(b.weightKg)}
                    </td>
                    <td>{parseISODate(b.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
