import { useEffect, useState, useRef } from 'react'
import { getTransactions } from '../api/client'
import { RefreshCw, Filter } from 'lucide-react'

const RISK_COLOR  = { HIGH: 'var(--high)', MEDIUM: 'var(--med)', LOW: '#16a34a' }
const RISK_ORDER  = { HIGH: 0, MEDIUM: 1, LOW: 2 }

function TxnRow({ txn, isNew }) {
  const ts  = new Date(txn.timestamp)
  const col = RISK_COLOR[txn.risk_level]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '50px 110px 1fr 110px 80px 90px',
      gap: 16, alignItems: 'center',
      padding: '13px 20px',
      borderBottom: '1px solid var(--border)',
      transition: 'background 0.15s',
      animation: isNew ? 'slideIn 0.35s ease both' : 'none',
      background: isNew ? 'var(--brand-light)' : 'transparent',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
    onMouseLeave={e => e.currentTarget.style.background = isNew ? 'var(--brand-light)' : 'transparent'}
    >
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: 'var(--text-3)' }}>
        #{txn.user_id}
      </span>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: 'var(--text-3)' }}>
        {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span style={{ fontSize: '0.83rem', color: 'var(--text-2)' }}>
        {ts.toLocaleDateString()}
      </span>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>
        ${txn.amount.toFixed(2)}
      </span>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', fontWeight: 700, color: col }}>
        {(txn.fraud_probability * 100).toFixed(1)}%
      </span>
      <span className={`badge badge-${txn.risk_level}`}>{txn.risk_level}</span>
    </div>
  )
}

export default function Feed() {
  const [txns, setTxns]       = useState([])
  const [filter, setFilter]   = useState('ALL')
  const [newIds, setNewIds]   = useState(new Set())
  const [loading, setLoading] = useState(true)
  const prevIds               = useRef(new Set())

  const load = () =>
    getTransactions(100).then(data => {
      const fresh = new Set(data.filter(t => !prevIds.current.has(t.id)).map(t => t.id))
      prevIds.current = new Set(data.map(t => t.id))
      if (fresh.size > 0) {
        setNewIds(fresh)
        setTimeout(() => setNewIds(new Set()), 2500)
      }
      setTxns(data)
      setLoading(false)
    }).catch(console.error)

  useEffect(() => {
    load()
    const id = setInterval(load, 4000)
    return () => clearInterval(id)
  }, [])

  const filtered = txns.filter(t => filter === 'ALL' || t.risk_level === filter)
  const counts   = { ALL: txns.length, HIGH: 0, MEDIUM: 0, LOW: 0 }
  txns.forEach(t => counts[t.risk_level]++)

  const filters = [
    { key: 'ALL',    label: 'All',    color: 'var(--brand)' },
    { key: 'HIGH',   label: 'High',   color: 'var(--high)'  },
    { key: 'MEDIUM', label: 'Medium', color: 'var(--med)'   },
    { key: 'LOW',    label: 'Low',    color: '#16a34a'      },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Live Feed</h1>
          <p className="page-sub">All transactions · sorted by recency · auto-refreshes every 4s</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 2s infinite' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{txns.length} transactions</span>
          <button onClick={load} style={{
            padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-2)',
            fontFamily: 'Sora, sans-serif', fontSize: '0.78rem',
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="fade-up-1" style={{ display: 'flex', gap: 8 }}>
        <Filter size={14} color="var(--text-3)" style={{ alignSelf: 'center' }} />
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '6px 14px',
            background: filter === f.key ? f.color + '18' : 'var(--surface)',
            border: `1px solid ${filter === f.key ? f.color + '55' : 'var(--border)'}`,
            borderRadius: 99, fontFamily: 'Sora, sans-serif',
            fontSize: '0.8rem', fontWeight: filter === f.key ? 600 : 400,
            color: filter === f.key ? f.color : 'var(--text-2)',
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {f.label}
            <span style={{
              background: filter === f.key ? f.color : 'var(--surface-2)',
              color: filter === f.key ? '#fff' : 'var(--text-3)',
              borderRadius: 99, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700,
            }}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card fade-up-2" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '50px 110px 1fr 110px 80px 90px',
          gap: 16, padding: '12px 20px',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
        }}>
          {['User', 'Time', 'Date', 'Amount', 'Risk %', 'Level'].map(h => (
            <span key={h} style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
            Loading feed...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
            No transactions match this filter.
          </div>
        ) : (
          filtered.map(t => <TxnRow key={t.id} txn={t} isNew={newIds.has(t.id)} />)
        )}
      </div>
    </div>
  )
}