import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '../stores/useAuthStore'
import api from '../lib/axios'
import UserMenu from '../components/UserMenu'

const API = import.meta.env.MODE === 'development' ? 'http://localhost:5001/api' : 'https://web-to-pdf-1.onrender.com/api'

interface HistoryItem {
  _id: string
  type: 'url-to-pdf' | 'html-to-pdf' | 'url-to-image'
  filename: string
  sourceUrl?: string
  createdAt: string
  downloadUrl: string
}

const TYPE_LABEL: Record<HistoryItem['type'], string> = {
  'url-to-pdf': 'URL → PDF',
  'html-to-pdf': 'HTML → PDF',
  'url-to-image': 'URL → Image',
}

const TYPE_COLOR: Record<HistoryItem['type'], string> = {
  'url-to-pdf': '#e8ff47',
  'html-to-pdf': '#47c8ff',
  'url-to-image': '#ff47c8',
}

const HistoryPage: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | HistoryItem['type']>('all')

  useEffect(() => {
    if (!user) { navigate('/signin'); return }
    fetchHistory()
  }, [user])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`${API}/history`, { withCredentials: true })
      setItems(data)
    } catch {
      setError('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (item: HistoryItem) => {
    try {
      const response = await api.get(`${API}/history/${item._id}/download`, { responseType: 'blob', withCredentials: true })
      const blob = new Blob([response.data])
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = item.filename
      a.click()
    } catch {
      alert('Download failed')
    }
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
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
        .root { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'Syne', sans-serif; display: grid; grid-template-rows: auto 1fr; }
        .header { border-bottom: 1px solid var(--border); padding: 0 32px; display: flex; align-items: center; justify-content: space-between; height: 56px; background: var(--surface); }
        .header-logo { font-size: 13px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--accent); font-family: 'JetBrains Mono', monospace; text-decoration: none; }
        .nav { display: flex; align-items: center; gap: 2px; }
        .nav-link { font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 500; letter-spacing: 0.08em; color: var(--muted); text-decoration: none; padding: 6px 12px; border-radius: var(--radius); transition: all 0.15s; border: 1px solid transparent; }
        .nav-link:hover { color: var(--text); }
        .nav-link.active { color: var(--accent); border-color: var(--border); background: var(--surface2); }
        .body { padding: 40px 48px; max-width: 1100px; margin: 0 auto; width: 100%; }
        .page-title { font-size: 32px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; }
        .page-sub { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--muted); margin-bottom: 32px; }
        .filters { display: flex; gap: 6px; margin-bottom: 24px; }
        .filter-btn { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 500; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: none; color: var(--muted); cursor: pointer; transition: all 0.15s; }
        .filter-btn:hover { color: var(--text); }
        .filter-btn.active { background: var(--surface2); border-color: var(--accent); color: var(--accent); }
        .table { width: 100%; border-collapse: collapse; }
        .table thead tr { border-bottom: 1px solid var(--border); }
        .table th { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); padding: 0 16px 12px; text-align: left; font-weight: 500; }
        .table tbody tr { border-bottom: 1px solid var(--border); transition: background 0.1s; }
        .table tbody tr:hover { background: var(--surface); }
        .table td { padding: 14px 16px; font-size: 13px; vertical-align: middle; }
        .type-badge { display: inline-flex; align-items: center; gap: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 3px 8px; border-radius: 3px; background: var(--surface2); border: 1px solid var(--border); }
        .type-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .filename { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text); }
        .source-url { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .date { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); }
        .dl-btn { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; border: 1px solid var(--border); background: none; color: var(--text); padding: 6px 12px; border-radius: var(--radius); cursor: pointer; transition: all 0.15s; }
        .dl-btn:hover { border-color: var(--accent); color: var(--accent); }
        .empty { text-align: center; padding: 80px 0; }
        .empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.2; }
        .empty-title { font-size: 18px; font-weight: 800; color: var(--muted); margin-bottom: 6px; }
        .empty-sub { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #333; }
        .error { background: rgba(255,71,71,0.1); border: 1px solid rgba(255,71,71,0.3); border-radius: var(--radius); padding: 12px 16px; font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--accent2); margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
        .retry-btn { background: none; border: 1px solid var(--accent2); color: var(--accent2); font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 4px 10px; border-radius: var(--radius); cursor: pointer; }
        @keyframes pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }
        .skeleton { height: 52px; background: var(--surface); border-radius: var(--radius); margin-bottom: 1px; animation: pulse 1.2s infinite; }
      `}</style>

      <div className="root">
        <header className="header">
          <a href="/" className="header-logo">CONVERT WEBPAGE</a>
          <nav className="nav">
            <a className="nav-link" href="/">URL → PDF</a>
            <a className="nav-link" href="/htmltopdf">HTML → PDF</a>
            <a className="nav-link" href="/webtoimg">URL → Image</a>
          </nav>
          <UserMenu />
        </header>

        <div className="body">
          <div className="page-title">History</div>
          <div className="page-sub">— all your converted files</div>

          {error && (
            <div className="error">
              ⚠ {error}
              <button className="retry-btn" onClick={fetchHistory}>Retry</button>
            </div>
          )}

          <div className="filters">
            {(['all', 'url-to-pdf', 'html-to-pdf', 'url-to-image'] as const).map(f => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : TYPE_LABEL[f]}
              </button>
            ))}
          </div>

          {loading ? (
            <div>{[...Array(5)].map((_, i) => <div key={i} className="skeleton" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">⊞</div>
              <div className="empty-title">No conversions yet</div>
              <div className="empty-sub">
                {filter === 'all' ? 'Start converting to see your history here' : `No ${TYPE_LABEL[filter]} conversions`}
              </div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Filename</th>
                  <th>Source</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item._id}>
                    <td>
                      <span className="type-badge">
                        <span className="type-dot" style={{ background: TYPE_COLOR[item.type] }} />
                        {TYPE_LABEL[item.type]}
                      </span>
                    </td>
                    <td><span className="filename">{item.filename}</span></td>
                    <td>
                      {item.sourceUrl ? (
                        <span className="source-url" title={item.sourceUrl}>{item.sourceUrl}</span>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>—</span>
                      )}
                    </td>
                    <td><span className="date">{formatDate(item.createdAt)}</span></td>
                    <td>
                      <button className="dl-btn" onClick={() => handleDownload(item)}>↓ Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}

export default HistoryPage