import { useRef } from 'react'
import type { CardState } from '../hooks/useCardState'
import { exportCardToYaml, importCardFromYaml, downloadYaml } from '../utils/cardFormat'

interface ImportExportProps {
  card: CardState
  onImport: (updates: Partial<CardState>) => void
}

export function ImportExport({ card, onImport }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = (includeImage: boolean) => {
    const yaml = exportCardToYaml(card, includeImage)
    const filename = `${card.title || 'card'}.yaml`.replace(/[^a-z0-9-_.]/gi, '-')
    downloadYaml(yaml, filename)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const cardData = importCardFromYaml(content)
      onImport(cardData)
    } catch (err) {
      alert(`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  return (
    <div className="import-export">
      <div className="import-export-buttons">
        <button
          type="button"
          className="export-btn"
          onClick={() => handleExport(true)}
          title="Export Card Data"
          aria-label="Export Card Data"
        >
          <DownloadIcon />
        </button>
        <button
          type="button"
          className="export-btn export-btn-secondary"
          onClick={() => handleExport(false)}
          title="Export Card Data (no image data)"
          aria-label="Export Card Data (no image data)"
        >
          <DownloadNoImageIcon />
        </button>
        <button
          type="button"
          className="import-btn"
          onClick={handleImportClick}
          title="Import Card Data"
          aria-label="Import Card Data"
        >
          <UploadIcon />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

// Inline monoline icons (24×24, stroke = currentColor) — no icon-lib dependency,
// matching the repo's existing inline-SVG approach.
const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

// Arrow descending to a baseline — export / save out.
function DownloadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  )
}

// Picture frame with a slash — export without the embedded image.
function DownloadNoImageIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="5" width="16" height="13" rx="2" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="M20 14l-4.5-4.5L9 16" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  )
}

// Arrow rising from a baseline — import / load in.
function UploadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 16V5" />
      <path d="M7 10l5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  )
}
