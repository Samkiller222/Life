import { NavLink, Outlet } from 'react-router-dom'
import AuthGate, { SignOutButton } from '../../components/AuthGate'
import { useHabits } from '../../hooks/useHabits'

function HabitsData() {
  const habits = useHabits()
  return (
    <>
      {habits.error && <p className="error">{habits.error}</p>}
      {habits.loading ? <p className="muted">Loading…</p> : <Outlet context={habits} />}
    </>
  )
}

export default function HabitsLayout() {
  return (
    <>
      <div className="row spread">
        <h1>Habits and goals</h1>
        <SignOutButton />
      </div>
      <nav className="tabs">
        <NavLink to="/habits" end>
          Today
        </NavLink>
        <NavLink to="/habits/week">This week</NavLink>
        <NavLink to="/habits/manage">Manage habits</NavLink>
        <NavLink to="/habits/goals">Goals</NavLink>
      </nav>
      <AuthGate>
        <HabitsData />
      </AuthGate>
    </>
  )
}
