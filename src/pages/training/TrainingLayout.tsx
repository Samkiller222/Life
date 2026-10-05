import { NavLink, Outlet } from 'react-router-dom'
import AuthGate, { SignOutButton } from '../../components/AuthGate'
import { useTraining } from '../../hooks/useTraining'

function TrainingData() {
  const training = useTraining()
  return (
    <>
      {training.error && <div className="status err">{training.error}</div>}
      {training.loading ? <div className="status">Loading…</div> : <Outlet context={training} />}
    </>
  )
}

export default function TrainingLayout() {
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <nav className="tabs">
          <NavLink to="/training" end>
            Week
          </NavLink>
          <NavLink to="/training/gym">Log gym</NavLink>
          <NavLink to="/training/swim">Log swim</NavLink>
          <NavLink to="/training/history">History</NavLink>
        </nav>
        <SignOutButton />
      </div>
      <AuthGate>
        <TrainingData />
      </AuthGate>
    </>
  )
}
