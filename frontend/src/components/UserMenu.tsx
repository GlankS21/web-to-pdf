import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '../stores/useAuthStore'

const UserMenu: React.FC = () => {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <a
          href="/signin"
          style={{
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
            letterSpacing: '0.08em', color: 'var(--muted)', textDecoration: 'none',
            padding: '6px 12px', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
        >
          Sign in
        </a>
        <a
          href="/signup"
          style={{
            fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700,
            letterSpacing: '0.08em', color: '#0d0d0d', textDecoration: 'none',
            padding: '6px 12px', borderRadius: 'var(--radius)',
            background: 'var(--accent)', transition: 'opacity 0.15s',
          }}
        >
          Sign up
        </a>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: open ? 'var(--surface2)' : 'transparent',
          border: '1px solid', borderColor: open ? 'var(--border)' : 'transparent',
          borderRadius: 'var(--radius)', padding: '5px 10px',
          cursor: 'pointer', transition: 'all 0.15s', color: 'var(--text)',
          fontFamily: 'JetBrains Mono, monospace',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' } }}
      >
        {/* Avatar */}
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--accent)', color: '#0d0d0d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {user.username[0].toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 500 }}>{(user as any).firstName || user.username}</span>
        <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, minWidth: 180, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 999,
        }}>
          {/* User info */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
              {(user as any).firstName ? `${(user as any).firstName} ${(user as any).lastName || ''}`.trim() : user.username}
            </div>
            <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: 'var(--muted)' }}>
              signed in
            </div>
          </div>

          {/* Menu items */}
          {[
            { label: '⊞ History', action: () => { navigate('/history'); setOpen(false) } },
          ].map(item => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                width: '100%', display: 'block', padding: '10px 14px',
                background: 'none', border: 'none', textAlign: 'left',
                color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12, cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {item.label}
            </button>
          ))}

          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={signOut}
              style={{
                width: '100%', display: 'block', padding: '10px 14px',
                background: 'none', border: 'none', textAlign: 'left',
                color: 'var(--accent2)', fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12, cursor: 'pointer', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,71,71,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              ⊗ Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu