import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthGate, { SignOutButton } from '../../components/AuthGate'
import { EmptyState, Panel } from '../../components/Panel'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/Icons'
import { useReview } from '../../hooks/useReview'
import { addDays, parseISODate, today } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { habitRate, isQuietWeek, weekStart, type WeekReview, type WeekStats } from '../../lib/review'
import { formatMetres } from '../../lib/training'

const label = (d: string) => parseISODate(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function Numbers({ stats }: { stats: WeekStats }) {
  const rate = habitRate(stats.habits)
  const t = stats.training
  const a = stats.admin
  return (
    <>
      <dl className="totals">
        <div>
          <dt>Habits</dt>
          <dd>{rate === null ? 'None due' : `${stats.habits.done} of ${stats.habits.due}`}</dd>
        </div>
        <div>
          <dt>Gym</dt>
          <dd>{plural(t.gym_sessions, 'session')}</dd>
        </div>
        <div>
          <dt>Swim</dt>
          <dd>{formatMetres(t.swim_metres)}</dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd>{formatMoney(stats.money.spent)}</dd>
        </div>
        <div>
          <dt>To-dos done</dt>
          <dd>{a.todos_done.length}</dd>
        </div>
        <div>
          <dt>Overdue</dt>
          <dd>{a.todos_overdue.length}</dd>
        </div>
      </dl>
      {isQuietWeek(stats) && (
        <p className="muted">
          Nothing logged for this week yet. Check-ins, sessions, transactions and finished to-dos will show here as you add them.
        </p>
      )}
      {stats.goals.length > 0 && (
        <ul className="review-list">
          {stats.goals.map((g) => (
            <li key={g.title}>
              <strong>{g.title}</strong>{' '}
              <span className="muted">
                {g.current} of {g.target} {g.unit}
                {g.added_this_week ? `, +${g.added_this_week} this week` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Written({ review, onDelete }: { review: WeekReview; onDelete: () => void }) {
  return (
    <div className="review">
      <p className="review-summary">{review.summary}</p>
      {review.patterns.length > 0 && (
        <>
          <h3 className="review-label">Patterns</h3>
          <ul className="review-list">
            {review.patterns.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </>
      )}
      {review.focus.length > 0 && (
        <>
          <h3 className="review-label">Next week's focus</h3>
          <ul className="review-list">
            {review.focus.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </>
      )}
      <div className="actions">
        <span className="muted">
          Written {parseISODate(review.created_at.slice(0, 10)).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
        </span>
        <button type="button" className="link-btn danger" onClick={() => confirm('Delete this review?') && onDelete()}>
          Delete
        </button>
      </div>
    </div>
  )
}

function ReviewData() {
  const now = today()
  const [week, setWeek] = useState(weekStart(now))
  const { reviews, stats, loading, error, removeReview } = useReview(week)
  const review = reviews.find((r) => r.week_start === week)
  const isThisWeek = week === weekStart(now)
  const range = `${label(week)} to ${label(addDays(week, 6))}`

  if (loading) return <div className="status">Loading…</div>

  return (
    <div className="grid">
      {error && <div className="status err">{error}</div>}
      <Panel
        title={isThisWeek ? 'This week' : range}
        meta={
          <>
            <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))}>
              <ChevronLeftIcon />
            </button>
            <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setWeek(addDays(week, 7))} disabled={isThisWeek}>
              <ChevronRightIcon />
            </button>
          </>
        }
      >
        {stats ? <Numbers stats={stats} /> : <div className="status">Loading…</div>}
      </Panel>

      <Panel title="Review" meta={<span className="badge">{range}</span>}>
        {review ? (
          <Written review={review} onDelete={() => removeReview(review.id)} />
        ) : (
          <EmptyState>
            {isThisWeek
              ? "This week's review will appear here on Sunday evening, with a summary, patterns across your modules and a focus for next week."
              : 'No review was written for this week.'}
          </EmptyState>
        )}
      </Panel>

      <Panel title="Past reviews">
        {reviews.length === 0 ? (
          <EmptyState>Each week's review will be listed here once the first one is written.</EmptyState>
        ) : (
          <ul className="review-list">
            {reviews.map((r) => (
              <li key={r.id}>
                <button type="button" className="link-btn" onClick={() => setWeek(r.week_start)} aria-current={r.week_start === week}>
                  {label(r.week_start)} to {label(addDays(r.week_start, 6))}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Reviews are written from the numbers in <Link to="/habits">habits</Link>, <Link to="/training">training</Link>,{' '}
          <Link to="/money">money</Link> and <Link to="/admin">life admin</Link>.
        </p>
      </Panel>
    </div>
  )
}

export default function Review() {
  return (
    <>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <SignOutButton />
      </div>
      <AuthGate>
        <ReviewData />
      </AuthGate>
    </>
  )
}
