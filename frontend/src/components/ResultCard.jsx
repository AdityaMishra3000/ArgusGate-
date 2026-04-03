import RiskBadge from './RiskBadge'

export default function ResultCard({ result }) {
  if (!result) return null

  const prob = (result.fraud_probability * 100).toFixed(1)
  const barColor = result.risk_level === 'HIGH' ? '#ff6b6b'
                 : result.risk_level === 'MEDIUM' ? '#fbbf24' : '#34d399'

  return (
    <div style={{
      background: 'rgba(20, 20, 28, 0.4)',
      backdropFilter: 'blur(24px) saturate(150%)',
      WebkitBackdropFilter: 'blur(24px) saturate(150%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '28px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle top glare effect */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '14px', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: 600 }}>DETECTION RESULT</h2>
        <RiskBadge level={result.risk_level} />
      </div>

      {/* Probability bar */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>Fraud Probability</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: barColor, textShadow: `0 0 16px ${barColor}66` }}>
            {prob}%
          </span>
        </div>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.4)', 
          borderRadius: '999px', 
          height: '10px', 
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
        }}>
          <div style={{
            width: `${prob}%`,
            height: '100%',
            background: barColor,
            borderRadius: '999px',
            transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: `0 0 12px ${barColor}` // Glowing thumb
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>0%</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Threshold {(result.threshold_used * 100).toFixed(0)}%</span>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>100%</span>
        </div>
      </div>

      {/* Signals */}
      <div>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', letterSpacing: '0.05em', fontWeight: 600 }}>TOP SIGNALS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {result.top_signals.map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px', 
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <span style={{ color: '#fbbf24', fontSize: '16px', textShadow: '0 0 8px rgba(251, 191, 36, 0.5)' }}>⚠</span>
              <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}