import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Feed from './pages/Feed'
import Simulate from './pages/Simulate'
import AdminReview from './pages/AdminReview'
import './index.css'

export default function App() {
  const [page, setPage]           = useState('dashboard')
  const [lastResult, setLastResult] = useState(null)

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} />
      <main className="main-content">
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'analyze'   && <Analyze onResult={setLastResult} lastResult={lastResult} />}
        {page === 'feed'      && <Feed />}
        {page === 'simulate'  && <Simulate />}
        {page === 'admin'     && <AdminReview />}
      </main>
    </div>
  )
}