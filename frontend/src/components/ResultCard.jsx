import RiskBadge from './RiskBadge'

export default function ResultCard({ result }) {
  if (!result) return null

  const prob = (result.fraud_probability * 100).toFixed(1)
  const barColor = result.risk_level === 'HIGH' ? '#ff6b6b'
                 : result.risk_level === 'MEDIUM' ? '#fbbf24' : '#34d399'

  return (
    <div style={{
      background: '#13131a',
      border: '1px solid #2d2d3d',
      borderRadius: '12px',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', color: '#94a3b8' }}>DETECTION RESULT</h2>
        <RiskBadge level={result.risk_level} />
      </div>

      {/* Probability bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Fraud Probability</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: barColor }}>{prob}%</span>
        </div>
        <div style={{ background: '#1e293b', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
          <div style={{
            width: `${prob}%`,
            height: '100%',
            background: barColor,
            borderRadius: '999px',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: '11px', color: '#334155' }}>0%</span>
          <span style={{ fontSize: '11px', color: '#334155' }}>Threshold {(result.threshold_used * 100).toFixed(0)}%</span>
          <span style={{ fontSize: '11px', color: '#334155' }}>100%</span>
        </div>
      </div>

      {/* Signals */}
      <div>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>TOP SIGNALS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {result.top_signals.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#0f172a', borderRadius: '8px', padding: '10px 14px',
            }}>
              <span style={{ color: '#f59e0b', fontSize: '16px' }}>⚠</span>
              <span style={{ fontSize: '13px', color: '#cbd5e1' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}