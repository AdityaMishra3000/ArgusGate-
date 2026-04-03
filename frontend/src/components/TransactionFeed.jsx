import { useEffect, useState } from 'react'
import { getTransactions } from '../api/client'
import RiskBadge from './RiskBadge'

export default function TransactionFeed() {
  const [txns, setTxns] = useState([])

  const refresh = () =>
    getTransactions(20).then(setTxns).catch(console.error)

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      background: 'rgba(20, 20, 28, 0.4)',
      backdropFilter: 'blur(24px) saturate(150%)',
      WebkitBackdropFilter: 'blur(24px) saturate(150%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
      borderRadius: '20px',
      padding: '28px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '14px', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: 600 }}>LIVE FEED</h2>
        <span style={{ fontSize: '12px', color: '#64748b', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '999px' }}>
          auto-refreshes every 5s
        </span>
      </div>

      {txns.length === 0 ? (
        <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Listening for transactions...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {txns.map(t => (
            <div key={t.id} style={{
              display: 'grid',
              gridTemplateColumns: '70px 1fr 80px 90px',
              gap: '16px',
              alignItems: 'center',
              padding: '14px 18px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              fontSize: '13px',
              transition: 'transform 0.2s ease, background 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)' }}
            >
              <span style={{ color: '#64748b', fontFamily: 'DM Mono, monospace' }}>#{t.user_id}</span>
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>
                ${t.amount.toFixed(2)}
                <span style={{ color: '#64748b', marginLeft: '12px', fontSize: '11px' }}>
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
              </span>
              <span style={{ 
                color: t.fraud_probability > 0.75 ? '#ff6b6b' : '#94a3b8', 
                fontWeight: 700,
                textShadow: t.fraud_probability > 0.75 ? '0 0 10px rgba(255, 107, 107, 0.5)' : 'none'
              }}>
                {(t.fraud_probability * 100).toFixed(0)}%
              </span>
              <RiskBadge level={t.risk_level} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}