import { useRef, useState, type RefObject } from 'react'
import type { CardState, MaskZone } from '../hooks/useCardState'
import { useOverflowDetection } from '../hooks/useOverflowDetection'
import { CardFront } from './CardFront'
import { CardBack } from './CardBack'
import { CardOverlay, CARD_W_MM, CARD_H_MM } from './CardOverlay'
import { HowItWorksLink } from './HowItWorksLink'

type Face = 'front' | 'back'

// Smallest zone (mm) we'll keep — guards against accidental click-without-drag.
const MIN_ZONE_MM = 2

// A drag-in-progress, stored as fractions (0–1) of the card so it is invariant
// to the preview's zoom; converted to mm only when committed.
interface Draft {
  face: Face
  left: number
  top: number
  width: number
  height: number
}

interface CardPreviewProps {
  card: CardState
  maskMode: boolean
  onUpdate: (updates: Partial<CardState>) => void
  frontRef: RefObject<HTMLDivElement>
  backRef: RefObject<HTMLDivElement>
  overlayFrontRef: RefObject<HTMLDivElement>
  overlayBackRef: RefObject<HTMLDivElement>
  onDownloadFront: () => void
  onDownloadBack: () => void
  onDownloadOverlayFront: () => void
  onDownloadOverlayBack: () => void
  onNavigate: (to: string) => void
}

const round1 = (v: number) => Math.round(v * 10) / 10
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `z-${Date.now()}-${Math.random().toString(36).slice(2)}`

