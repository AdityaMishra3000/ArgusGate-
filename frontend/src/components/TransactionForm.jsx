import { useState } from 'react'
import { predictTransaction } from '../api/client'

export default function TransactionForm({ onResult }) {
  const [form, setForm] = useState({
    user_id: 1,
    amount: '',
    lat: '',
    lon: '',
    timestamp: new Date().toISOString().slice(0, 16),
  })
  const [loading, setLoading] = useState(false)

  const handle = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async () => {
    setLoading(true)
    try {
      const result = await predictTransaction({
        ...form,
        user_id: parseInt(form.user_id),
        amount:  parseFloat(form.amount),
        lat:     parseFloat(form.lat),
        lon:     parseFloat(form.lon),
        timestamp: new Date(form.timestamp).toISOString(),
      })
      onResult(result)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error')
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '12px 16px',
    color: '#f8fafc',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    transition: 'all 0.2s',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
  }

  return (
    <div style={{
      background: 'rgba(20, 20, 28, 0.4)',
      backdropFilter: 'blur(24px) saturate(150%)',
      WebkitBackdropFilter: 'blur(24px) saturate(150%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '28px',
    }}>
      <h2 style={{ marginBottom: '24px', fontSize: '14px', color: '#94a3b8', letterSpacing: '0.05em', fontWeight: 600 }}>
        SUBMIT TRANSACTION
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {[
          { name: 'user_id',   label: 'User ID',    type: 'number' },
          { name: 'amount',    label: 'Amount ($)',  type: 'number' },
          { name: 'lat',       label: 'Latitude',   type: 'number' },
          { name: 'lon',       label: 'Longitude',  type: 'number' },
        ].map(({ name, label, type }) => (
          <div key={name}>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              {label}
            </label>
            <input
              name={name} type={type} value={form[name]}
              onChange={handle} style={fieldStyle}
              placeholder={name === 'user_id' ? '0–499' : ''}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)'
                e.target.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.2), inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
            />
          </div>
        ))}

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            Timestamp
          </label>
          <input
            name="timestamp" type="datetime-local"
            value={form.timestamp} onChange={handle} style={fieldStyle}
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        style={{
          marginTop: '28px',
          width: '100%',
          padding: '16px',
          // Here's the magic 3D neon button CSS
          background: loading ? 'rgba(255,255,255,0.05)' : 'linear-gradient(180deg, rgba(52, 211, 153, 0.9) 0%, rgba(16, 185, 129, 0.95) 100%)',
          border: loading ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(16, 185, 129, 0.8)',
          borderRadius: '14px',
          color: loading ? '#64748b' : '#ffffff',
          fontWeight: 700,
          fontSize: '15px',
          letterSpacing: '0.02em',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: loading 
            ? 'none' 
            : '0 12px 24px rgba(16, 185, 129, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 0 rgba(0, 0, 0, 0.2)',
          textShadow: loading ? 'none' : '0 2px 4px rgba(0,0,0,0.2)'
        }}
        onMouseDown={e => {
          if(!loading) e.currentTarget.style.transform = 'translateY(2px)'
        }}
        onMouseUp={e => {
          if(!loading) e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        {loading ? 'Analyzing...' : 'Run Detection →'}
      </button>
    </div>
  )
}