import { useState } from 'react'
import { predictTransaction } from '../api/client'
import { AlertTriangle, CheckCircle } from 'lucide-react'

function ResultPanel({ result }) {
  if (!result) return null
  const prob = (result.fraud_probability * 100).toFixed(1)
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Subtle color wash based on risk */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: `var(--${result.risk_level.toLowerCase()})` }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="section-label">Evaluation Result</div>
            <div style={{ fontSize: '3.5rem', fontWeight: 400, color: 'var(--text-primary)', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {prob}<span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>%</span>
            </div>
          </div>
          <span className={`badge badge-${result.risk_level}`}>{result.risk_level} RISK</span>
        </div>
        
        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '8px' }}>
          {result.fraud_predicted ? <AlertTriangle size={16} color="var(--high)" /> : <CheckCircle size={16} color="var(--low)" />}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {result.fraud_predicted ? 'Action Required: Transaction Flagged' : 'Cleared: No anomaly detected'}
          </span>
        </div>
      </div>

      <div className="glass-panel">
        <div className="panel-header">Metadata & Signals</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="section-label">Raw Data</div>
            {[
              ['Target ID',    `#${result.user_id}`],
              ['Raw Score',    result.fraud_probability.toFixed(6)],
              ['Model Thresh', result.threshold_used.toFixed(6)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{k}</span>
                <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="section-label">Primary Vectors</div>
            {result.top_signals.map((s, i) => (
              <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{i+1}.</span> {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Analyze({ onResult, lastResult }) {
  const [form, setForm] = useState({ user_id: '', amount: '', lat: '', lon: '', timestamp: new Date().toISOString().slice(0, 16) })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setLoading(true)
    try {
      const result = await predictTransaction({
        user_id: parseInt(form.user_id), amount: parseFloat(form.amount), lat: parseFloat(form.lat), lon: parseFloat(form.lon), timestamp: new Date(form.timestamp).toISOString(),
      })
      onResult(result)
    } catch (e) { alert('Error processing request') } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h1 className="page-title">Analyzer</h1>
        <p className="page-sub">Direct parameter injection</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
        <div className="glass-panel">
          <div className="panel-header">Parameters</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="input-group">
              <label className="input-label">User ID</label>
              <input className="input-field" type="number" placeholder="0 - 499" value={form.user_id} onChange={e => set('user_id', e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Amount (USD)</label>
              <input className="input-field" type="number" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-group">
                <label className="input-label">Latitude</label>
                <input className="input-field" type="number" value={form.lat} onChange={e => set('lat', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Longitude</label>
                <input className="input-field" type="number" value={form.lon} onChange={e => set('lon', e.target.value)} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Timestamp</label>
              <input className="input-field" type="datetime-local" value={form.timestamp} onChange={e => set('timestamp', e.target.value)} />
            </div>

            <button className="btn-primary" onClick={submit} disabled={loading} style={{ marginTop: '16px' }}>
              {loading ? 'Executing...' : 'Execute Model'}
            </button>
          </div>
        </div>

        <div>
          {!lastResult && !loading && (
            <div className="glass-panel" style={{ borderStyle: 'dashed', textAlign: 'center', padding: '64px 24px' }}>
              <p className="mono" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                // Awaiting input parameters
              </p>
            </div>
          )}
          {lastResult && <ResultPanel result={lastResult} />}
        </div>
      </div>
    </div>
  )
}