export function CardPreview({
  card,
  maskMode,
  onUpdate,
  frontRef,
  backRef,
  overlayFrontRef,
  overlayBackRef,
  onDownloadFront,
  onDownloadBack,
  onDownloadOverlayFront,
  onDownloadOverlayBack,
  onNavigate,
}: CardPreviewProps) {
  const frontBodyRef = useRef<HTMLDivElement>(null)
  const backBodyRef = useRef<HTMLDivElement>(null)
  const frontOverflow = useOverflowDetection(frontBodyRef)
  const backOverflow = useOverflowDetection(backBodyRef)

  // Drag-to-draw state. dragStart holds the anchor fraction; draft is the live box.
  const dragStart = useRef<{ fx: number; fy: number } | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)

  const frontZones = card.masks.filter((z) => z.face === 'front')
  const backZones = card.masks.filter((z) => z.face === 'back')

  const fraction = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      fx: clamp01((e.clientX - r.left) / r.width),
      fy: clamp01((e.clientY - r.top) / r.height),
    }
  }

  const startDraw = (face: Face, e: React.PointerEvent<HTMLDivElement>) => {
    const { fx, fy } = fraction(e)
    dragStart.current = { fx, fy }
    setDraft({ face, left: fx, top: fy, width: 0, height: 0 })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const moveDraw = (face: Face, e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const { fx, fy } = fraction(e)
    const s = dragStart.current
    setDraft({
      face,
      left: Math.min(s.fx, fx),
      top: Math.min(s.fy, fy),
      width: Math.abs(fx - s.fx),
      height: Math.abs(fy - s.fy),
    })
  }

  const endDraw = () => {
    const d = draft
    dragStart.current = null
    setDraft(null)
    if (!d) return
    const widthMm = d.width * CARD_W_MM
    const heightMm = d.height * CARD_H_MM
    if (widthMm < MIN_ZONE_MM || heightMm < MIN_ZONE_MM) return
    const zone: MaskZone = {
      id: newId(),
      face: d.face,
      x: round1(d.left * CARD_W_MM),
      y: round1(d.top * CARD_H_MM),
      width: round1(widthMm),
      height: round1(heightMm),
    }
    onUpdate({ masks: [...card.masks, zone] })
  }

  const removeZone = (id: string) =>
    onUpdate({ masks: card.masks.filter((z) => z.id !== id) })

  // Render one editable card face: the card itself (download target) plus the
  // mask-mode zone outlines and drag surface as siblings (kept OUT of the
  // download ref so screenshots capture only the card).
  const renderFace = (
    face: Face,
    cardEl: React.ReactNode,
    downloadRef: RefObject<HTMLDivElement>,
    zones: MaskZone[]
  ) => (
    <div className="card-stage">
      <div ref={downloadRef}>{cardEl}</div>
      {maskMode && (
        <>
          {zones.map((z) => (
            <div
              key={z.id}
              className="mask-zone"
              style={{
                left: `${(z.x / CARD_W_MM) * 100}%`,
                top: `${(z.y / CARD_H_MM) * 100}%`,
                width: `${(z.width / CARD_W_MM) * 100}%`,
                height: `${(z.height / CARD_H_MM) * 100}%`,
              }}
            >
              {z.label && <span className="mask-zone-label">{z.label}</span>}
              <button
                type="button"
                className="mask-zone-del"
                onClick={() => removeZone(z.id)}
                title="Remove zone"
              >
                ×
              </button>
            </div>
          ))}
          <div
            className="mask-draw-surface"
            onPointerDown={(e) => startDraw(face, e)}
            onPointerMove={(e) => moveDraw(face, e)}
            onPointerUp={endDraw}
          />
          {draft?.face === face && (
            <div
              className="mask-draft"
              style={{
                left: `${draft.left * 100}%`,
                top: `${draft.top * 100}%`,
                width: `${draft.width * 100}%`,
                height: `${draft.height * 100}%`,
              }}
            />
          )}
        </>
      )}
    </div>
  )

  const showOverlayRow = maskMode || card.masks.length > 0

  return (
    <div className="preview-panel">
      {/* Own flow row so the link no longer sits on top of the "Back" label. */}
      <div className="preview-topbar">
        <HowItWorksLink onNavigate={onNavigate} />
      </div>

      {/* The scroller. .preview-inner is margin-auto centered, so it collapses
          to start-aligned on overflow — both card edges stay reachable. */}
      <div className="preview-scroll">
        <div className="preview-inner">
          <div className="preview-cards">
            <div className="preview-card-wrapper">
              <div className="preview-label">
                Front
                {frontOverflow && (
                  <span className="overflow-warning" title="Content overflows card">
                    !
                  </span>
                )}
              </div>
              {renderFace('front', <CardFront card={card} bodyRef={frontBodyRef} />, frontRef, frontZones)}
              <button type="button" className="download-button" onClick={onDownloadFront}>
                Download Front
              </button>
            </div>

            <div className="preview-card-wrapper">
              <div className="preview-label">
                Back
                {backOverflow && (
                  <span className="overflow-warning" title="Content overflows card">
                    !
                  </span>
                )}
              </div>
              {renderFace('back', <CardBack card={card} bodyRef={backBodyRef} />, backRef, backZones)}
              <button type="button" className="download-button" onClick={onDownloadBack}>
                Download Back
              </button>
            </div>
          </div>

          {showOverlayRow && (
            <div className="preview-overlay-section">
              <div className="preview-overlay-title">Mask Overlay — cut guide (outlines only)</div>
              <div className="preview-cards">
                {(maskMode || frontZones.length > 0) && (
                  <div className="preview-card-wrapper">
                    <div className="preview-label">Front Overlay</div>
                    <div className="overlay-checker">
                      <CardOverlay card={card} face="front" overlayRef={overlayFrontRef} />
                    </div>
                    {frontZones.length > 0 && (
                      <button type="button" className="download-button" onClick={onDownloadOverlayFront}>
                        Download Front Overlay
                      </button>
                    )}
                  </div>
                )}
                {(maskMode || backZones.length > 0) && (
                  <div className="preview-card-wrapper">
                    <div className="preview-label">Back Overlay</div>
                    <div className="overlay-checker">
                      <CardOverlay card={card} face="back" overlayRef={overlayBackRef} />
                    </div>
                    {backZones.length > 0 && (
                      <button type="button" className="download-button" onClick={onDownloadOverlayBack}>
                        Download Back Overlay
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="print-tip">
            Tip: When printing, set scale to 100% for accurate card size (63.5mm x 88.9mm).
          </p>
        </div>
      </div>
    </div>
  )
}
