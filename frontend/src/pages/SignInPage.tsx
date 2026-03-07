import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '../stores/useAuthStore'

const SignInPage: React.FC = () => {
  const { signIn, loading: authLoading } = useAuthStore()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!form.username || !form.password) return setError('Fill in all fields')
    setError(null)
    await signIn(form.username, form.password)
    // store handles error toast internally — navigate only if user is set
    const { user } = useAuthStore.getState()
    if (user) navigate('/')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0d0d0d; --surface: #161616; --surface2: #1f1f1f;
          --border: #2a2a2a; --accent: #e8ff47; --accent2: #ff4747;
          --text: #f0f0f0; --muted: #666; --radius: 4px;
        }
        body { background: var(--bg); }

        .auth-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Syne', sans-serif;
          display: flex;
          flex-direction: column;
        }
        .auth-header {
          border-bottom: 1px solid var(--border);
          padding: 0 32px;
          display: flex;
          align-items: center;
          height: 56px;
          background: var(--surface);
        }
        .auth-logo {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--accent);
          font-family: 'JetBrains Mono', monospace;
          text-decoration: none;
        }
        .auth-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 40px;
        }
        .auth-title {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 4px;
        }
        .auth-sub {
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--muted);
          margin-bottom: 32px;
        }
        .auth-field { margin-bottom: 16px; }
        .auth-label {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 6px;
          display: block;
        }
        .auth-input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.15s;
        }
        .auth-input:focus { border-color: var(--accent); }
        .auth-input::placeholder { color: var(--muted); }
        .auth-error {
          background: rgba(255,71,71,0.1);
          border: 1px solid rgba(255,71,71,0.3);
          border-radius: var(--radius);
          padding: 10px 12px;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--accent2);
          margin-bottom: 16px;
        }
        .auth-btn {
          width: 100%;
          background: var(--accent);
          color: #0d0d0d;
          border: none;
          border-radius: var(--radius);
          padding: 12px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }
        .auth-btn:active { transform: scale(0.98); }
        .auth-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .auth-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--muted);
        }
        .auth-footer a { color: var(--accent); text-decoration: none; }
        .auth-footer a:hover { text-decoration: underline; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }
      `}</style>

      <div className="auth-root">
        <header className="auth-header">
          <a href="/" className="auth-logo">CONVERT WEBPAGE</a>
        </header>

        <div className="auth-body">
          <div className="auth-card">
            <div className="auth-title">Sign in</div>
            <div className="auth-sub">— enter your credentials to continue</div>

            {error && <div className="auth-error">⚠ {error}</div>}

            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input
                className="auth-input"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                spellCheck={false}
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button className="auth-btn" onClick={handleSubmit} disabled={authLoading}>
              {authLoading ? <span className="spinner" /> : '→'}
              {authLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="auth-footer">
              No account? <a href="/signup">Sign up</a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SignInPage