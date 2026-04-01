import { useState } from 'react'
import { predictTransaction } from '../api/client'
import { MapPin, Clock, DollarSign, User, AlertTriangle, CheckCircle, Loader } from 'lucide-react'

const QUICK_TESTS = [
  { label: '🏠 Normal', desc: 'Typical local txn',   data: { user_id: 5, amount: 42.50,   lat: 37.77, lon: -122.41, timestamp: '2024-06-15T14:30' } },
  { label: '🌍 Geo Fraud', desc: 'Far + night',     data: { user_id: 1, amount: 4500,    lat: 48.85, lon: 2.35,    timestamp: '2024-06-15T02:30' } },
  { label: '⚡ Velocity', desc: 'Burst burst burst', data: { user_id: 2, amount: 25.00,   lat: 34.05, lon: -118.2,  timestamp: '2024-06-15T11:00' } },
  { label: '💰 High Val', desc: 'Suspicious amount', data: { user_id: 3, amount: 18000,   lat: 40.71, lon: -74.00,  timestamp: '2024-06-15T03:45' } },
]

function SignalPill({ text, i }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px',
      background: 'var(--high-bg)',
      border: '1px solid var(--high-border)',
      borderRadius: 8,
      animation: `fadeUp 0.3s ${i * 0.07}s both`,
    }}>
      <AlertTriangle size={14} color="var(--high)" style={{ marginTop: 2, flexShrink: 0 }} />
      <span style={{ fontSize: '0.83rem', color: 'var(--text-1)', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

function ResultPanel({ result }) {
  if (!result) return null

  const prob     = result.fraud_probability * 100
  const isHigh   = result.risk_level === 'HIGH'
  const isMed    = result.risk_level === 'MEDIUM'
  const barColor = isHigh ? 'var(--high)' : isMed ? 'var(--med)' : '#4ade80'
  const bgColor  = isHigh ? 'var(--high-bg)' : isMed ? 'var(--med-bg)' : 'var(--low-bg)'
  const bdColor  = isHigh ? 'var(--high-border)' : isMed ? 'var(--med-border)' : 'var(--low-border)'

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Score hero */}
      <div style={{
        background: bgColor, border: `1px solid ${bdColor}`,
        borderRadius: 'var(--radius)', padding: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              Fraud Probability
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.04em', color: barColor, lineHeight: 1.1, marginTop: 4 }}>
              {prob.toFixed(1)}<span style={{ fontSize: '1.5rem' }}>%</span>
            </div>
          </div>
          <span className={`badge badge-${result.risk_level}`} style={{ fontSize: '0.78rem', padding: '5px 14px' }}>
            {result.risk_level} RISK
          </span>
        </div>

        {/* Bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ height: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${prob}%`,
              background: barColor, borderRadius: 99,
              transition: 'width 1s cubic-bezier(.4,0,.2,1)',
            }} />
          </div>
          {/* Threshold marker */}
          <div style={{
            position: 'absolute', top: -4, bottom: -4,
            left: `${result.threshold_used * 100}%`,
            width: 2, background: 'rgba(0,0,0,0.25)', borderRadius: 1,
          }} />
          <div style={{
            position: 'absolute', top: 14, fontSize: '0.65rem',
            left: `${result.threshold_used * 100}%`, transform: 'translateX(-50%)',
            color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
          }}>
            threshold {(result.threshold_used * 100).toFixed(0)}%
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 10, alignItems: 'center' }}>
          {result.fraud_predicted
            ? <AlertTriangle size={16} color="var(--high)" />
            : <CheckCircle size={16} color="#16a34a" />
          }
          <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 500 }}>
            {result.fraud_predicted
              ? 'Transaction flagged for review'
              : 'Transaction appears legitimate'
            }
          </span>
        </div>
      </div>

      {/* Signals */}
      {result.top_signals?.length > 0 && (
        <div className="card">
          <div className="card-title">Top Signals Detected</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.top_signals.map((s, i) => <SignalPill key={i} text={s} i={i} />)}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="card" style={{ background: 'var(--surface-2)' }}>
        <div className="card-title">Detection Metadata</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['User ID',    `#${result.user_id}`],
            ['Raw Score',  result.fraud_probability.toFixed(6)],
            ['Threshold',  result.threshold_used.toFixed(6)],
            ['Decision',   result.fraud_predicted ? 'FLAGGED' : 'CLEARED'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{k}</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: 'var(--text-1)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Analyze({ onResult, lastResult }) {
  const [form, setForm] = useState({
    user_id: '', amount: '', lat: '', lon: '',
    timestamp: new Date().toISOString().slice(0, 16),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const loadQuick = (data) => {
    setForm({
      user_id:   String(data.user_id),
      amount:    String(data.amount),
      lat:       String(data.lat),
      lon:       String(data.lon),
      timestamp: data.timestamp,
    })
    onResult(null)
  }

  const submit = async () => {
    setError(null)
    if (!form.user_id || !form.amount || !form.lat || !form.lon) {
      setError('Please fill all fields.')
      return
    }
    setLoading(true)
    try {
      const result = await predictTransaction({
        user_id:   parseInt(form.user_id),
        amount:    parseFloat(form.amount),
        lat:       parseFloat(form.lat),
        lon:       parseFloat(form.lon),
        timestamp: new Date(form.timestamp).toISOString(),
      })
      onResult(result)
    } catch (e) {
      setError(e.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: 'user_id',   label: 'User ID',     icon: User,       placeholder: '0 – 499',    type: 'number' },
    { key: 'amount',    label: 'Amount (USD)', icon: DollarSign, placeholder: 'e.g. 249.99', type: 'number' },
    { key: 'lat',       label: 'Latitude',     icon: MapPin,     placeholder: 'e.g. 40.71',  type: 'number' },
    { key: 'lon',       label: 'Longitude',    icon: MapPin,     placeholder: 'e.g. -74.00', type: 'number' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div className="fade-up">
        <h1 className="page-title">Analyze Transaction</h1>
        <p className="page-sub">Submit transaction details and get an instant risk assessment</p>
      </div>

      {/* Quick tests */}
      <div className="fade-up-1">
        <div className="section-label">Quick Test Scenarios</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {QUICK_TESTS.map((q) => (
            <button key={q.label} onClick={() => loadQuick(q.data)} style={{
              padding: '8px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: 'Sora, sans-serif',
              fontSize: '0.82rem',
              cursor: 'pointer',
              color: 'var(--text-2)',
              transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand-mid)'; e.currentTarget.style.background = 'var(--brand-light)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
            >
              <span style={{ fontWeight: 600 }}>{q.label}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{q.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Form */}
        <div className="card fade-up-2">
          <div className="card-title">Transaction Details</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {fields.map(({ key, label, icon: Icon, placeholder, type }) => (
                <div className="input-group" key={key}>
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon size={12} strokeWidth={2.2} color="var(--text-3)" />
                    {label}
                  </label>
                  <input
                    className="input-field"
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="input-group">
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={12} strokeWidth={2.2} color="var(--text-3)" />
                Timestamp
              </label>
              <input
                className="input-field"
                type="datetime-local"
                value={form.timestamp}
                onChange={e => set('timestamp', e.target.value)}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', background: 'var(--high-bg)',
                border: '1px solid var(--high-border)', borderRadius: 8,
                fontSize: '0.82rem', color: 'var(--high)',
              }}>
                {error}
              </div>
            )}

            <button className="btn-primary" onClick={submit} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading
                ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
                : 'Run Detection →'
              }
            </button>
          </div>
        </div>

        {/* Result */}
        <div>
          {!lastResult && !loading && (
            <div className="card fade-up-3" style={{
              background: 'var(--surface-2)', border: '1px dashed var(--border-2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 12,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--brand-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={20} color="var(--brand)" />
              </div>
              <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>
                Submit a transaction to see the detection result here.
              </p>
            </div>
          )}
          {lastResult && <ResultPanel result={lastResult} />}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}