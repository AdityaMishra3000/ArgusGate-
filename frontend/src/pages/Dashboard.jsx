import { useEffect, useState } from 'react'
import { getTransactions } from '../api/client'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

function StatPanel({ label, value, sub, color }) {
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{
        fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.03em',
        color: color || 'var(--text-primary)',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

function RiskBar({ label, value, max, colorVar }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="mono" style={{ color: `var(${colorVar})` }}>{value}</span>
      </div>
      <div style={{ height: '4px', background: 'var(--surface-hover)', borderRadius: '0', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `var(${colorVar})`,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

function RecentRow({ txn }) {
  const risk = txn.risk_level
  const ts   = new Date(txn.timestamp)
  const statusColors = {
    auto_approved:   'var(--low)',
    pending_review:  'var(--med)',
    auto_blocked:    'var(--high)',
    analyst_approved:'var(--low)',
    analyst_blocked: 'var(--high)',
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr 100px 80px 110px',
      gap: '16px', alignItems: 'center',
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        #{txn.user_id}
      </span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        {ts.toLocaleDateString()}{' '}
        <span className="mono" style={{ marginLeft: '8px' }}>
          {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </span>
      <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
        ${txn.amount.toFixed(2)}
      </span>
      <span className="mono" style={{ fontSize: '0.85rem', color: `var(--${risk.toLowerCase()})` }}>
        {(txn.fraud_probability * 100).toFixed(1)}%
      </span>
      <span style={{
        fontSize: '0.72rem', fontWeight: 600,
        color: statusColors[txn.status] || 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {txn.status?.replace('_', ' ')}
      </span>
    </div>
  )
}

export default function Dashboard({ setPage }) {
  const [txns,    setTxns]    = useState([])
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // stats from dedicated endpoint — counts entire DB, not just last 50
        const [statsRes, txnsRes] = await Promise.all([
          api.get('/admin/stats'),
          getTransactions(20),
        ])
        setStats(statsRes.data)
        setTxns(txnsRes)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 6000)
    return () => clearInterval(id)
  }, [])

  const total    = stats?.total            ?? 0
  const approved = (stats?.auto_approved   ?? 0) + (stats?.analyst_approved ?? 0)
  const blocked  = (stats?.auto_blocked    ?? 0) + (stats?.analyst_blocked  ?? 0)
  const pending  = stats?.pending_review   ?? 0
  const analystDecisions = (stats?.analyst_approved ?? 0) + (stats?.analyst_blocked ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">Real-time transaction monitoring · Full DB metrics</p>
      </div>

      {/* Primary stats — from /admin/stats (full DB count) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatPanel label="Total Processed"    value={total}    sub="All time"             />
        <StatPanel label="Approved"           value={approved} sub="Auto + analyst"       color="var(--low)"  />
        <StatPanel label="Pending Review"     value={pending}  sub="Awaiting analyst"     color="var(--med)"  />
        <StatPanel label="Blocked"            value={blocked}  sub="Auto + analyst"       color="var(--high)" />
      </div>

      {/* Secondary stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <StatPanel
          label="Auto Approved"
          value={stats?.auto_approved ?? 0}
          sub="Model confident — safe"
          color="var(--low)"
        />
        <StatPanel
          label="Auto Blocked"
          value={stats?.auto_blocked ?? 0}
          sub="Model confident — fraud"
          color="var(--high)"
        />
        <StatPanel
          label="Analyst Decisions"
          value={analystDecisions}
          sub="Human reviewed"
          color="#8b5cf6"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
        <div className="panel">
          <div className="panel-header">Decision Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RiskBar label="Approved (all)"    value={approved} max={total} colorVar="--low"  />
            <RiskBar label="Pending Review"    value={pending}  max={total} colorVar="--med"  />
            <RiskBar label="Blocked (all)"     value={blocked}  max={total} colorVar="--high" />
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-header">Manual Analysis</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Submit a single transaction for immediate model evaluation and SHAP signal breakdown.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
            <button className="btn-secondary" onClick={() => setPage('analyze')} style={{ width: '100%' }}>
              Open Analyzer
            </button>
            <button className="btn-secondary" onClick={() => setPage('simulate')} style={{ width: '100%' }}>
              Run Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Recent 20 transactions */}
      <div className="panel">
        <div className="panel-header" style={{ marginBottom: '8px' }}>
          Recent Transactions
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            &nbsp;· last 20 · refreshes every 6s
          </span>
        </div>
        {loading ? (
          <div style={{ padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Loading...
          </div>
        ) : txns.length === 0 ? (
          <div style={{ padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No transactions yet. Run a simulation to populate data.
          </div>
        ) : (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 100px 80px 110px',
              gap: '16px', padding: '8px 0',
              borderBottom: '1px solid var(--border-light)',
            }}>
              {['User', 'Timestamp', 'Amount', 'Score', 'Status'].map(h => (
                <span key={h} className="section-label" style={{ margin: 0 }}>{h}</span>
              ))}
            </div>
            {txns.map(t => <RecentRow key={t.id} txn={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}