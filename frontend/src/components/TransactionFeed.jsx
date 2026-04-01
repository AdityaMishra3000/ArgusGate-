import { useEffect, useState } from 'react'
import { getTransactions } from '../api/client'
import RiskBadge from './RiskBadge'

export default function TransactionFeed() {
  const [txns, setTxns] = useState([])

  const refresh = () =>
    getTransactions(20).then(setTxns).catch(console.error)

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)  // poll every 5s
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{
      background: '#13131a',
      border: '1px solid #2d2d3d',
      borderRadius: '12px',
      padding: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', color: '#94a3b8' }}>LIVE FEED</h2>
        <span style={{ fontSize: '12px', color: '#334155' }}>auto-refreshes every 5s</span>
      </div>

      {txns.length === 0 ? (
        <p style={{ color: '#334155', fontSize: '14px' }}>No transactions yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {txns.map(t => (
            <div key={t.id} style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 80px 90px',
              gap: '12px',
              alignItems: 'center',
              padding: '12px 14px',
              background: '#0f172a',
              borderRadius: '8px',
              fontSize: '13px',
            }}>
              <span style={{ color: '#475569' }}>#{t.user_id}</span>
              <span style={{ color: '#94a3b8' }}>
                ${t.amount.toFixed(2)}
                <span style={{ color: '#334155', marginLeft: '8px', fontSize: '11px' }}>
                  {new Date(t.timestamp).toLocaleTimeString()}
                </span>
              </span>
              <span style={{ color: t.fraud_probability > 0.75 ? '#ff6b6b' : '#94a3b8', fontWeight: 600 }}>
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