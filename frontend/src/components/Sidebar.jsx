import { ShieldCheck, LayoutDashboard, ScanLine, Activity } from 'lucide-react'

const nav = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'analyze',   icon: ScanLine,        label: 'Analyze'   },
  { id: 'feed',      icon: Activity,        label: 'Live Feed' },
]

export default function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: 'var(--sidebar-w)',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '4px 12px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--brand)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(139,108,247,0.4)',
          }}>
            <ShieldCheck size={18} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em', color: 'var(--text-1)' }}>
              FinShield
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', letterSpacing: '0.05em', marginTop: 1 }}>
              LAYER 1 · FRAUD AI
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="section-label" style={{ padding: '0 12px' }}>Navigation</div>
        {nav.map(({ id, icon: Icon, label }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                borderRadius: 8, border: 'none',
                background: active ? 'var(--brand-light)' : 'transparent',
                color: active ? 'var(--brand)' : 'var(--text-2)',
                fontFamily: 'Sora, sans-serif',
                fontSize: '0.88rem',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
              {active && (
                <div style={{
                  marginLeft: 'auto', width: 6, height: 6,
                  borderRadius: '50%', background: 'var(--brand)',
                }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 6px #4ade80',
            animation: 'pulse-dot 2s infinite',
          }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Model online</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 6, fontFamily: 'DM Mono, monospace' }}>
          threshold · 0.819
        </div>
      </div>
    </aside>
  )
}