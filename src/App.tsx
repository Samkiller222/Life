import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ComingSoon from './pages/ComingSoon'
import HabitsLayout from './pages/habits/HabitsLayout'
import Today from './pages/habits/Today'
import Week from './pages/habits/Week'
import Manage from './pages/habits/Manage'
import Goals from './pages/habits/Goals'
import { modules } from './modules'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/habits" element={<HabitsLayout />}>
            <Route index element={<Today />} />
            <Route path="week" element={<Week />} />
            <Route path="manage" element={<Manage />} />
            <Route path="goals" element={<Goals />} />
          </Route>
          {modules
            .filter((m) => m.path !== '/habits')
            .map((m) => (
              <Route key={m.path} path={m.path} element={<ComingSoon module={m} />} />
            ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
