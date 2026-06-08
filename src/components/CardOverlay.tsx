import type { RefObject } from 'react'
import type { CardState } from '../hooks/useCardState'

// Card geometry in millimetres (matches .card: 63.5mm × 88.9mm). Zones store mm,
// so we position them as percentages of the card box.
export const CARD_W_MM = 63.5
export const CARD_H_MM = 88.9

interface CardOverlayProps {
  card: CardState
  face: 'front' | 'back'
  overlayRef?: RefObject<HTMLDivElement>
}

/**
 * Cut-guide overlay for the "unidentified item" blackout workflow. Outlines only
 * (no fills) so it prints with minimal ink: a faint dashed card trim edge, corner
 * registration ticks, and one stroke-only rectangle per mask zone on this
 * face.
 *
 * Built from box-model <div>s (absolute insets + percentage positions + mm
 * borders) rather than an inline SVG: the preview wrapper uses `zoom: 1.5`, and
 * Firefox maps an SVG's internal viewBox coordinates inconsistently under `zoom`
 * (rects drift proportionally and overflow the card). Plain divs use the layout
 * engine's box model, which is consistent under `zoom` across Chrome and Firefox
 * — the editor's drag-zone divs already prove this.
 */
export function CardOverlay({ card, face, overlayRef }: CardOverlayProps) {
  const zones = card.masks.filter((z) => z.face === face)

  return (
    <div ref={overlayRef} className={`card card-overlay card-overlay-${face}`}>
      {/* Card trim edge (dashed, faint) — where to cut the overlay to size. */}
      <div className="card-overlay-edge" />

      {/* Corner registration ticks for aligning over the real card. */}
      <div className="card-overlay-tick card-overlay-tick-tl" />
      <div className="card-overlay-tick card-overlay-tick-tr" />
      <div className="card-overlay-tick card-overlay-tick-bl" />
      <div className="card-overlay-tick card-overlay-tick-br" />

      {/* Mask zones — outlines only, no fill (cut these out). */}
      {zones.map((z) => (
        <div
          key={z.id}
          className="card-overlay-zone"
          style={{
            left: `${(z.x / CARD_W_MM) * 100}%`,
            top: `${(z.y / CARD_H_MM) * 100}%`,
            width: `${(z.width / CARD_W_MM) * 100}%`,
            height: `${(z.height / CARD_H_MM) * 100}%`,
          }}
        />
      ))}
    </div>
  )
}
