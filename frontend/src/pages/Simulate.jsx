import { useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

function PipelineColumn({ title, items, color, border, count }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: '12px', borderBottom: `2px solid ${border}`,
      }}>
        <span style={{
          fontSize: '0.75rem', fontWeight: 600,
          letterSpacing: '0.07em', textTransform: 'uppercase', color,
        }}>
          {title}
        </span>
        <span style={{
          background: `${color}20`, color,
          border: `1px solid ${border}`,
          borderRadius: 99, padding: '2px 10px',
          fontSize: '0.78rem', fontWeight: 700,
        }}>
          {count}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 200 }}>
        {items.map((t, i) => {
          const isApproved = t.status === 'auto_approved'

          return (
            <div key={t.id} style={{
              background: `${color}08`,
              border: `1px solid ${border}`,
              borderRadius: 8, padding: '12px 14px',
              animation: `fadeUp 0.3s ${i * 0.03}s both`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.72rem', color: 'var(--text-muted)',
                }}>
                  #{t.user_id}
                </span>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.78rem', fontWeight: 700, color,
                }}>
                  {(t.fraud_probability * 100).toFixed(1)}%
                </span>
              </div>

              <div style={{
                fontSize: '0.88rem', fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: isApproved ? 0 : 4,
              }}>
                ${t.amount.toFixed(2)}
              </div>

              {/* Only show signals for pending_review and auto_blocked */}
              {!isApproved && t.top_signals?.[0] && (
                <div style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                  marginTop: 4,
                }}>
                  ↳ {t.top_signals[0]}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Simulate() {
  const [n,       setN]       = useState(30)
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)
  const [txns,    setTxns]    = useState([])
  const [step,    setStep]    = useState('')

  const run = async () => {
    setRunning(true)
    setSummary(null)
    setTxns([])

    const steps = [
      'Pulling user profiles from database...',
      'Generating transaction parameters...',
      'Running Layer 1 model inference...',
      'Applying decision routing engine...',
      'Writing to audit log...',
    ]
    for (const s of steps) {
      setStep(s)
      await new Promise(r => setTimeout(r, 350))
    }

    try {
      const { data } = await api.post('/simulate', { n, fraud_mix: 0.15 })
      setSummary(data.summary)
      setTxns(data.transactions)
    } catch (e) {
      setStep('Error: ' + (e.response?.data?.detail || e.message))
    } finally {
      setRunning(false)
      setStep('')
    }
  }

  const approved = txns.filter(t => t.status === 'auto_approved')
  const pending  = txns.filter(t => t.status === 'pending_review')
  const blocked  = txns.filter(t => t.status === 'auto_blocked')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      <div>
        <h1 className="page-title">Transaction Simulator</h1>
        <p className="page-sub">
          Generate a realistic transaction batch · watch the decision engine route each one in real time
        </p>
      </div>

      {/* Controls */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Batch size</span>
            <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              {n} transactions
            </span>
          </div>
          <input
            type="range" min={10} max={100} step={5} value={n}
            onChange={e => setN(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--brand)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>10</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>100</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Expected mix (~15% fraud)</div>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Legit', pct: 85, color: '#10b981' },
              { label: 'Fraud', pct: 15, color: '#ef4444' },
            ].map(({ label, pct, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {label} {pct}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={run}
          disabled={running}
          style={{
            padding: '12px 28px',
            background: running ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
            color: running ? 'var(--text-muted)' : '#000',
            border: 'none', borderRadius: 8,
            fontFamily: 'inherit', fontSize: '0.88rem', fontWeight: 700,
            cursor: running ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
        >
          {running ? '⟳ Running...' : '▶ Run Simulation'}
        </button>
      </div>

      {/* Progress */}
      {running && (
        <div className="glass-panel" style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#f59e0b', animation: 'pulse 1s infinite',
            }} />
            <span className="mono" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {step}
            </span>
          </div>
        </div>
      )}

      {/* Summary counts */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Total Processed', value: summary.total,          color: 'var(--text-primary)' },
            { label: 'Auto Approved',   value: summary.auto_approved,  color: '#10b981' },
            { label: 'Pending Review',  value: summary.pending_review, color: '#f59e0b' },
            { label: 'Auto Blocked',    value: summary.auto_blocked,   color: '#ef4444' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-panel" style={{ textAlign: 'center', padding: '16px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 400, color, letterSpacing: '-0.03em' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pipeline columns */}
      {txns.length > 0 && (
        <div>
          <div className="section-label">Decision Pipeline</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <PipelineColumn
              title="Auto Approved" items={approved}
              color="#10b981" border="rgba(16,185,129,0.25)" count={approved.length}
            />
            <PipelineColumn
              title="Pending Review" items={pending}
              color="#f59e0b" border="rgba(245,158,11,0.25)" count={pending.length}
            />
            <PipelineColumn
              title="Auto Blocked" items={blocked}
              color="#ef4444" border="rgba(239,68,68,0.25)" count={blocked.length}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}