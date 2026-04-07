import { ShieldCheck, LayoutDashboard, ScanLine, Activity, FlaskConical, UserCog } from 'lucide-react'

const nav = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { id: 'analyze',   icon: ScanLine,        label: 'Analyze'    },
  { id: 'feed',      icon: Activity,        label: 'Live Feed'  },
  { id: 'simulate',  icon: FlaskConical,    label: 'Simulator'  },
  { id: 'admin',     icon: UserCog,         label: 'Admin Review', highlight: true },
]

export default function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0, width: 'var(--sidebar-w)',
      background: 'rgba(5, 5, 5, 0.4)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
      borderRight: '1px solid var(--glass-border)',
      display: 'flex', flexDirection: 'column', padding: '32px 24px', zIndex: 100,
    }}>
      <div style={{ paddingBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={24} color="var(--text-primary)" strokeWidth={1.5} />
          <div>
            <div style={{ fontWeight: 500, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>FinShield</div>
            <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>LAYER 1 · FRAUD AI</div>
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div className="section-label">Navigation</div>
        {nav.map(({ id, icon: Icon, label, highlight }) => {
          const active = page === id
          return (
            <button
              key={id} onClick={() => setPage(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                borderRadius: '8px', border: '1px solid',
                background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderColor: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: active ? 'var(--text-primary)' : highlight ? 'rgba(251,191,36,0.8)' : 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: active ? 500 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
                width: '100%', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={17} strokeWidth={active ? 2 : 1.5} />
              {label}
              {highlight && !active && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700,
                  background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: 4, padding: '1px 5px',
                }}>
                  ADMIN
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--low)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Layer 1 Online</span>
        </div>
        <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 6 }}>
          threshold · 0.819
        </div>
      </div>
    </aside>
  )
}