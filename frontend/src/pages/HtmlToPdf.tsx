import UserMenu from '../components/UserMenu'
import React, { useState, useMemo } from 'react'
import api from '../lib/axios'

const BASE = import.meta.env.MODE === 'development' ? 'http://localhost:5001/api' : 'https://web-to-pdf-v6o5.onrender.com/api'
const API = `${BASE}/convert`

const HtmlToPdfPage: React.FC = () => {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste')
  const [htmlContent, setHtmlContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<string | null>(null)
  const [inputOpen, setInputOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  interface HeaderFooterConfig {
    headerText: string
    footerText: string
    logoBase64: string
    logoMime: string
  }
  const [headerFooter, setHeaderFooter] = useState<HeaderFooterConfig>({
    headerText: '',
    footerText: '',
    logoBase64: '',
    logoMime: '',
  })

  const [options, setOptions] = useState({
    filename: '',
    format: 'A4',
    landscape: false,
    scale: 1,
    printBackground: true,
    marginTop: '80px',
    marginRight: '40px',
    marginBottom: '80px',
    marginLeft: '40px',
    displayHeaderFooter: true,
  })

  type MediaItem =
    | { type: 'img'; src: string }
    | { type: 'svg'; content: string }

  const mediaItems = useMemo((): MediaItem[] => {
    if (!htmlContent.trim()) return []
    try {
      const doc = new DOMParser().parseFromString(htmlContent, 'text/html')
      const items: MediaItem[] = []
      doc.querySelectorAll('img[src]').forEach(el => {
        const src = el.getAttribute('src') ?? ''
        if (src && !src.startsWith('javascript:')) items.push({ type: 'img', src })
      })
      doc.querySelectorAll('svg').forEach(el => {
        items.push({ type: 'svg', content: el.outerHTML })
      })
      return items
    } catch { return [] }
  }, [htmlContent])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const opt = (key: keyof typeof options, val: unknown) =>
    setOptions(prev => ({ ...prev, [key]: val as never }))

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => setHtmlContent(reader.result as string)
    reader.readAsText(file)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [meta, base64] = result.split(',')
      const mime = meta.replace('data:', '').replace(';base64', '')
      setHeaderFooter(prev => ({ ...prev, logoBase64: base64, logoMime: mime }))
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    if (!htmlContent.trim()) return showToast('Enter or upload HTML first', 'err')
    setLoading(true)
    try {
      const response = await api.post(
        `${API}/html-to-pdf`,
        { html: htmlContent, options, headerFooter },
        { responseType: 'blob', withCredentials: true }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      setPdfPreview(URL.createObjectURL(blob))
      showToast('PDF generated')
    } catch {
      showToast('PDF generation failed', 'err')
    } finally {
      setLoading(false)
    }
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
        .layout { display: flex; flex-direction: column; height: calc(100vh - 56px); overflow: hidden; }
        .controls-bar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 10px 20px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap; }
        .mode-group { display: flex; gap: 4px; }
        .btn { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; border: none; border-radius: var(--radius); padding: 8px 16px; cursor: pointer; transition: opacity 0.15s, transform 0.1s; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; flex-shrink: 0; }
        .btn:active { transform: scale(0.97); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-generate { background: var(--accent); color: #0d0d0d; }
        .btn-generate:not(:disabled):hover { opacity: 0.88; }
        .controls-divider { width: 1px; height: 24px; background: var(--border); flex-shrink: 0; }
        .btn-sm { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; border-radius: var(--radius); padding: 6px 10px; cursor: pointer; border: 1px solid var(--border); background: var(--surface2); color: var(--text); transition: all 0.15s; display: flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0; }
        .btn-sm.active { background: var(--accent); border-color: var(--accent); color: #0d0d0d; }
        .btn-sm.panel-active { border-color: var(--accent); color: var(--accent); }
        .btn-sm:not(.active):not(.panel-active):hover { border-color: var(--accent); color: var(--accent); }
        .img-count { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: var(--muted); border: 1px solid var(--border); padding: 3px 10px; border-radius: 20px; }

        /* Input panel */
        .input-panel { background: var(--surface); border-bottom: 1px solid var(--border); overflow: hidden; flex-shrink: 0; max-height: 0; transition: max-height 0.25s ease; }
        .input-panel.open { max-height: 320px; }
        .input-inner { padding: 16px 20px; }
        .html-textarea { width: 100%; height: 220px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 12px; outline: none; resize: none; transition: border-color 0.15s; line-height: 1.6; }
        .html-textarea:focus { border-color: var(--accent); }
        .html-textarea::placeholder { color: var(--muted); }
        .upload-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 220px; border: 1px dashed var(--border); border-radius: var(--radius); background: var(--surface2); cursor: pointer; transition: border-color 0.15s; }
        .upload-zone:hover { border-color: var(--accent); }
        .upload-zone input { display: none; }
        .upload-text { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: var(--muted); }
        .upload-filename { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--accent); margin-top: 8px; }

        /* Settings panel */
        .settings-panel { background: var(--surface); border-bottom: 1px solid var(--border); overflow: hidden; flex-shrink: 0; max-height: 0; transition: max-height 0.25s ease; }
        .settings-panel.open { max-height: 420px; }
        .settings-inner { padding: 16px 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0 40px; overflow-y: auto; max-height: 420px; }
        .settings-inner::-webkit-scrollbar { width: 4px; }
        .settings-inner::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        .opt-group { margin-bottom: 16px; }
        .opt-group-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
        .opt-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .opt-label { font-size: 12px; color: #ccc; }
        .opt-input { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 5px 8px; outline: none; width: 120px; transition: border-color 0.15s; }
        .opt-input:focus { border-color: var(--accent); }
        .opt-select { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 5px 8px; outline: none; width: 120px; }
        .opt-toggle { width: 36px; height: 20px; background: var(--border); border-radius: 10px; border: none; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .opt-toggle.on { background: var(--accent); }
        .opt-toggle::after { content: ''; position: absolute; width: 14px; height: 14px; background: #fff; border-radius: 50%; top: 3px; left: 3px; transition: transform 0.2s; }
        .opt-toggle.on::after { transform: translateX(16px); }

        /* Main area */
        .preview-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); }
        .status-bar { flex-shrink: 0; height: 32px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 16px; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 0.08em; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); display: inline-block; flex-shrink: 0; }
        .status-dot.active { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
        .preview-iframe { width: 100%; height: 100%; border: none; display: block; flex: 1; }
        .img-grid { width: 100%; height: 100%; overflow-y: auto; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; align-content: start; }
        .img-grid::-webkit-scrollbar { width: 4px; }
        .img-grid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        .img-card { aspect-ratio: 4/3; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--surface2); transition: border-color 0.15s; }
        .img-card:hover { border-color: var(--accent); }
        .img-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .svg-wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 12px; }
        .svg-wrap svg { max-width: 100%; max-height: 100%; }
        .empty-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; user-select: none; }
        .empty-main-title { font-size: 20px; font-weight: 800; color: var(--muted); margin-bottom: 6px; letter-spacing: -0.02em; }
        .empty-main-sub { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #333; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 16px; height: 16px; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
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
            <a className="nav-link active" href="/htmltopdf">HTML → PDF</a>
            <a className="nav-link" href="/webtoimg">URL → Image</a>
          </nav>
          <UserMenu />
        </header>

        <div className="layout">
          {/* Controls bar */}
          <div className="controls-bar">
            <div className="mode-group">
              <button
                className={`btn-sm ${mode === 'paste' ? 'active' : ''}`}
                onClick={() => setMode('paste')}
              >
                ⌨ Paste
              </button>
              <button
                className={`btn-sm ${mode === 'upload' ? 'active' : ''}`}
                onClick={() => setMode('upload')}
              >
                ↑ Upload
              </button>
            </div>

            <div className="controls-divider" />

            <button className="btn btn-generate" onClick={handleGenerate} disabled={loading}>
              {loading ? <span className="spinner" /> : '↓'}
              {loading ? 'Generating...' : 'Export PDF'}
            </button>

            <div className="controls-divider" />

            <button
              className={`btn-sm ${inputOpen ? 'panel-active' : ''}`}
              onClick={() => setInputOpen(v => !v)}
            >
              ≡ Input
            </button>
            <button
              className={`btn-sm ${settingsOpen ? 'panel-active' : ''}`}
              onClick={() => setSettingsOpen(v => !v)}
            >
              ⚙ Settings
            </button>

            {!pdfPreview && mediaItems.length > 0 && (
              <span className="img-count">{mediaItems.length} media item{mediaItems.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Input panel */}
          <div className={`input-panel ${inputOpen ? 'open' : ''}`}>
            <div className="input-inner">
              {mode === 'paste' ? (
                <textarea
                  className="html-textarea"
                  value={htmlContent}
                  onChange={e => setHtmlContent(e.target.value)}
                  placeholder={'<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>'}
                  spellCheck={false}
                />
              ) : (
                <label className="upload-zone">
                  <input type="file" accept=".html,.htm" onChange={handleFileUpload} />
                  <div className="upload-text">Click to upload .html file</div>
                  {fileName && <div className="upload-filename">◈ {fileName}</div>}
                </label>
              )}
            </div>
          </div>

          {/* Settings panel */}
          <div className={`settings-panel ${settingsOpen ? 'open' : ''}`}>
            <div className="settings-inner">
              <div>
                <div className="opt-group">
                  <div className="opt-group-label">Output</div>
                  <div className="opt-row">
                    <span className="opt-label">Filename</span>
                    <input className="opt-input" value={options.filename} onChange={e => opt('filename', e.target.value)} placeholder="auto" />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Format</span>
                    <select className="opt-select" value={options.format} onChange={e => opt('format', e.target.value)}>
                      {['A4','A3','A5','Letter','Legal'].map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Scale</span>
                    <input className="opt-input" type="number" min={0.1} max={2} step={0.1} value={options.scale} onChange={e => opt('scale', parseFloat(e.target.value))} />
                  </div>
                </div>
                <div className="opt-group">
                  <div className="opt-group-label">Layout</div>
                  <div className="opt-row">
                    <span className="opt-label">Landscape</span>
                    <button className={`opt-toggle ${options.landscape ? 'on' : ''}`} onClick={() => opt('landscape', !options.landscape)} />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Print BG</span>
                    <button className={`opt-toggle ${options.printBackground ? 'on' : ''}`} onClick={() => opt('printBackground', !options.printBackground)} />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Header/Footer</span>
                    <button className={`opt-toggle ${options.displayHeaderFooter ? 'on' : ''}`} onClick={() => opt('displayHeaderFooter', !options.displayHeaderFooter)} />
                  </div>
                </div>
                <div className="opt-group">
                  <div className="opt-group-label">Margins</div>
                  {(['marginTop','marginRight','marginBottom','marginLeft'] as const).map(k => (
                    <div className="opt-row" key={k}>
                      <span className="opt-label">{k.replace('margin', '')}</span>
                      <input className="opt-input" value={options[k]} onChange={e => opt(k, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="opt-group">
                  <div className="opt-group-label">Header / Footer</div>
                  <div className="opt-row">
                    <span className="opt-label">Header text</span>
                    <input className="opt-input" value={headerFooter.headerText} onChange={e => setHeaderFooter(p => ({ ...p, headerText: e.target.value }))} placeholder="text..." />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Footer text</span>
                    <input className="opt-input" value={headerFooter.footerText} onChange={e => setHeaderFooter(p => ({ ...p, footerText: e.target.value }))} placeholder="text..." />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Logo</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {headerFooter.logoBase64 && (
                        <img src={`data:${headerFooter.logoMime};base64,${headerFooter.logoBase64}`} style={{ height: 24, objectFit: 'contain', borderRadius: 2 }} />
                      )}
                      <label style={{ cursor: 'pointer' }}>
                        <span className="btn-sm" style={{ pointerEvents: 'none' }}>{headerFooter.logoBase64 ? '↺ Change' : '↑ Upload'}</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                      </label>
                      {headerFooter.logoBase64 && (
                        <button className="btn-sm" onClick={() => setHeaderFooter(p => ({ ...p, logoBase64: '', logoMime: '' }))}>× Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main area */}
          <div className="preview-area">
            {pdfPreview && (
              <div className="status-bar">
                <span className="status-dot active" />
                PDF OUTPUT
              </div>
            )}

            {pdfPreview ? (
              <iframe src={pdfPreview} className="preview-iframe" title="PDF Preview" />
            ) : mediaItems.length > 0 ? (
              <div className="img-grid">
                {mediaItems.map((item, i) => (
                  <div className="img-card" key={i}>
                    {item.type === 'img'
                      ? <img src={item.src} alt="" loading="lazy" />
                      : <div className="svg-wrap" dangerouslySetInnerHTML={{ __html: item.content }} />
                    }
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-main">
                <div className="empty-main-title">Nothing generated</div>
                <div className="empty-main-sub">Paste or upload HTML, then press Export PDF</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}

export default HtmlToPdfPage
