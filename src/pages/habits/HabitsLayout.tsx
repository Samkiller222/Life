import { NavLink, Outlet } from 'react-router-dom'
import AuthGate, { SignOutButton } from '../../components/AuthGate'
import { useHabits } from '../../hooks/useHabits'

function HabitsData() {
  const habits = useHabits()
  return (
    <>
      {habits.error && <div className="status err">{habits.error}</div>}
      {habits.loading ? <div className="status">Loading…</div> : <Outlet context={habits} />}
    </>
  )
}

export default function HabitsLayout() {
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <nav className="tabs">
          <NavLink to="/habits" end>
            Today
          </NavLink>
          <NavLink to="/habits/week">This week</NavLink>
          <NavLink to="/habits/manage">Manage habits</NavLink>
          <NavLink to="/habits/goals">Goals</NavLink>
        </nav>
        <SignOutButton />
      </div>
      <AuthGate>
        <HabitsData />
      </AuthGate>
    </>
  )
}
