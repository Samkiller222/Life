import { NavLink, Outlet } from 'react-router-dom'
import AuthGate, { SignOutButton } from '../../components/AuthGate'
import { useAdmin } from '../../hooks/useAdmin'

function AdminData() {
  const admin = useAdmin()
  return (
    <>
      {admin.error && <div className="status err">{admin.error}</div>}
      {admin.loading ? <div className="status">Loading…</div> : <Outlet context={admin} />}
    </>
  )
}

export default function AdminLayout() {
  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <nav className="tabs">
          <NavLink to="/admin" end>
            To-dos
          </NavLink>
          <NavLink to="/admin/reading">Reading</NavLink>
          <NavLink to="/admin/trips">Trips</NavLink>
        </nav>
        <SignOutButton />
      </div>
      <AuthGate>
        <AdminData />
      </AuthGate>
    </>
  )
}
