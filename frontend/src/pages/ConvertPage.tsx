import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const ConvertPage: React.FC = () => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const [pdfPreview, setPdfPreview] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  const [blockedSelectors, setBlockedSelectors] = useState<string[]>([])
  const [isBlockMode, setIsBlockMode] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)

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
    customCSS: '',
    acceptCookies: true,
    removeHeader: false,
    removeFooter: false
  })

  /* ==============================
     Generate CSS selector
  ============================== */

  const generateSelector = (el: HTMLElement): string => {
    if (el.id) return '#' + CSS.escape(el.id)

    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter(Boolean)
      if (classes.length) {
        return '.' + classes.map(c => CSS.escape(c)).join('.')
      }
    }

    const parent = el.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        c => c.tagName === el.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1
        return `${el.tagName.toLowerCase()}:nth-of-type(${index})`
      }
    }

    return el.tagName.toLowerCase()
  }

  /* ==============================
     IFRAME BLOCK MODE FIXED
  ============================== */

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !previewHtml) return

    let iframeDoc: Document | null = null

    const setupListeners = () => {
      iframeDoc = iframe.contentDocument
      if (!iframeDoc) {
        console.log('Cannot access iframe document')
        return
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!isBlockMode) return

        const target = e.target as HTMLElement
        if (!target) return

        iframeDoc!
          .querySelectorAll('.iframe-hover-highlight')
          .forEach(el => el.classList.remove('iframe-hover-highlight'))

        if (
          target !== iframeDoc!.body &&
          target !== iframeDoc!.documentElement
        ) {
          target.classList.add('iframe-hover-highlight')
        }
      }

      const handleClick = (e: MouseEvent) => {
        if (!isBlockMode) return

        e.preventDefault()
        e.stopPropagation()

        const target = e.target as HTMLElement
        if (!target) return

        const selector = generateSelector(target)

        setBlockedSelectors(prev => [...prev, selector])

        target.classList.remove('iframe-hover-highlight')
        target.classList.add('iframe-blocked')
      }

      iframeDoc.addEventListener('mousemove', handleMouseMove)
      iframeDoc.addEventListener('click', handleClick, true)

      // Cleanup
      return () => {
        iframeDoc?.removeEventListener('mousemove', handleMouseMove)
        iframeDoc?.removeEventListener('click', handleClick, true)
      }
    }

    if (iframe.contentDocument?.readyState === 'complete') {
      return setupListeners()
    } else {
      iframe.onload = setupListeners
    }
  }, [previewHtml, isBlockMode])

  /* ==============================
     Sync blockedSelectors → customCSS
  ============================== */

  useEffect(() => {
    if (blockedSelectors.length === 0) {
      setOptions(prev => ({ ...prev, customCSS: '' }))
      return
    }

    const css = blockedSelectors
      .map(s => `${s} { display: none !important; }`)
      .join('\n')

    setOptions(prev => ({ ...prev, customCSS: css }))
  }, [blockedSelectors])

  /* ==============================
     LOAD PREVIEW
  ============================== */

  const handleLoadPreview = async () => {
    if (!url) return alert('Enter URL')

    setLoading(true)
    setPdfPreview(null)
    setBlockedSelectors([])
    setIsBlockMode(false)

    try {
      const { data } = await axios.post(
        'http://localhost:5001/api/convert/preview',
        { url }
      )

      const htmlRes = await axios.get(
        `http://localhost:5001/api/convert/preview/${data.previewId}`
      )

      setPreviewHtml(htmlRes.data)
    } catch (err) {
      console.error(err)
      alert('Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  /* ==============================
     GENERATE PDF
  ============================== */

  const handleGeneratePdf = async () => {
    if (!url) return alert('Enter URL')

    setLoading(true)

    try {
      const response = await axios.post(
        'http://localhost:5001/api/convert/url-to-pdf',
        { url, options, blockedSelectors },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], {
        type: 'application/pdf'
      })

      setPdfPreview(URL.createObjectURL(blob))
      setPreviewHtml(null)
    } catch (err) {
      console.error(err)
      alert('PDF failed')
    } finally {
      setLoading(false)
    }
  }

  /* ==============================
     UNDO / RESET
  ============================== */

  const handleUndo = () => {
    if (!blockedSelectors.length) return

    const last = blockedSelectors[blockedSelectors.length - 1]
    setBlockedSelectors(prev => prev.slice(0, -1))

    const iframeDoc = iframeRef.current?.contentDocument
    const el = iframeDoc?.querySelector(last)
    el?.classList.remove('iframe-blocked')
  }

  const handleReset = () => {
    const iframeDoc = iframeRef.current?.contentDocument
    iframeDoc
      ?.querySelectorAll('.iframe-blocked')
      .forEach(el => el.classList.remove('iframe-blocked'))

    setBlockedSelectors([])
  }

  /* ==============================
     UI
  ============================== */

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-3xl font-bold mb-8">
          URL to PDF Converter
        </h1>

        <div className="bg-white p-6 rounded shadow mb-6">

          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border rounded mb-4"
          />

          <div className="flex gap-4">
            <button
              onClick={handleLoadPreview}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded"
            >
              {loading ? 'Loading...' : 'Load Preview'}
            </button>

            <button
              onClick={handleGeneratePdf}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded"
            >
              Generate PDF
            </button>
          </div>
        </div>

        {previewHtml && (
          <div className="bg-white p-6 rounded shadow mb-6">
            <div className="flex gap-4 mb-4">

              <button
                onClick={() => setIsBlockMode(!isBlockMode)}
                className={`px-6 py-2 rounded text-white ${
                  isBlockMode ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {isBlockMode ? 'Block Mode ON' : 'Enable Block Mode'}
              </button>

              <button
                onClick={handleUndo}
                disabled={!blockedSelectors.length}
                className="px-6 py-2 bg-orange-600 text-white rounded"
              >
                Undo
              </button>

              <button
                onClick={handleReset}
                className="px-6 py-2 bg-gray-600 text-white rounded"
              >
                Reset
              </button>

              <span className="px-4 py-2 bg-gray-100 rounded">
                Blocked: {blockedSelectors.length}
              </span>
            </div>

            <iframe
              ref={iframeRef}
              srcDoc={previewHtml}
              sandbox="allow-same-origin"
              className="w-full h-[500px] border"
              title="Preview"
            />
          </div>
        )}

        {pdfPreview && (
          <div className="bg-white p-6 rounded shadow">
            <iframe
              src={pdfPreview}
              className="w-full h-[500px]"
              title="PDF Preview"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default ConvertPage