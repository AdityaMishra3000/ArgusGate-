import { useEffect, useState } from 'react'
import { getTransactions } from '../api/client'

function StatPanel({ label, value, sub }) {
  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ fontSize: '2rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
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
        <div style={{ height: '100%', width: `${pct}%`, background: `var(${colorVar})`, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

function RecentRow({ txn }) {
  const risk = txn.risk_level
  const ts = new Date(txn.timestamp)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '60px 1fr 100px 80px 80px', gap: '16px', alignItems: 'center',
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{txn.user_id}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        {ts.toLocaleDateString()} <span className="mono" style={{ marginLeft: '8px' }}>{ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </span>
      <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
        ${txn.amount.toFixed(2)}
      </span>
      <span className="mono" style={{ fontSize: '0.85rem', color: `var(--${risk.toLowerCase()})` }}>
        {(txn.fraud_probability * 100).toFixed(1)}%
      </span>
      <span className={`badge badge-${risk}`}>{risk}</span>
    </div>
  )
}

export default function Dashboard({ setPage }) {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => getTransactions(30).then(setTxns).finally(() => setLoading(false))
    load()
    const id = setInterval(load, 6000)
    return () => clearInterval(id)
  }, [])

  const total   = txns.length
  const high    = txns.filter(t => t.risk_level === 'HIGH').length
  const medium  = txns.filter(t => t.risk_level === 'MEDIUM').length
  const low     = txns.filter(t => t.risk_level === 'LOW').length
  const avgRisk = total > 0 ? (txns.reduce((a, t) => a + t.fraud_probability, 0) / total * 100).toFixed(1) : '0.0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">Real-time transaction monitoring</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatPanel label="Total Analyzed" value={total} sub="Last 24 hours" />
        <StatPanel label="High Risk" value={high} sub="Flagged for review" />
        <StatPanel label="Safe" value={low} sub="Cleared automatically" />
        <StatPanel label="Avg Risk Score" value={`${avgRisk}%`} sub="System-wide metric" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>
        <div className="panel">
          <div className="panel-header">Risk Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <RiskBar label="High Priority" value={high} max={total} colorVar="--high" />
            <RiskBar label="Elevated" value={medium} max={total} colorVar="--med" />
            <RiskBar label="Standard" value={low} max={total} colorVar="--low" />
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="panel-header">Manual Analysis</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Inject transaction parameters manually to evaluate the model's response and signal breakdown.
            </p>
          </div>
          <button className="btn-secondary" onClick={() => setPage('analyze')} style={{ width: '100%', marginTop: '24px' }}>
            Open Terminal
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header" style={{ marginBottom: '8px' }}>Recent Transactions</div>
        {loading ? (
          <div style={{ padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fetching stream...</div>
        ) : (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 100px 80px 80px', gap: '16px',
              padding: '12px 0', borderBottom: '1px solid var(--border-light)',
            }}>
              {['ID', 'Timestamp', 'Amount', 'Score', 'Status'].map(h => (
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