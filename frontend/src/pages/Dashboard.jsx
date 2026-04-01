import { useEffect, useState } from 'react'
import { getTransactions } from '../api/client'
import { TrendingUp, ShieldAlert, ShieldCheck, Zap } from 'lucide-react'

function StatCard({ label, value, sub, color, icon: Icon, delay }) {
  return (
    <div className={`card fade-up-${delay}`} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="card-title">{label}</span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color={color} strokeWidth={2.2} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
          {value}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  )
}

function RiskBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 99, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>
    </div>
  )
}

function RecentRow({ txn, i }) {
  const risk = txn.risk_level
  const colors = { HIGH: 'var(--high)', MEDIUM: 'var(--med)', LOW: '#16a34a' }
  const ts = new Date(txn.timestamp)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40px 1fr 90px 80px 80px',
      gap: 12,
      alignItems: 'center',
      padding: '11px 16px',
      borderRadius: 8,
      background: i % 2 === 0 ? 'transparent' : 'var(--surface-2)',
      transition: 'background 0.15s',
      animation: `slideIn 0.3s ${i * 0.04}s both`,
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-light)'}
    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--surface-2)'}
    >
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.72rem', color: 'var(--text-3)' }}>
        #{txn.user_id}
      </span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
        {ts.toLocaleDateString()} · {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-1)' }}>
        ${txn.amount.toFixed(2)}
      </span>
      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.85rem', color: colors[risk], fontWeight: 600 }}>
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
    const load = () =>
      getTransactions(30)
        .then(setTxns)
        .catch(console.error)
        .finally(() => setLoading(false))
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div className="fade-up">
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">Real-time transaction monitoring · Layer 1 detection</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Total Analyzed"  value={total}        sub="transactions"       color="var(--brand)" icon={TrendingUp}  delay={1} />
        <StatCard label="High Risk"       value={high}         sub="flagged for review" color="var(--high)"  icon={ShieldAlert} delay={2} />
        <StatCard label="Safe"            value={low}          sub="low risk"           color="#16a34a"      icon={ShieldCheck} delay={3} />
        <StatCard label="Avg Risk Score"  value={`${avgRisk}%`} sub="across all txns"  color="var(--med)"   icon={Zap}         delay={4} />
      </div>

      {/* Risk breakdown + CTA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
        <div className="card fade-up-2">
          <div className="card-title">Risk Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <RiskBar label="High risk"   value={high}   max={total} color="var(--high)" />
            <RiskBar label="Medium risk" value={medium} max={total} color="var(--med)"  />
            <RiskBar label="Low risk"    value={low}    max={total} color="#4ade80"      />
          </div>
        </div>

        <div className="card fade-up-3" style={{
          background: 'linear-gradient(135deg, var(--brand-light) 0%, #faf9ff 100%)',
          border: '1px solid var(--brand-mid)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div className="card-title" style={{ color: 'var(--brand)' }}>Run Analysis</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
              Submit a transaction and get an instant fraud probability score with signal breakdown.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setPage('analyze')} style={{ marginTop: 16 }}>
            Analyze Transaction →
          </button>
        </div>
      </div>

      {/* Recent feed */}
      <div className="card fade-up-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>Recent Transactions</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 2s infinite' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>live · 6s refresh</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
            Loading transactions...
          </div>
        ) : txns.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>No transactions yet.</p>
            <button className="btn-primary" onClick={() => setPage('analyze')} style={{ marginTop: 12 }}>
              Submit first transaction →
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 90px 80px 80px',
              gap: 12, padding: '0 16px 10px',
              borderBottom: '1px solid var(--border)',
              marginBottom: 6,
            }}>
              {['User', 'Timestamp', 'Amount', 'Risk %', 'Level'].map(h => (
                <span key={h} style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {txns.map((t, i) => <RecentRow key={t.id} txn={t} i={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}