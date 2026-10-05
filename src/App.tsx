import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ComingSoon from './pages/ComingSoon'
import { modules } from './modules'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {modules.map((m) => (
            <Route key={m.path} path={m.path} element={<ComingSoon module={m} />} />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
