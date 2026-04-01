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

  const field = {
    background: '#13131a',
    border: '1px solid #2d2d3d',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#e2e8f0',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  }

  return (
    <div style={{
      background: '#13131a',
      border: '1px solid #2d2d3d',
      borderRadius: '12px',
      padding: '24px',
    }}>
      <h2 style={{ marginBottom: '20px', fontSize: '15px', color: '#94a3b8' }}>
        SUBMIT TRANSACTION
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { name: 'user_id',   label: 'User ID',    type: 'number' },
          { name: 'amount',    label: 'Amount ($)',  type: 'number' },
          { name: 'lat',       label: 'Latitude',   type: 'number' },
          { name: 'lon',       label: 'Longitude',  type: 'number' },
        ].map(({ name, label, type }) => (
          <div key={name}>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
              {label}
            </label>
            <input
              name={name} type={type} value={form[name]}
              onChange={handle} style={field}
              placeholder={name === 'user_id' ? '0–499' : ''}
            />
          </div>
        ))}

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
            Timestamp
          </label>
          <input
            name="timestamp" type="datetime-local"
            value={form.timestamp} onChange={handle} style={field}
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        style={{
          marginTop: '16px',
          width: '100%',
          padding: '12px',
          background: loading ? '#1e293b' : '#6366f1',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontWeight: 600,
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {loading ? 'Analyzing...' : 'Run Detection →'}
      </button>
    </div>
  )
}