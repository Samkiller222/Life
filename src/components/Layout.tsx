import { NavLink, Outlet } from 'react-router-dom'
import { modules } from '../modules'

export default function Layout() {
  return (
    <div className="layout">
      <nav className="sidebar">
        <NavLink to="/" end className="brand">
          Life
        </NavLink>
        {modules.map((m) => (
          <NavLink key={m.path} to={m.path}>
            {m.name}
          </NavLink>
        ))}
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
