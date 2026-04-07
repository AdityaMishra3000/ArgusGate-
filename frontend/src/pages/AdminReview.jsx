import { useState, useEffect } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })
const ADMIN_PIN = 'ADMIN-2025'

function PinGate({ onUnlock }) {
  const [pin, setPin]     = useState('')
  const [error, setError] = useState(false)

  const attempt = () => {
    if (pin === ADMIN_PIN) { onUnlock() }
    else { setError(true); setPin(''); setTimeout(() => setError(false), 1500) }
  }

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔒</div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
          Analyst Access Required
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Enter your admin PIN to access the review queue
        </p>
      </div>

      <div className="glass-panel" style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input
          className="input-field"
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          style={{
            textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.3em',
            borderColor: error ? 'rgba(239,68,68,0.5)' : undefined,
            transition: 'border-color 0.2s',
          }}
          autoFocus
        />
        {error && (
          <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#ef4444' }}>
            Incorrect PIN
          </div>
        )}
        <button className="btn-primary" onClick={attempt} style={{ width: '100%' }}>
          Authenticate →
        </button>
        <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Hint: ADMIN-2025
        </div>
      </div>
    </div>
  )
}

function QueueCard({ txn, onDecide }) {
  const [deciding, setDeciding] = useState(false)
  const [gone, setGone]         = useState(false)

  const decide = async (action) => {
    setDeciding(true)
    try {
      await api.patch(`/admin/decide/${txn.id}`, {
        decision: action, analyst_id: 'analyst_01',
        note: `Manual ${action} via review queue`,
      })
      setGone(true)
      setTimeout(() => onDecide(txn.id), 400)
    } catch (e) {
      console.error(e)
    } finally {
      setDeciding(false)
    }
  }

  const prob  = (txn.fraud_probability * 100).toFixed(1)
  const color = txn.risk_level === 'HIGH' ? '#ef4444' : '#f59e0b'

  return (
    <div style={{
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 12, padding: '20px',
      transition: 'opacity 0.3s, transform 0.3s',
      opacity: gone ? 0 : 1,
      transform: gone ? 'scale(0.96)' : 'scale(1)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              TXN #{txn.id}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>·</span>
            <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              User #{txn.user_id}
            </span>
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 400, letterSpacing: '-0.02em', marginTop: 4 }}>
            ${txn.amount.toFixed(2)}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 400, color, letterSpacing: '-0.03em' }}>
            {prob}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>fraud score</div>
        </div>
      </div>

      {/* Signals */}
      <div style={{ marginBottom: 16 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Detected Signals</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {txn.top_signals?.map((s, i) => (
            <div key={i} style={{
              fontSize: '0.78rem', color: 'var(--text-secondary)',
              background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 6, padding: '6px 12px',
              display: 'flex', gap: 8,
            }}>
              <span style={{ color: '#ef4444' }}>▲</span> {s}
            </div>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, background: 'var(--glass-border)',
        borderRadius: 8, overflow: 'hidden', marginBottom: 16,
      }}>
        {[
          { label: 'Distance',  value: txn.dist_from_home_km ? `${txn.dist_from_home_km.toFixed(0)} km` : '—' },
          { label: 'Txns/hr',  value: txn.velocity_1h ?? '—' },
          { label: 'Amt Z',    value: txn.amount_zscore ? txn.amount_zscore.toFixed(2) : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(0,0,0,0.3)', padding: '8px 12px', textAlign: 'center',
          }}>
            <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              {value}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Decision buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          onClick={() => decide('approve')}
          disabled={deciding}
          style={{
            padding: '10px', border: '1px solid rgba(16,185,129,0.4)',
            background: 'rgba(16,185,129,0.08)', color: '#10b981',
            borderRadius: 8, fontFamily: 'inherit', fontSize: '0.82rem',
            fontWeight: 600, cursor: deciding ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)' }}
        >
          ✓ Approve
        </button>
        <button
          onClick={() => decide('block')}
          disabled={deciding}
          style={{
            padding: '10px', border: '1px solid rgba(239,68,68,0.4)',
            background: 'rgba(239,68,68,0.08)', color: '#ef4444',
            borderRadius: 8, fontFamily: 'inherit', fontSize: '0.82rem',
            fontWeight: 600, cursor: deciding ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
        >
          ✕ Block
        </button>
      </div>
    </div>
  )
}

export default function AdminReview() {
  const [unlocked, setUnlocked] = useState(false)
  const [queue, setQueue]       = useState([])
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(false)

  const loadQueue = async () => {
    setLoading(true)
    try {
      const [q, s] = await Promise.all([
        api.get('/admin/queue').then(r => r.data),
        api.get('/admin/stats').then(r => r.data),
      ])
      setQueue(q)
      setStats(s)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (unlocked) {
      loadQueue()
      const id = setInterval(loadQueue, 8000)
      return () => clearInterval(id)
    }
  }, [unlocked])

  const removeFromQueue = (id) =>
    setQueue(q => q.filter(t => t.id !== id))

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Review Queue</h1>
          <p className="page-sub">
            Analyst view · Transactions flagged for human review
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Logged in as analyst_01
          </span>
          <button
            onClick={() => setUnlocked(false)}
            style={{
              padding: '5px 12px', background: 'transparent',
              border: '1px solid var(--glass-border)', borderRadius: 6,
              color: 'var(--text-muted)', fontFamily: 'inherit',
              fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            Lock
          </button>
        </div>
      </div>

      {/* Stats strip */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Processed',   value: stats.total,            color: 'var(--text-primary)' },
            { label: 'Auto Approved',     value: stats.auto_approved,    color: '#10b981' },
            { label: 'Pending Review',    value: stats.pending_review,   color: '#f59e0b' },
            { label: 'Auto Blocked',      value: stats.auto_blocked,     color: '#ef4444' },
            { label: 'Analyst Decisions', value: (stats.analyst_approved || 0) + (stats.analyst_blocked || 0), color: '#8b5cf6' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-panel" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 400, color, letterSpacing: '-0.03em' }}>{value}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Queue */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="section-label" style={{ margin: 0 }}>
            Pending Review — {queue.length} transactions
          </div>
          <button
            onClick={loadQueue}
            style={{
              padding: '5px 14px', background: 'transparent',
              border: '1px solid var(--glass-border)', borderRadius: 6,
              color: 'var(--text-secondary)', fontFamily: 'inherit',
              fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>

        {loading && queue.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            Loading queue...
          </div>
        )}

        {!loading && queue.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '48px' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>✓</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Queue is clear. No transactions pending review.
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 6 }}>
              Run a simulation to generate new transactions.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {queue.map(t => (
            <QueueCard key={t.id} txn={t} onDecide={removeFromQueue} />
          ))}
        </div>
      </div>
    </div>
  )
}