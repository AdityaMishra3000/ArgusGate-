import { useEffect, useState, useRef } from 'react'
import { getTransactions } from '../api/client'

function TxnRow({ txn }) {
  const ts = new Date(txn.timestamp)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '60px 110px 1fr 110px 80px 90px', gap: '16px', alignItems: 'center',
      padding: '16px 24px', borderBottom: '1px solid var(--glass-border)',
      transition: 'background 0.2s', cursor: 'default'
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{txn.user_id}</span>
      <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{ts.toLocaleDateString()}</span>
      <span className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>${txn.amount.toFixed(2)}</span>
      <span className="mono" style={{ fontSize: '0.85rem', color: `var(--${txn.risk_level.toLowerCase()})` }}>
        {(txn.fraud_probability * 100).toFixed(1)}%
      </span>
      <span className={`badge badge-${txn.risk_level}`}>{txn.risk_level}</span>
    </div>
  )
}

export default function Feed() {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () => getTransactions(100).then(setTxns).finally(() => setLoading(false))
    load(); const id = setInterval(load, 4000); return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Live Feed</h1>
          <p className="page-sub">System stream · Auto-refresh active</p>
        </div>
        <div className="badge" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}>
          {txns.length} records
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 110px 1fr 110px 80px 90px', gap: '16px', padding: '16px 24px',
          background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--glass-border)'
        }}>
          {['User', 'Time', 'Date', 'Amount', 'Score', 'Status'].map(h => (
            <span key={h} className="section-label" style={{ margin: 0 }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Establishing secure connection...</div>
        ) : (
          txns.map(t => <TxnRow key={t.id} txn={t} />)
        )}
      </div>
    </div>
  )
}