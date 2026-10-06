import { Link } from 'react-router-dom'
import { useMoneyContext } from './context'
import MonthNav from './MonthNav'
import { budgetState, formatMoney, monthLabel, summarise } from '../../lib/money'
import { EmptyState, Panel } from '../../components/Panel'

export default function Overview() {
  const { categories, transactions, goals, month, setMonth } = useMoneyContext()
  const s = summarise(transactions, categories)
  const lines = s.lines.filter((l) => l.budget || l.spent)

  return (
    <div className="grid">
      <Panel title={monthLabel(month)} meta={<MonthNav month={month} onChange={setMonth} />}>
        <dl className="totals">
          <div>
            <dt>Money in</dt>
            <dd>{formatMoney(s.income)}</dd>
          </div>
          <div>
            <dt>Spent</dt>
            <dd>{formatMoney(s.spending)}</dd>
          </div>
          <div>
            <dt>Left over</dt>
            <dd>{formatMoney(s.income - s.spending)}</dd>
          </div>
          <div>
            <dt>Budgeted</dt>
            <dd>{formatMoney(s.budgeted)}</dd>
          </div>
        </dl>
        {s.uncategorisedCount > 0 && (
          <p className="notice">
            {s.uncategorisedCount} transaction{s.uncategorisedCount === 1 ? ' has' : 's have'} no category yet
            {s.uncategorisedSpending ? `, ${formatMoney(s.uncategorisedSpending)} of spending` : ''}.{' '}
            <Link to="/money/transactions?category=none">Sort them</Link>
          </p>
        )}
        {transactions.length === 0 ? (
          <EmptyState>
            Spending by category for {monthLabel(month)} will appear here once you <Link to="/money/add">add what you spend</Link>.
          </EmptyState>
        ) : lines.length === 0 ? (
          <EmptyState>
            Budgets will show here once you <Link to="/money/budgets">add categories with a monthly budget</Link>.
          </EmptyState>
        ) : (
          <ul className="budget-list">
            {lines.map((l) => {
              const state = budgetState(l.spent, l.budget)
              const pct = l.budget ? Math.min(100, Math.round((Math.max(0, l.spent) / l.budget) * 100)) : 100
              return (
                <li key={l.category.id}>
                  <div className="stat-head">
                    <Link to={`/money/transactions?category=${l.category.id}`}>
                      <strong>{l.category.name}</strong>
                    </Link>
                    <span className="stat-count">
                      {formatMoney(l.spent)}
                      {l.budget ? ` of ${formatMoney(l.budget)}` : ', no budget'}
                      {l.budget && l.spent > l.budget ? ` · ${formatMoney(l.spent - l.budget)} over` : ''}
                    </span>
                  </div>
                  {l.budget ? (
                    <div className="stat-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={l.category.name}>
                      <div className={`stat-fill ${state || 'done'}`} style={{ width: `${pct}%` }} />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
      <Panel title="Savings goals" meta={<Link to="/money/savings">Manage</Link>}>
        {goals.length === 0 ? (
          <EmptyState>
            Savings goals will appear here with a progress bar once you <Link to="/money/savings">add one</Link>.
          </EmptyState>
        ) : (
          <ul className="budget-list">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100))
              return (
                <li key={g.id}>
                  <div className="stat-head">
                    <strong>{g.name}</strong>
                    <span className="stat-count">
                      {formatMoney(g.saved_amount)} of {formatMoney(g.target_amount)}
                    </span>
                  </div>
                  <div className="stat-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={g.name}>
                    <div className={pct >= 100 ? 'stat-fill done' : 'stat-fill'} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
