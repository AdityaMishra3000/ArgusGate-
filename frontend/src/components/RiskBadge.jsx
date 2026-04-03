export default function RiskBadge({ level }) {
  const styles = {
    HIGH: { 
      background: 'rgba(255, 59, 59, 0.15)', 
      color: '#ff6b6b', 
      border: '1px solid rgba(255, 59, 59, 0.4)',
      boxShadow: '0 0 12px rgba(255, 59, 59, 0.4), inset 0 0 8px rgba(255, 59, 59, 0.2)'
    },
    MEDIUM: { 
      background: 'rgba(245, 158, 11, 0.15)', 
      color: '#fbbf24', 
      border: '1px solid rgba(245, 158, 11, 0.4)',
      boxShadow: '0 0 12px rgba(245, 158, 11, 0.4), inset 0 0 8px rgba(245, 158, 11, 0.2)'
    },
    LOW: { 
      background: 'rgba(16, 185, 129, 0.15)', 
      color: '#34d399', 
      border: '1px solid rgba(16, 185, 129, 0.4)',
      boxShadow: '0 0 12px rgba(16, 185, 129, 0.4), inset 0 0 8px rgba(16, 185, 129, 0.2)'
    },
  }

  return (
    <span style={{
      ...styles[level],
      padding: '4px 12px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 800,
      letterSpacing: '0.08em',
      textShadow: '0 0 8px currentColor', // Makes the text itself glow slightly
    }}>
      {level}
    </span>
  )
}