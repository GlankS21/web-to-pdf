import React, { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'

const API = 'http://localhost:5001/api/convert'

const ConvertPage: React.FC = () => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState<'preview' | 'pdf' | null>(null)
  const [pdfPreview, setPdfPreview] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [blockedSelectors, setBlockedSelectors] = useState<string[]>([])
  const [isBlockMode, setIsBlockMode] = useState(false)
  const [suggestedSelectors, setSuggestedSelectors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'page' | 'options'>('page')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [headerFooter, setHeaderFooter] = useState({
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
    acceptCookies: true,
    removeHeader: false,
    removeFooter: false,
  })

  /* ── Toast ── */
  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  /* ── Selector generator ── */
  // doc: the iframe's document — needed to correctly detect root boundary
  const generateSelector = (el: HTMLElement, doc: Document): string => {
    const parts: string[] = []
    let node: HTMLElement | null = el

    while (node !== null && node !== doc.body && node !== doc.documentElement) {
      // id is unique — stop here
      if (node.id) {
        parts.unshift('#' + CSS.escape(node.id))
        break
      }

      const par = node.parentElement as HTMLElement | null
      if (!par) break

      // Pure positional selector — immune to class name collisions
      const index = Array.from(par.children).indexOf(node) + 1
      parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${index})`)

      node = par
    }

    return parts.join(' > ')
  }

  /* ── Fetch suggested selectors ── */
  const fetchSuggestions = useCallback(async (inputUrl: string) => {
    if (!inputUrl.startsWith('http')) return
    try {
      const { data } = await axios.get(`${API}/selectors/suggest`, {
        params: { url: inputUrl },
        withCredentials: true,
      })
      if (data.selectors?.length) setSuggestedSelectors(data.selectors)
    } catch {}

    // Load saved header/footer config for this URL pattern
    try {
      const { data } = await axios.get(`${API}/header-footer/suggest`, {
        params: { url: inputUrl },
        withCredentials: true,
      })
      if (data.config) setHeaderFooter(data.config)
    } catch {}
  }, [])

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions(url), 600)
    return () => clearTimeout(t)
  }, [url, fetchSuggestions])

  /* ── Sync blockedSelectors → customCSS ── */
  useEffect(() => {
    if (!blockedSelectors.length) return
    // customCSS is derived, no extra state needed — sent as-is on PDF call
  }, [blockedSelectors])

  /* ── Block mode listeners ── */
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
        // Pass iframe's doc so the while-loop stops at the correct root
        let sel = generateSelector(t, doc)
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

  /* ── Load Preview ── */
  const handleLoadPreview = async () => {
    if (!url) return showToast('Enter a URL first', 'err')
    setLoading('preview')
    setPdfPreview(null)
    setBlockedSelectors([])
    setIsBlockMode(false)

    try {
      const { data } = await axios.post(`${API}/preview`, { url })
      const htmlRes = await axios.get(`${API}/preview/${data.previewId}`)
      setPreviewHtml(htmlRes.data)
      setActiveTab('page')
      showToast('Preview loaded')
    } catch {
      showToast('Failed to load preview', 'err')
    } finally {
      setLoading(null)
    }
  }

  /* ── Generate PDF ── */
  const handleGeneratePdf = async () => {
    if (!url) return showToast('Enter a URL first', 'err')
    setLoading('pdf')

    const customCSS = blockedSelectors.map(s => `${s} { display: none !important; }`).join('\n')

    try {
      const response = await axios.post(
        `${API}/url-to-pdf`,
        { url, options: { ...options, customCSS }, blockedSelectors, headerFooter },
        { responseType: 'blob', withCredentials: true }
      )
      const blob = new Blob([response.data], { type: 'application/pdf' })
      setPdfPreview(URL.createObjectURL(blob))
      setPreviewHtml(null)
      showToast('PDF generated')
    } catch {
      showToast('PDF generation failed', 'err')
    } finally {
      setLoading(null)
    }
  }

  /* ── Undo / Reset ── */
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

  const applySuggested = () => {
    setBlockedSelectors(prev => [...new Set([...prev, ...suggestedSelectors])])
    setSuggestedSelectors([])
    showToast(`Applied ${suggestedSelectors.length} saved selectors`)
  }

  const opt = (key: keyof typeof options, val: any) => setOptions(prev => ({ ...prev, [key]: val }))

  /* ── Logo upload ── */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // result = "data:image/png;base64,XXXX"
      const [meta, base64] = result.split(',')
      const mime = meta.replace('data:', '').replace(';base64', '')
      setHeaderFooter(prev => ({ ...prev, logoBase64: base64, logoMime: mime }))
    }
    reader.readAsDataURL(file)
  }

  /* ── UI ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0d0d0d;
          --surface: #161616;
          --surface2: #1f1f1f;
          --border: #2a2a2a;
          --accent: #e8ff47;
          --accent2: #ff4747;
          --text: #f0f0f0;
          --muted: #666;
          --radius: 4px;
        }

        body { background: var(--bg); }

        .root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Syne', sans-serif;
          display: grid;
          grid-template-rows: auto 1fr;
        }

        /* Header */
        .header {
          border-bottom: 1px solid var(--border);
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          background: var(--surface);
        }
        .header-logo {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--accent);
          font-family: 'JetBrains Mono', monospace;
        }
        .header-badge {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--muted);
          border: 1px solid var(--border);
          padding: 3px 10px;
          border-radius: 20px;
        }

        /* Layout */
        .layout {
          display: grid;
          grid-template-columns: 340px 1fr;
          height: calc(100vh - 56px);
          overflow: hidden;
        }

        /* Sidebar */
        .sidebar {
          border-right: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .url-section {
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }
        .url-label {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .url-input-wrap {
          position: relative;
        }
        .url-input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.15s;
        }
        .url-input:focus { border-color: var(--accent); }
        .url-input::placeholder { color: var(--muted); }

        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }
        .btn {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: none;
          border-radius: var(--radius);
          padding: 10px 0;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .btn:active { transform: scale(0.97); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-preview { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
        .btn-preview:not(:disabled):hover { border-color: var(--accent); color: var(--accent); }
        .btn-pdf { background: var(--accent); color: #0d0d0d; }
        .btn-pdf:not(:disabled):hover { opacity: 0.88; }

        /* Tabs */
        .tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
        }
        .tab {
          flex: 1;
          padding: 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          border: none;
          background: none;
          color: var(--muted);
          border-bottom: 2px solid transparent;
          transition: all 0.15s;
          font-family: 'Syne', sans-serif;
        }
        .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

        /* Scrollable panel */
        .panel { flex: 1; overflow-y: auto; padding: 16px 20px; }
        .panel::-webkit-scrollbar { width: 4px; }
        .panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        /* Suggestion banner */
        .suggestion-banner {
          background: rgba(232,255,71,0.07);
          border: 1px solid rgba(232,255,71,0.3);
          border-radius: var(--radius);
          padding: 10px 12px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .suggestion-text { font-size: 11px; color: var(--accent); font-family: 'JetBrains Mono', monospace; line-height: 1.4; }
        .btn-apply {
          background: var(--accent);
          color: #0d0d0d;
          border: none;
          border-radius: var(--radius);
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 700;
          font-family: 'Syne', sans-serif;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* Block controls */
        .block-controls {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .btn-sm {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-radius: var(--radius);
          padding: 6px 10px;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--surface2);
          color: var(--text);
          transition: all 0.15s;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn-sm:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn-sm.active { background: var(--accent2); border-color: var(--accent2); color: #fff; }
        .btn-sm:not(.active):not(:disabled):hover { border-color: var(--accent); color: var(--accent); }

        /* Selector list */
        .selector-list { display: flex; flex-direction: column; gap: 4px; }
        .selector-item {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 7px 10px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--accent2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          word-break: break-all;
        }
        .selector-remove {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.15s;
          padding: 0 2px;
        }
        .selector-remove:hover { color: var(--accent2); }
        .empty-state {
          text-align: center;
          color: var(--muted);
          font-size: 12px;
          padding: 24px 0;
          font-family: 'JetBrains Mono', monospace;
          line-height: 1.7;
        }

        /* Options panel */
        .opt-group { margin-bottom: 20px; }
        .opt-group-label {
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.12em;
          color: var(--muted);
          text-transform: uppercase;
          margin-bottom: 10px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border);
        }
        .opt-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .opt-label { font-size: 12px; color: #ccc; }
        .opt-input {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          padding: 5px 8px;
          outline: none;
          width: 120px;
          transition: border-color 0.15s;
        }
        .opt-input:focus { border-color: var(--accent); }
        .opt-select {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          padding: 5px 8px;
          outline: none;
          width: 120px;
        }
        .opt-toggle {
          width: 36px; height: 20px;
          background: var(--border);
          border-radius: 10px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .opt-toggle.on { background: var(--accent); }
        .opt-toggle::after {
          content: '';
          position: absolute;
          width: 14px; height: 14px;
          background: #fff;
          border-radius: 50%;
          top: 3px; left: 3px;
          transition: transform 0.2s;
        }
        .opt-toggle.on::after { transform: translateX(16px); }

        /* Main content */
        .main {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg);
        }
        .main-header {
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--surface);
          flex-shrink: 0;
        }
        .main-title {
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          color: var(--muted);
          letter-spacing: 0.08em;
        }
        .status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: var(--border);
          display: inline-block;
          margin-right: 8px;
        }
        .status-dot.active { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
        .status-dot.block { background: var(--accent2); box-shadow: 0 0 6px var(--accent2); }

        .main-body {
          flex: 1;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .iframe-wrap {
          width: 100%;
          height: 100%;
          position: relative;
        }
        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
        .block-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border: 2px solid var(--accent2);
          opacity: 0.5;
        }
        .block-hint {
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--accent2);
          color: #fff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          padding: 6px 14px;
          border-radius: 20px;
          pointer-events: none;
          white-space: nowrap;
        }

        .empty-main {
          text-align: center;
          user-select: none;
        }
        .empty-main-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.2;
        }
        .empty-main-title {
          font-size: 20px;
          font-weight: 800;
          color: var(--muted);
          margin-bottom: 6px;
          letter-spacing: -0.02em;
        }
        .empty-main-sub {
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          color: #333;
        }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }

        /* Toast */
        @keyframes slideUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          animation: slideUp 0.2s ease;
          z-index: 9999;
          pointer-events: none;
        }
        .toast.ok { background: var(--accent); color: #0d0d0d; }
        .toast.err { background: var(--accent2); color: #fff; }
      `}</style>

      <div className="root">
        {/* Header */}
        <header className="header">
          <span className="header-logo">⬛ PDF.FORGE</span>
          <span className="header-badge">v2.0 · URL → PDF</span>
        </header>

        <div className="layout">
          {/* ── Sidebar ── */}
          <aside className="sidebar">
            {/* URL input */}
            <div className="url-section">
              <div className="url-label">Target URL</div>
              <div className="url-input-wrap">
                <input
                  className="url-input"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLoadPreview()}
                  placeholder="https://example.com"
                  spellCheck={false}
                />
              </div>
              <div className="actions">
                <button
                  className="btn btn-preview"
                  onClick={handleLoadPreview}
                  disabled={!!loading}
                >
                  {loading === 'preview' ? <span className="spinner" /> : '⊞'}
                  Preview
                </button>
                <button
                  className="btn btn-pdf"
                  onClick={handleGeneratePdf}
                  disabled={!!loading}
                >
                  {loading === 'pdf' ? <span className="spinner" /> : '↓'}
                  Export PDF
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button className={`tab ${activeTab === 'page' ? 'active' : ''}`} onClick={() => setActiveTab('page')}>
                Page
              </button>
              <button className={`tab ${activeTab === 'options' ? 'active' : ''}`} onClick={() => setActiveTab('options')}>
                Options
              </button>
            </div>

            {/* Panel: Page */}
            {activeTab === 'page' && (
              <div className="panel">
                {/* Suggestion banner */}
                {suggestedSelectors.length > 0 && (
                  <div className="suggestion-banner">
                    <div className="suggestion-text">
                      ◈ {suggestedSelectors.length} saved selector{suggestedSelectors.length > 1 ? 's' : ''} found for this URL pattern
                    </div>
                    <button className="btn-apply" onClick={applySuggested}>Apply</button>
                  </div>
                )}

                {/* Block controls */}
                {previewHtml && (
                  <div className="block-controls">
                    <button
                      className={`btn-sm ${isBlockMode ? 'active' : ''}`}
                      onClick={() => setIsBlockMode(v => !v)}
                    >
                      {isBlockMode ? '◉ Blocking' : '○ Block Mode'}
                    </button>
                    <button className="btn-sm" onClick={handleUndo} disabled={!blockedSelectors.length}>
                      ↩ Undo
                    </button>
                    <button className="btn-sm" onClick={handleReset} disabled={!blockedSelectors.length}>
                      ⊘ Reset
                    </button>
                  </div>
                )}

                {/* Selector list */}
                {blockedSelectors.length > 0 ? (
                  <div className="selector-list">
                    {blockedSelectors.map((sel, i) => (
                      <div className="selector-item" key={i}>
                        <span>{sel}</span>
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
                ) : (
                  <div className="empty-state">
                    {previewHtml
                      ? '— no elements blocked —\nEnable block mode\nand click elements to hide'
                      : '— load a preview first —'}
                  </div>
                )}
              </div>
            )}

            {/* Panel: Options */}
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

                <div className="opt-group">
                  <div className="opt-group-label">Behaviour</div>
                  <div className="opt-row">
                    <span className="opt-label">Accept Cookies</span>
                    <button className={`opt-toggle ${options.acceptCookies ? 'on' : ''}`} onClick={() => opt('acceptCookies', !options.acceptCookies)} />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Remove Header</span>
                    <button className={`opt-toggle ${options.removeHeader ? 'on' : ''}`} onClick={() => opt('removeHeader', !options.removeHeader)} />
                  </div>
                  <div className="opt-row">
                    <span className="opt-label">Remove Footer</span>
                    <button className={`opt-toggle ${options.removeFooter ? 'on' : ''}`} onClick={() => opt('removeFooter', !options.removeFooter)} />
                  </div>
                </div>

                <div className="opt-group">
                  <div className="opt-group-label">Header / Footer</div>

                  <div className="opt-row">
                    <span className="opt-label">Header text</span>
                    <input
                      className="opt-input"
                      value={headerFooter.headerText}
                      onChange={e => setHeaderFooter(prev => ({ ...prev, headerText: e.target.value }))}
                      placeholder="Company name..."
                    />
                  </div>

                  <div className="opt-row">
                    <span className="opt-label">Footer text</span>
                    <input
                      className="opt-input"
                      value={headerFooter.footerText}
                      onChange={e => setHeaderFooter(prev => ({ ...prev, footerText: e.target.value }))}
                      placeholder="Confidential..."
                    />
                  </div>

                  <div className="opt-row">
                    <span className="opt-label">Logo</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {headerFooter.logoBase64 && (
                        <img
                          src={`data:${headerFooter.logoMime};base64,${headerFooter.logoBase64}`}
                          style={{ height: 24, objectFit: 'contain', borderRadius: 2 }}
                        />
                      )}
                      <label style={{ cursor: 'pointer' }}>
                        <span className="btn-sm" style={{ pointerEvents: 'none' }}>
                          {headerFooter.logoBase64 ? '↺ Change' : '↑ Upload'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {headerFooter.logoBase64 && (
                        <button
                          className="btn-sm"
                          onClick={() => setHeaderFooter(prev => ({ ...prev, logoBase64: '', logoMime: '' }))}
                        >
                          × Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* ── Main ── */}
          <main className="main">
            <div className="main-header">
              <span className="main-title">
                <span className={`status-dot ${previewHtml ? (isBlockMode ? 'block' : 'active') : pdfPreview ? 'active' : ''}`} />
                {previewHtml
                  ? isBlockMode ? 'BLOCK MODE — click elements to hide' : 'PREVIEW'
                  : pdfPreview ? 'PDF OUTPUT' : 'IDLE'}
              </span>
              {blockedSelectors.length > 0 && (
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--accent2)' }}>
                  {blockedSelectors.length} hidden
                </span>
              )}
            </div>

            <div className="main-body">
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
                    title="Preview"
                  />
                </div>
              ) : pdfPreview ? (
                <iframe src={pdfPreview} className="preview-iframe" title="PDF Preview" />
              ) : (
                <div className="empty-main">
                  <div className="empty-main-icon">⬛</div>
                  <div className="empty-main-title">Nothing loaded</div>
                  <div className="empty-main-sub">Enter a URL and press Preview</div>
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

export default ConvertPage