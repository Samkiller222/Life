import { Link, useNavigate } from 'react-router-dom'
import { useAdminContext } from './context'
import TripForm from './TripForm'
import { sortTrips, tripDates, tripPhase, tripSpending, tripWhen } from '../../lib/admin'
import { formatMoney } from '../../lib/money'
import { today } from '../../lib/dates'
import { EmptyState, Panel } from '../../components/Panel'

export default function Trips() {
  const { trips, items, costs, todos, addTrip } = useAdminContext()
  const navigate = useNavigate()
  const now = today()
  const sorted = sortTrips(trips, now)

  return (
    <div className="grid">
      <Panel title="Your trips" meta={<span className="tag">{trips.length}</span>}>
        {sorted.length === 0 ? (
          <EmptyState>Trips you plan will appear here, soonest first, with their checklist progress and spending against budget.</EmptyState>
        ) : (
          <div className="module-list">
            {sorted.map((t) => {
              const list = items.filter((i) => i.trip_id === t.id)
              const done = list.filter((i) => i.done).length
              const openTodos = todos.filter((x) => x.trip_id === t.id && !x.done_at).length
              const spent = tripSpending(costs.filter((c) => c.trip_id === t.id)).total
              const phase = tripPhase(t, now)
              const over = t.budget != null && spent > t.budget
              return (
                <Link key={t.id} to={`/admin/trips/${t.id}`} className="module-row">
                  <div>
                    <span className="phase-num">{[t.destination, tripDates(t)].filter(Boolean).join(' · ') || 'No details yet'}</span>
                    <strong>{t.name}</strong>
                    <span className="desc">
                      {list.length ? `${done} of ${list.length} packed and booked` : 'No checklist yet'}
                      {openTodos ? ` · ${openTodos} to-do${openTodos === 1 ? '' : 's'}` : ''}
                      {spent || t.budget != null ? ` · ${formatMoney(spent)}${t.budget != null ? ` of ${formatMoney(t.budget)}` : ' spent'}` : ''}
                    </span>
                  </div>
                  <span className={over ? 'badge err' : phase === 'now' ? 'badge accent' : phase === 'past' ? 'badge ok' : 'badge'}>{over ? 'Over budget' : tripWhen(t, now)}</span>
                </Link>
              )
            })}
          </div>
        )}
      </Panel>
      <Panel title="Plan a trip">
        <TripForm
          submitLabel="Add trip"
          onSubmit={async (t) => {
            const id = await addTrip(t)
            if (id) navigate(`/admin/trips/${id}`)
            return !!id
          }}
        />
      </Panel>
    </div>
  )
}
