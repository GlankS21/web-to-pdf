import UserMenu from '../components/UserMenu'
import React, { useState, useRef, useEffect } from 'react'
import api from '../lib/axios'

const BASE = import.meta.env.MODE === 'development' ? 'http://localhost:5001/api' : 'https://web-to-pdf-1.onrender.com/api'
const API = `${BASE}/convert`

const WebToImagePage: React.FC = () => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState<'preview' | 'capture' | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [blockedSelectors, setBlockedSelectors] = useState<string[]>([])
  const [isBlockMode, setIsBlockMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [options, setOptions] = useState({
    filename: '',
    format: 'png' as 'png' | 'jpeg' | 'webp',
    quality: 90,
    fullPage: true,
    width: 1600,
    height: 900,
  })

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const opt = (key: keyof typeof options, val: unknown) => {
    setOptions(prev => ({ ...prev, [key]: val as never }))
  }

  const generateSelector = (el: HTMLElement, doc: Document): string => {
    const parts: string[] = []
    let node: HTMLElement | null = el
    while (node !== null && node !== doc.body && node !== doc.documentElement) {
      // Prefer id — most stable
      if (node.id) { parts.unshift('#' + CSS.escape(node.id)); break }

      // Prefer a stable class combination that uniquely identifies the element
      const stableClasses = Array.from(node.classList).filter(c =>
        c.length > 2 && !/^(is-|has-|js-|active|hover|focus|open|visible|hidden|loading|selected|checked|disabled)/.test(c)
      )
      if (stableClasses.length > 0) {
        const classSel = node.tagName.toLowerCase() + '.' + stableClasses.map(c => CSS.escape(c)).join('.')
        if (doc.querySelectorAll(classSel).length === 1) {
          parts.unshift(classSel)
          break
        }
      }

      // Fall back to data attribute if present
      const dataKey = Array.from(node.attributes).find(a => a.name.startsWith('data-') && a.value && a.value.length < 60)
      if (dataKey) {
        const dataSel = `[${dataKey.name}="${CSS.escape(dataKey.value)}"]`
        if (doc.querySelectorAll(dataSel).length === 1) {
          parts.unshift(dataSel)
          break
        }
      }

      // Last resort: positional (least stable across static vs JS-rendered DOM)
      const par = node.parentElement as HTMLElement | null
      if (!par) break
      const index = Array.from(par.children).indexOf(node) + 1
      parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${index})`)
      node = par
    }
    return parts.join(' > ')
  }

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !previewHtml) return

    const setup = () => {
      const doc = iframe.contentDocument
      if (!doc) return

      const onMove = (e: MouseEvent) => {
        if (!isBlockMode) return
        const t = e.target as HTMLElement
        doc.querySelectorAll('.iframe-hover-highlight').forEach(el => el.classList.remove('iframe-hover-highlight'))
        if (t !== doc.body && t !== doc.documentElement) t.classList.add('iframe-hover-highlight')
      }

      const onClick = (e: MouseEvent) => {
        if (!isBlockMode) return
        e.preventDefault()
        e.stopPropagation()
        const t = e.target as HTMLElement
        if (!doc) return
        const sel = generateSelector(t, doc)
        setBlockedSelectors(prev => [...new Set([...prev, sel])])
        t.classList.remove('iframe-hover-highlight')
        t.classList.add('iframe-blocked')
      }

      doc.addEventListener('mousemove', onMove)
      doc.addEventListener('click', onClick, true)
      return () => {
        doc.removeEventListener('mousemove', onMove)
        doc.removeEventListener('click', onClick, true)
      }
    }

    if (iframe.contentDocument?.readyState === 'complete') return setup()
    else { iframe.onload = setup }
  }, [previewHtml, isBlockMode])

  const handleLoadPreview = async () => {
    if (!url) return showToast('Enter a URL first', 'err')
    setLoading('preview')
    setImageUrl(null)
    setImageBlob(null)
    setPreviewHtml(null)
    setBlockedSelectors([])
    setIsBlockMode(false)
    setLogs([])

    try {
      const { data } = await api.post(`${API}/preview`, { url, mobile: true })
      if (data.logs) setLogs(data.logs)
      if (data.previewId) {
        const htmlRes = await api.get(`${API}/preview/${data.previewId}`)
        setPreviewHtml(htmlRes.data)
        showToast('Preview loaded')
      }
    } catch (e: any) {
      const logs = e.response?.data?.logs
      if (logs) setLogs(logs)
      showToast(e.response?.data?.message || 'Failed to load preview', 'err')
    } finally {
      setLoading(null)
    }
  }

  const handleCapture = async () => {
    if (!url) return showToast('Enter a URL first', 'err')
    setLoading('capture')
    try {
      let body: Record<string, unknown>

      if (previewHtml && iframeRef.current) {
        // Preview path — screenshot the preview HTML (same as html-to-pdf approach)
        const iframeDoc = iframeRef.current.contentDocument
        if (iframeDoc) {
          iframeDoc.querySelectorAll('.iframe-blocked').forEach((el) => {
            ;(el as HTMLElement).style.setProperty('display', 'none', 'important')
            el.classList.remove('iframe-blocked')
          })
          iframeDoc.getElementById('BLOCKER_STYLES_INJECTED')?.remove()
        }
        const liveHtml = '<!DOCTYPE html>\n' + (iframeDoc?.documentElement.outerHTML ?? '')
        body = { url, html: liveHtml, options: { ...options, mobile: true }, blockedSelectors }
      } else {
        // Direct capture — desktop view, backend handles auto-blocking
        body = { url, options: { ...options, mobile: false }, blockedSelectors }
      }

      const response = await api.post(
        `${API}/url-to-image`,
        body,
        { responseType: 'blob', withCredentials: true }
      )
      const blob = new Blob([response.data], { type: `image/${options.format}` })
      setImageBlob(blob)
      setImageUrl(URL.createObjectURL(blob))
      setPreviewHtml(null)
      showToast('Image captured')
    } catch {
      showToast('Capture failed', 'err')
    } finally {
      setLoading(null)
    }
  }

  const handleDownload = () => {
    if (!imageBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(imageBlob)
    a.download = options.filename || `screenshot.${options.format}`
    a.click()
  }

  const handleUndo = () => {
    if (!blockedSelectors.length) return
    const last = blockedSelectors[blockedSelectors.length - 1]
    setBlockedSelectors(prev => prev.slice(0, -1))
    iframeRef.current?.contentDocument?.querySelector(last)?.classList.remove('iframe-blocked')
  }

  const handleReset = () => {
    iframeRef.current?.contentDocument?.querySelectorAll('.iframe-blocked').forEach(el => el.classList.remove('iframe-blocked'))
    setBlockedSelectors([])
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
        .url-label { font-size: 10px; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.12em; color: var(--muted); text-transform: uppercase; white-space: nowrap; }
        .url-input { flex: 1; min-width: 200px; max-width: 600px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px; padding: 8px 12px; outline: none; transition: border-color 0.15s; }
        .url-input:focus { border-color: var(--accent); }
        .url-input::placeholder { color: var(--muted); }
        .btn { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; border: none; border-radius: var(--radius); padding: 8px 16px; cursor: pointer; transition: opacity 0.15s, transform 0.1s; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; flex-shrink: 0; }
        .btn:active { transform: scale(0.97); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-preview { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
        .btn-preview:not(:disabled):hover { border-color: var(--accent); color: var(--accent); }
        .btn-capture { background: var(--accent); color: #0d0d0d; }
        .btn-capture:not(:disabled):hover { opacity: 0.88; }
        .btn-download { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
        .btn-download:hover { border-color: var(--accent); color: var(--accent); }
        .controls-divider { width: 1px; height: 24px; background: var(--border); flex-shrink: 0; }
        .block-controls { display: flex; gap: 6px; align-items: center; }
        .btn-sm { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; border-radius: var(--radius); padding: 6px 10px; cursor: pointer; border: 1px solid var(--border); background: var(--surface2); color: var(--text); transition: all 0.15s; display: flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0; }
        .btn-sm:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn-sm.active { background: var(--accent2); border-color: var(--accent2); color: #fff; }
        .btn-sm:not(.active):not(:disabled):hover { border-color: var(--accent); color: var(--accent); }
        .settings-panel { background: var(--surface); border-bottom: 1px solid var(--border); overflow: hidden; flex-shrink: 0; max-height: 0; transition: max-height 0.25s ease; }
        .settings-panel.open { max-height: 300px; }
        .settings-inner { padding: 16px 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0 40px; overflow-y: auto; max-height: 300px; }
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
        .selector-strip { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 20px; display: flex; flex-wrap: nowrap; gap: 6px; align-items: center; flex-shrink: 0; height: 36px; overflow-x: auto; overflow-y: hidden; }
        .selector-strip::-webkit-scrollbar { height: 3px; }
        .selector-strip::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        .selector-item { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); padding: 4px 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--accent2); display: flex; align-items: center; gap: 6px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .selector-remove { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 14px; line-height: 1; flex-shrink: 0; transition: color 0.15s; padding: 0; }
        .selector-remove:hover { color: var(--accent2); }
        .preview-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); }
        .status-bar { flex-shrink: 0; height: 32px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 16px; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); letter-spacing: 0.08em; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--border); display: inline-block; flex-shrink: 0; }
        .status-dot.active { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
        .status-dot.block { background: var(--accent2); box-shadow: 0 0 6px var(--accent2); }
        .iframe-wrap { flex: 1; position: relative; overflow: hidden; }
        .preview-iframe { width: 100%; height: 100%; border: none; display: block; }
        .block-overlay { position: absolute; inset: 0; pointer-events: none; border: 2px solid var(--accent2); opacity: 0.5; }
        .block-hint { position: absolute; top: 44px; left: 50%; transform: translateX(-50%); background: var(--accent2); color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 6px 14px; border-radius: 20px; pointer-events: none; white-space: nowrap; z-index: 11; }
        .image-wrap { flex: 1; overflow: auto; display: flex; align-items: flex-start; justify-content: center; padding: 20px; }
        .image-preview { max-width: 100%; display: block; border: 1px solid var(--border); }
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
            <a className="nav-link" href="/htmltopdf">HTML → PDF</a>
            <a className="nav-link active" href="/webtoimg">URL → Image</a>
          </nav>
          <UserMenu />
        </header>

        <div className="layout">
          {/* Controls bar */}
          <div className="controls-bar">
            <span className="url-label">URL</span>
            <input
              className="url-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLoadPreview()}
              placeholder="https://..."
              spellCheck={false}
            />
            <button className="btn btn-preview" onClick={handleLoadPreview} disabled={!!loading}>
              {loading === 'preview' ? <span className="spinner" /> : '⊞'}
              Edit Image
            </button>
            <button className="btn btn-capture" onClick={handleCapture} disabled={!!loading}>
              {loading === 'capture' ? <span className="spinner" /> : '⊡'}
              Capture
            </button>
            {imageUrl && (
              <button className="btn btn-download" onClick={handleDownload}>
                ↓ Download
              </button>
            )}

            <div className="controls-divider" />

            <button
              className={`btn-sm ${settingsOpen ? 'active' : ''}`}
              onClick={() => setSettingsOpen(v => !v)}
            >
              ⚙ Settings
            </button>

            {previewHtml && (
              <>
                <div className="controls-divider" />
                <div className="block-controls">
                  <button
                    className={`btn-sm ${isBlockMode ? 'active' : ''}`}
                    onClick={() => setIsBlockMode(v => !v)}
                  >
                    {isBlockMode ? '◉ Blocking' : '○ Block'}
                  </button>
                  <button className="btn-sm" onClick={handleUndo} disabled={!blockedSelectors.length}>↩ Undo</button>
                  <button className="btn-sm" onClick={handleReset} disabled={!blockedSelectors.length}>⊘ Reset</button>
                  {blockedSelectors.length > 0 && (
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--accent2)', marginLeft: 4 }}>
                      {blockedSelectors.length} hidden
                    </span>
                  )}
                </div>
              </>
            )}
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
              </div>
              <div>
                <div className="opt-group">
                  <div className="opt-group-label">Viewport (direct capture only)</div>
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
            </div>
          </div>

          {/* Selector chips strip */}
          {blockedSelectors.length > 0 && (
            <div className="selector-strip">
              {blockedSelectors.map((sel, i) => (
                <div className="selector-item" key={i}>
                  <span title={sel}>{sel}</span>
                  <button
                    className="selector-remove"
                    onClick={() => {
                      iframeRef.current?.contentDocument?.querySelector(sel)?.classList.remove('iframe-blocked')
                      setBlockedSelectors(prev => prev.filter((_, j) => j !== i))
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Preview area */}
          <div className="preview-area">
            {(previewHtml || imageUrl || loading === 'preview') && (
              <div className="status-bar">
                <span className={`status-dot ${loading === 'preview' ? 'active' : previewHtml ? (isBlockMode ? 'block' : 'active') : 'active'}`} />
                {loading === 'preview'
                  ? (logs.length > 0 ? logs[logs.length - 1] : 'Connecting...')
                  : previewHtml
                    ? isBlockMode ? 'BLOCK MODE — click elements to hide' : 'PREVIEW'
                    : `IMAGE OUTPUT — ${options.format.toUpperCase()}`}
              </div>
            )}

            {previewHtml ? (
              <div className="iframe-wrap">
                {isBlockMode && (
                  <>
                    <div className="block-overlay" />
                    <div className="block-hint">◉ Click any element to hide it</div>
                  </>
                )}
                <iframe
                  ref={iframeRef}
                  srcDoc={previewHtml}
                  sandbox="allow-same-origin"
                  className="preview-iframe"
                  style={{ width: '480px', margin: '0 auto', display: 'block' }}
                  title="Preview"
                />
              </div>
            ) : imageUrl ? (
              <div className="image-wrap">
                <img src={imageUrl} className="image-preview" alt="Screenshot" />
              </div>
            ) : (
              <div className="empty-main">
                <div className="empty-main-title">Nothing captured</div>
                <div className="empty-main-sub">Enter a URL and press Preview or Capture</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}

export default WebToImagePage
