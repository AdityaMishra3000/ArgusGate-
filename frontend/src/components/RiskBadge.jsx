export default function RiskBadge({ level }) {
  const styles = {
    HIGH:   { background: '#ff3b3b22', color: '#ff6b6b', border: '1px solid #ff3b3b55' },
    MEDIUM: { background: '#f59e0b22', color: '#fbbf24', border: '1px solid #f59e0b55' },
    LOW:    { background: '#10b98122', color: '#34d399', border: '1px solid #10b98155' },
  }

  return (
    <span style={{
      ...styles[level],
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.05em',
    }}>
      {level}
    </span>
  )
}