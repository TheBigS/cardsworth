import { useState } from 'react'
import type { CardState } from '../hooks/useCardState'
import type { EditorFace } from './MarkdownModal'
import { ImageUpload } from './ImageUpload'
import { ColorPicker } from './ColorPicker'
import { FontSizeControl } from './FontSizeControl'
import { TemplateSelector } from './TemplateSelector'
import { ImportExport } from './ImportExport'
import { BrandHeader } from './Logo'

interface CardEditorProps {
  card: CardState
  onUpdate: (updates: Partial<CardState>) => void
  maskMode: boolean
  onToggleMask: (on: boolean) => void
  openEditor: (face: EditorFace) => void
}

type Tab = 'basics' | 'image' | 'style' | 'text' | 'mask'

const TABS: [Tab, string][] = [
  ['basics', 'Basics'],
  ['image', 'Image'],
  ['style', 'Style'],
  ['text', 'Text'],
  ['mask', 'Mask'],
]

// First ~46 chars of a face's markdown, stripped of syntax, for the Text tab
// trigger-button preview. Falls back to "Empty".
function snippet(md: string): string {
  const s = (md || '').replace(/[#*_>-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 46)
  return s || 'Empty'
}

export function CardEditor({ card, onUpdate, maskMode, onToggleMask, openEditor }: CardEditorProps) {
  const [tab, setTab] = useState<Tab>('basics')

  return (
    <div className="editor-panel">
      <BrandHeader />

      <div className="seg">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`seg-btn ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="ed-page">
        {tab === 'basics' && (
          <>
            <div className="form-group">
              <label>Card Title</label>
              <input
                type="text"
                value={card.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder="Enter card title..."
              />
            </div>
            <TemplateSelector
              onSelect={(template) =>
                onUpdate({ frontMarkdown: template.front, backMarkdown: template.back })
              }
            />
          </>
        )}

        {tab === 'image' && (
          <>
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={card.imageEnabled}
                  onChange={(e) => onUpdate({ imageEnabled: e.target.checked })}
                />
                Include image on front
              </label>
            </div>

            {card.imageEnabled && (
              <>
                <ImageUpload
                  currentImage={card.imageDataUrl}
                  onImageChange={(imageDataUrl) => onUpdate({ imageDataUrl })}
                />
                <div className="field-hint">
                  Best fit: <strong>547 × 361 px</strong> · 3:2 landscape. Larger is fine — it
                  scales to the card.
                </div>

                {card.imageDataUrl && (
                  <>
                    <div className="form-group">
                      <label>Image Crop (Vertical): {card.imageCropY}%</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={card.imageCropY}
                        onChange={(e) => onUpdate({ imageCropY: Number(e.target.value) })}
                      />
                    </div>

                    <div className="form-group checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={card.imagePadding}
                          onChange={(e) => onUpdate({ imagePadding: e.target.checked })}
                        />
                        Add padding (for transparent images)
                      </label>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {tab === 'style' && (
          <>
            <ColorPicker
              label="Border Color"
              value={card.borderColor}
              onChange={(borderColor) => onUpdate({ borderColor })}
            />
            <FontSizeControl
              label="Title Font Size"
              value={card.titleFontSize}
              onChange={(titleFontSize) => onUpdate({ titleFontSize })}
              min={12}
              max={48}
            />
            <FontSizeControl
              label="Body Font Size"
              value={card.bodyFontSize}
              onChange={(bodyFontSize) => onUpdate({ bodyFontSize })}
              min={8}
              max={24}
            />
          </>
        )}

        {tab === 'text' && (
          <div className="text-field stacked">
            <button type="button" className="text-open-btn" onClick={() => openEditor('front')}>
              <span className="tob-top">
                <span className="tob-label">Front text</span>
                <span className="tob-edit">Edit ›</span>
              </span>
              <span className="tob-snippet">{snippet(card.frontMarkdown)}</span>
            </button>
            <button type="button" className="text-open-btn" onClick={() => openEditor('back')}>
              <span className="tob-top">
                <span className="tob-label">Back text</span>
                <span className="tob-edit">Edit ›</span>
              </span>
              <span className="tob-snippet">{snippet(card.backMarkdown)}</span>
            </button>
          </div>
        )}

        {tab === 'mask' && (
          <>
            <p className="tab-intro">
              Black out parts of a card to hide spoilers — perfect for unidentified items or
              secrets the players shouldn't see yet. Turn on mask mode, then drag across the front
              or back preview to mark each hidden region. Print the cut-guide overlay to make
              real blackout strips.
            </p>

            <div className="toggle-field">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={maskMode}
                  onChange={(e) => onToggleMask(e.target.checked)}
                />
                <span className="toggle-track" aria-hidden="true">
                  <span className="toggle-thumb" />
                </span>
              </label>
              <span className="toggle-copy">
                <span className="toggle-title">Mask mode</span>
                <span className="toggle-desc">Draw blackout zones on the preview</span>
              </span>
            </div>

            {maskMode && (
              <p className="markdown-hint">
                Drag on the front or back preview to mark a hidden region. The overlay below prints
                just the cut outlines. Tip: finalize your text first — zones are fixed positions and
                don't follow reflowed content.
              </p>
            )}

            {card.masks.length > 0 && (
              <>
                <div className="mask-list-heading">
                  Hidden regions ({card.masks.length})
                </div>
                <div className="mask-list">
                  {card.masks.map((zone) => (
                    <div key={zone.id} className="mask-list-item">
                      <span className={`mask-face-badge mask-face-${zone.face}`}>
                        {zone.face}
                      </span>
                      <input
                        type="text"
                        className="mask-label-input"
                        value={zone.label ?? ''}
                        placeholder="Label (optional)"
                        onChange={(e) =>
                          onUpdate({
                            masks: card.masks.map((z) =>
                              z.id === zone.id ? { ...z, label: e.target.value || undefined } : z
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="mask-remove-btn"
                        title="Remove zone"
                        onClick={() =>
                          onUpdate({ masks: card.masks.filter((z) => z.id !== zone.id) })
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="ed-foot">
        <ImportExport card={card} onImport={onUpdate} />
      </div>
    </div>
  )
}
