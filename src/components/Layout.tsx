import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { modules } from '../modules'
import logo from '../assets/logo.png'
import { MenuIcon, MoonIcon, SunIcon } from './Icons'

type Theme = 'light' | 'dark'

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) ?? 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Storage can be blocked; the toggle still works for this visit.
    }
  }, [theme])
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')] as const
}

const home = {
  path: '/',
  name: 'Dashboard',
  eyebrow: 'Life · Dashboard',
  summary: 'Habits, training, money and life admin in one place, built up a module at a time.',
}

function currentView(pathname: string) {
  const i = modules.findIndex((m) => pathname === m.path || pathname.startsWith(m.path + '/'))
  if (i === -1) return home
  const m = modules[i]
  return { path: m.path, name: m.name, eyebrow: `Life · Phase ${i + 1}`, summary: m.summary }
}

export default function Layout() {
  const { pathname } = useLocation()
  const [theme, toggleTheme] = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const view = currentView(pathname)

  // Close the menu on any click outside it or on Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const items = [{ path: '/', name: 'Dashboard', desc: 'All modules' }, ...modules.map((m) => ({ path: m.path, name: m.name, desc: m.built ? 'Ready to use' : 'Not built yet' }))]

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <div className="menu-wrap" ref={menuRef}>
              <button type="button" className="round-btn" aria-label="Open modules menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
                <MenuIcon />
              </button>
              {menuOpen && (
                <nav className="app-menu">
                  {items.map((it) => (
                    <NavLink
                      key={it.path}
                      to={it.path}
                      end={it.path === '/'}
                      className={() => (it.path === view.path ? 'active' : '')}
                      onClick={() => setMenuOpen(false)}
                    >
                      {it.name}
                      <span>{it.desc}</span>
                    </NavLink>
                  ))}
                </nav>
              )}
            </div>
            <img className="brand-logo" src={logo} alt="" />
            <div>
              <div className="eyebrow">{view.eyebrow}</div>
              <h1>{view.name}</h1>
              <p>{view.summary}</p>
            </div>
          </div>
          <button type="button" className="round-btn" aria-label="Toggle dark mode" onClick={toggleTheme}>
            {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">Your data is stored in your own Supabase project and is visible only to you.</footer>
    </div>
  )
}
