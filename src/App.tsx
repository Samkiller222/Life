import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ComingSoon from './pages/ComingSoon'
import HabitsLayout from './pages/habits/HabitsLayout'
import Today from './pages/habits/Today'
import Week from './pages/habits/Week'
import Manage from './pages/habits/Manage'
import Goals from './pages/habits/Goals'
import TrainingLayout from './pages/training/TrainingLayout'
import TrainingWeek from './pages/training/Week'
import LogGym from './pages/training/LogGym'
import LogSwim from './pages/training/LogSwim'
import History from './pages/training/History'
import { modules } from './modules'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/habits" element={<HabitsLayout />}>
            <Route index element={<Today />} />
            <Route path="week" element={<Week />} />
            <Route path="manage" element={<Manage />} />
            <Route path="goals" element={<Goals />} />
          </Route>
          <Route path="/training" element={<TrainingLayout />}>
            <Route index element={<TrainingWeek />} />
            <Route path="gym" element={<LogGym />} />
            <Route path="gym/:id" element={<LogGym />} />
            <Route path="swim" element={<LogSwim />} />
            <Route path="swim/:id" element={<LogSwim />} />
            <Route path="history" element={<History />} />
          </Route>
          {modules
            .filter((m) => !m.built)
            .map((m) => (
              <Route key={m.path} path={m.path} element={<ComingSoon module={m} />} />
            ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
