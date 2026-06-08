import { useRef, useState, useCallback, useEffect } from 'react'
import { toPng } from 'html-to-image'
import { changeDpiDataUrl } from 'changedpi'
import { getCardFontEmbedCSS } from './utils/fontEmbed'
import { useCardState } from './hooks/useCardState'
import { CardEditor } from './components/CardEditor'
import { CardPreview } from './components/CardPreview'
import { MarkdownModal, type EditorFace } from './components/MarkdownModal'
import { HowItWorks } from './components/HowItWorks'
import './styles/editor.css'
import './styles/card.css'
import './styles/brand.css'

// Vite's base path: "/" when self-hosted, "/cardsworth/" on GitHub Pages.
// Always ends in a slash. Components below route on logical paths ("/",
// "/how-it-works"); these helpers translate to/from the real URL under BASE.
const BASE = import.meta.env.BASE_URL

function appPath(pathname: string): string {
  const p = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname
  return '/' + p.replace(/^\/+/, '')
}

function toUrl(logical: string): string {
  return BASE + logical.replace(/^\/+/, '')
}

// Print geometry. All four download targets (front, back, both overlays) are a
// standard card wide: 2.5in (63.5mm). Rendering to 2.5in × 300dpi = 750px wide
// and tagging the PNG as 300 DPI makes it print at true physical size — matching
// the server's /api/render output, without needing a server.
const CARD_WIDTH_IN = 2.5
const PRINT_DPI = 300

function App() {
  const { state, updateState } = useCardState()
  const [maskMode, setMaskMode] = useState(false)
  const [editorFace, setEditorFace] = useState<EditorFace>(null)
  // Minimal client-side routing: editor at "/", tutorial at "/how-it-works".
  // The card state lives here in App, so it survives navigating to the
  // tutorial and back without a full reload.
  const [path, setPath] = useState(() => appPath(window.location.pathname))
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const overlayFrontRef = useRef<HTMLDivElement>(null)
  const overlayBackRef = useRef<HTMLDivElement>(null)

  const downloadCard = useCallback(async (
    element: HTMLDivElement | null,
    filename: string
  ) => {
    if (!element) return

    // Make sure the bundled web fonts are loaded before capture, otherwise the
    // card could be rasterized with fallback fonts.
    if (document.fonts?.ready) await document.fonts.ready

    // Supply the card fonts inlined as data URLs. This bypasses html-to-image's
    // own stylesheet scan, which crashes in Firefox ("font is undefined") on
    // certain @font-face rules, and guarantees the fonts render in the sandboxed
    // SVG-to-PNG rasterization (which has no access to the page's loaded fonts).
    const fontEmbedCSS = await getCardFontEmbedCSS()

    // Capture a clone in a detached, zoom-free host rather than the live element.
    // The preview sits under `.preview-card-wrapper { zoom: 1.5 }`, and
    // html-to-image inlines the element's *computed* style (read from the live,
    // zoomed node) onto its clone. Firefox and Chrome fold that ancestor zoom
    // into the computed px `font-size` differently than into the card's mm-based
    // `width`, so on Firefox the text comes out oversized. Cloning into a host
    // with no zoom ancestor makes both engines read the true unzoomed styles.
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:-100000px;top:0;zoom:1'
    const clone = element.cloneNode(true) as HTMLDivElement
    host.appendChild(clone)
    document.body.appendChild(host)

    try {
      // Render via html-to-image (SVG <foreignObject>), which uses the browser's
      // real layout engine — so text, kerning and wrapping match the on-screen
      // preview and the server's /api/render output. (html2canvas reimplements
      // text layout and mangled web-font spacing.) Base the scale on the clone's
      // unzoomed width to land at exactly 750px wide = 2.5in @ 300 DPI.
      const pixelRatio = (CARD_WIDTH_IN * PRINT_DPI) / clone.offsetWidth
      const dataUrl = await toPng(clone, { pixelRatio, fontEmbedCSS })

      // Stamp the PNG as 300 DPI so print software sizes it physically (not 96 DPI).
      const link = document.createElement('a')
      link.download = filename
      link.href = changeDpiDataUrl(dataUrl, PRINT_DPI)
      link.click()
    } finally {
      document.body.removeChild(host)
    }
  }, [])

  const handleDownloadFront = useCallback(() => {
    const title = state.title || 'card'
    downloadCard(frontRef.current, `${title}-front.png`)
  }, [state.title, downloadCard])

  const handleDownloadBack = useCallback(() => {
    const title = state.title || 'card'
    downloadCard(backRef.current, `${title}-back.png`)
  }, [state.title, downloadCard])

  const handleDownloadOverlayFront = useCallback(() => {
    const title = state.title || 'card'
    downloadCard(overlayFrontRef.current, `${title}-front-overlay.png`)
  }, [state.title, downloadCard])

  const handleDownloadOverlayBack = useCallback(() => {
    const title = state.title || 'card'
    downloadCard(overlayBackRef.current, `${title}-back-overlay.png`)
  }, [state.title, downloadCard])

  useEffect(() => {
    const onPop = () => setPath(appPath(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string) => {
    if (to === appPath(window.location.pathname)) return
    window.history.pushState(null, '', toUrl(to))
    setPath(to)
    window.scrollTo(0, 0)
  }, [])

  if (path === '/how-it-works') {
    return <HowItWorks onNavigate={navigate} />
  }

  return (
    <div className="app">
      <CardEditor
        card={state}
        onUpdate={updateState}
        maskMode={maskMode}
        onToggleMask={setMaskMode}
        openEditor={setEditorFace}
      />
      <MarkdownModal
        face={editorFace}
        card={state}
        onUpdate={updateState}
        onClose={(face) => setEditorFace(face ?? null)}
      />
      <CardPreview
        card={state}
        maskMode={maskMode}
        onUpdate={updateState}
        frontRef={frontRef}
        backRef={backRef}
        overlayFrontRef={overlayFrontRef}
        overlayBackRef={overlayBackRef}
        onDownloadFront={handleDownloadFront}
        onDownloadBack={handleDownloadBack}
        onDownloadOverlayFront={handleDownloadOverlayFront}
        onDownloadOverlayBack={handleDownloadOverlayBack}
        onNavigate={navigate}
      />
    </div>
  )
}

export default App
