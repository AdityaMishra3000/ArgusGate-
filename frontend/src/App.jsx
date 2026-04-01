import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Feed from './pages/Feed'
import './index.css'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [lastResult, setLastResult] = useState(null)
  const [stats, setStats] = useState({ total: 0, flagged: 0, safe: 0, avgRisk: 0 })

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} />
      <main className="main-content">
        {page === 'dashboard' && <Dashboard stats={stats} setStats={setStats} setPage={setPage} />}
        {page === 'analyze'   && <Analyze onResult={setLastResult} lastResult={lastResult} />}
        {page === 'feed'      && <Feed />}
      </main>
    </div>
  )
}