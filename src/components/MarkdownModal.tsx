import type { CardState } from '../hooks/useCardState'
import { CardFront } from './CardFront'
import { CardBack } from './CardBack'

export type EditorFace = 'front' | 'back' | null

interface MarkdownModalProps {
  face: EditorFace
  card: CardState
  onUpdate: (updates: Partial<CardState>) => void
  // Called to switch faces (pass a face) or close the modal (no argument).
  onClose: (face?: 'front' | 'back') => void
}

// Focused, on-demand Markdown editor that replaces the two tall inline
// textareas. Renders the live card face beside the editor so edits are visible
// immediately.
export function MarkdownModal({ face, card, onUpdate, onClose }: MarkdownModalProps) {
  if (!face) return null

  const isFront = face === 'front'
  const value = isFront ? card.frontMarkdown : card.backMarkdown
  const setVal = (v: string) =>
    onUpdate(isFront ? { frontMarkdown: v } : { backMarkdown: v })

  return (
    <div
      className="md-overlay"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).classList.contains('md-overlay')) onClose()
      }}
    >
      <div className="md-modal" role="dialog" aria-modal="true">
        <div className="md-head">
          <div className="md-tabs">
            <button
              type="button"
              className={`md-tab ${isFront ? 'active' : ''}`}
              onClick={() => onClose('front')}
            >
              Front
            </button>
            <button
              type="button"
              className={`md-tab ${!isFront ? 'active' : ''}`}
              onClick={() => onClose('back')}
            >
              Back
            </button>
          </div>
          <div className="md-head-title">
            Editing {isFront ? 'front' : 'back'} description
          </div>
          <button type="button" className="md-done" onClick={() => onClose()}>
            Done
          </button>
        </div>

        <div className="md-body">
          <div className="md-editor-col">
            <textarea
              className="md-textarea"
              autoFocus
              value={value}
              placeholder={`Enter ${face} description (Markdown supported)...`}
              onChange={(e) => setVal(e.target.value)}
            />
            <div className="md-hintbar">
              <span>Supports</span>
              <code>**bold**</code>
              <code>*italic*</code>
              <code>- lists</code>
              <code># headings</code>
            </div>
          </div>

          <div className="md-preview-col">
            <div className="md-preview-label">
              Live preview · {isFront ? 'Front' : 'Back'}
            </div>
            <div className="md-card-hold">
              <div className="card-stage" style={{ zoom: 1.5 }}>
                {isFront ? <CardFront card={card} /> : <CardBack card={card} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
