import UserMenu from '../components/UserMenu'
import React, { useState, useCallback, useEffect } from 'react'
import api from '../lib/axios'

const API = 'http://localhost:5001/api/convert'

const WebToImagePage: React.FC = () => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [activeTab, setActiveTab] = useState<'page' | 'options'>('page')

  const [options, setOptions] = useState({
    filename: '',
    format: 'png' as 'png' | 'jpeg' | 'webp',
    fullPage: true,
    width: 1600,
    height: 900,
    quality: 90,
  })

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const opt = (key: keyof typeof options, val: unknown) =>
    setOptions(prev => ({ ...prev, [key]: val as never }))

  const handleCapture = async () => {
    if (!url) return showToast('Enter a URL first', 'err')
    setLoading(true)
    setImageUrl(null)
    try {
      const response = await api.post(
        `${API}/url-to-image`,
        { url, options },
        { responseType: 'blob', withCredentials: true }
      )
      const blob = new Blob([response.data], { type: `image/${options.format}` })
      setImageBlob(blob)
      setImageUrl(URL.createObjectURL(blob))
      showToast('Image captured')
    } catch {
      showToast('Capture failed', 'err')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!imageBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(imageBlob)
    a.download = options.filename || `screenshot.${options.format}`
    a.click()
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
        .header-badge { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--muted); border: 1px solid var(--border); padding: 3px 10px; border-radius: 20px; }
        .layout { display: grid; grid-template-columns: 340px 1fr; height: calc(100vh - 56px); overflow: hidden; }
        .sidebar { border-right: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; overflow: hidden; }
        .url-section { padding: 20px; border-bottom: 1px solid var(--border); }
        .url-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; }
        .url-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 10px 12px; outline: none; transition: border-color 0.15s; }
        .url-input:focus { border-color: var(--accent); }
        .url-input::placeholder { color: var(--muted); }
        .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
        .btn { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; border: none; border-radius: var(--radius); padding: 10px 0; cursor: pointer; transition: opacity 0.15s, transform 0.1s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn:active { transform: scale(0.97); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-capture { background: var(--accent); color: #0d0d0d; }
        .btn-capture:not(:disabled):hover { opacity: 0.88; }
        .btn-download { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
        .btn-download:not(:disabled):hover { border-color: var(--accent); color: var(--accent); }
        .tabs { display: flex; border-bottom: 1px solid var(--border); }
        .tab { flex: 1; padding: 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; border: none; background: none; color: var(--muted); border-bottom: 2px solid transparent; transition: all 0.15s; font-family: 'Syne', sans-serif; }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
        .panel { flex: 1; overflow-y: auto; padding: 16px 20px; }
        .panel::-webkit-scrollbar { width: 4px; }
        .panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        .opt-group { margin-bottom: 20px; }
        .opt-group-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
        .opt-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .opt-label { font-size: 12px; color: #ccc; }
        .opt-input { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 5px 8px; outline: none; width: 120px; transition: border-color 0.15s; }
        .opt-input:focus { border-color: var(--accent); }
        .opt-select { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 5px 8px; outline: none; width: 120px; }
        .opt-toggle { width: 36px; height: 20px; background: var(--border); border-radius: 10px; border: none; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .opt-toggle.on { background: var(--accent); }
        .opt-toggle::after { content: ''; position: absolute; width: 14px; height: 14px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: transform 0.2s; }
        .opt-toggle.on::after { transform: translateX(16px); }
        .main { display: flex; flex-direction: column; overflow: hidden; background: var(--bg); }
        .main-header { border-bottom: 1px solid var(--border); padding: 0 24px; height: 44px; display: flex; align-items: center; justify-content: space-between; background: var(--surface); flex-shrink: 0; }
        .main-title { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--muted); letter-spacing: 0.08em; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); display: inline-block; margin-right: 8px; }
        .status-dot.active { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
        .main-body { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--bg); }
        .image-preview { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
        .empty-main { text-align: center; user-select: none; }
        .empty-main-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.2; }
        .empty-main-title { font-size: 20px; font-weight: 800; color: var(--muted); margin-bottom: 6px; letter-spacing: -0.02em; }
        .empty-main-sub { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #333; }
        .info-row { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--muted); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 14px; height: 14px; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
        @keyframes slideUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); padding: 10px 20px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; animation: slideUp 0.2s ease; z-index: 9999; pointer-events: none; }
        .toast.ok { background: var(--accent); color: #0d0d0d; }
        .toast.err { background: var(--accent2); color: #fff; }
      `}</style>

      <div className="root">
        <header className="header">
          <a href="/" className="header-logo">CONVERT WEBPAGE</a>
          <nav className="nav">
            <a className="nav-link" href="/">URL → PDF</a>
            <a className="nav-link" href="/htmltopdf">HTML → PDF</a>
            <a className="nav-link active" href="/webtoimg">URL → Image</a>
          </nav>
          <UserMenu />
        </header>

        <div className="layout">
          <aside className="sidebar">
            <div className="url-section">
              <div className="url-label">Target URL</div>
              <input
                className="url-input"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCapture()}
                spellCheck={false}
              />
              <div className="actions">
                <button className="btn btn-capture" onClick={handleCapture} disabled={loading}>
                  {loading ? <span className="spinner" /> : '⊡'}
                  {loading ? 'Capturing...' : 'Capture'}
                </button>
                <button className="btn btn-download" onClick={handleDownload} disabled={!imageUrl}>
                  ↓ Download
                </button>
              </div>
            </div>

            <div className="tabs">
              <button className={`tab ${activeTab === 'page' ? 'active' : ''}`} onClick={() => setActiveTab('page')}>Info</button>
              <button className={`tab ${activeTab === 'options' ? 'active' : ''}`} onClick={() => setActiveTab('options')}>Options</button>
            </div>

            {activeTab === 'page' && (
              <div className="panel">
                {imageUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="info-row">◈ Format: {options.format.toUpperCase()}</div>
                    <div className="info-row">◈ Viewport: {options.width}×{options.height}px</div>
                    <div className="info-row">◈ Full page: {options.fullPage ? 'yes' : 'no'}</div>
                    {options.format !== 'png' && <div className="info-row">◈ Quality: {options.quality}%</div>}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: '24px 0', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.7 }}>
                    — enter URL and capture —
                  </div>
                )}
              </div>
            )}

            {activeTab === 'options' && (
              <div className="panel">
                <div className="opt-group">
                  <div className="opt-group-label">Output</div>
                  <div className="opt-row">
                    <span className="opt-label">Filename</span>
                    <input className="opt-input" value={options.filename} onChange={e => opt('filename', e.target.value)} placeholder="auto" />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Format</span>
                    <select className="opt-select" value={options.format} onChange={e => opt('format', e.target.value)}>
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                      <option value="webp">WEBP</option>
                    </select>
                  </div>
                  {options.format !== 'png' && (
                    <div className="opt-row">
                      <span className="opt-label">Quality</span>
                      <input className="opt-input" type="number" min={1} max={100} value={options.quality} onChange={e => opt('quality', parseInt(e.target.value))} />
                    </div>
                  )}
                </div>

                <div className="opt-group">
                  <div className="opt-group-label">Viewport</div>
                  <div className="opt-row">
                    <span className="opt-label">Width</span>
                    <input className="opt-input" type="number" value={options.width} onChange={e => opt('width', parseInt(e.target.value))} />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Height</span>
                    <input className="opt-input" type="number" value={options.height} onChange={e => opt('height', parseInt(e.target.value))} />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Full page</span>
                    <button className={`opt-toggle ${options.fullPage ? 'on' : ''}`} onClick={() => opt('fullPage', !options.fullPage)} />
                  </div>
                </div>
              </div>
            )}
          </aside>

          <main className="main">
            <div className="main-header">
              <span className="main-title">
                <span className={`status-dot ${imageUrl ? 'active' : ''}`} />
                {imageUrl ? 'IMAGE OUTPUT' : 'IDLE'}
              </span>
              {imageUrl && (
                <span className="info-row">{options.format.toUpperCase()}</span>
              )}
            </div>
            <div className="main-body">
              {imageUrl ? (
                <img src={imageUrl} className="image-preview" alt="Screenshot" />
              ) : (
                <div className="empty-main">
                  <div className="empty-main-icon">⊡</div>
                  <div className="empty-main-title">Nothing captured</div>
                  <div className="empty-main-sub">Enter a URL and press Capture</div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}

export default WebToImagePage