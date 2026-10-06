import { NavLink, Outlet } from 'react-router-dom'
import AuthGate, { SignOutButton } from '../../components/AuthGate'
import { useMoney } from '../../hooks/useMoney'

function MoneyData() {
  const money = useMoney()
  return (
    <>
      {money.error && <div className="status err">{money.error}</div>}
      {money.loading ? <div className="status">Loading…</div> : <Outlet context={money} />}
    </>
  )
}

export default function MoneyLayout() {
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <nav className="tabs">
          <NavLink to="/money" end>
            Overview
          </NavLink>
          <NavLink to="/money/add">Add</NavLink>
          <NavLink to="/money/transactions">Transactions</NavLink>
          <NavLink to="/money/budgets">Budgets and rules</NavLink>
          <NavLink to="/money/savings">Savings</NavLink>
        </nav>
        <SignOutButton />
      </div>
      <AuthGate>
        <MoneyData />
      </AuthGate>
    </>
  )
}
