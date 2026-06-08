import yaml from 'js-yaml'
import type { CardState, MaskZone } from '../hooks/useCardState'

// Current format version
export const CARD_FORMAT_VERSION = 1

// Card file format (what gets saved/loaded)
export interface CardFile {
  version: number
  card: CardFileData
}

// Card data in file (excludes runtime-only fields like imageDataUrl)
export interface CardFileData {
  title: string
  imageEnabled: boolean
  imageCropY: number
  imagePadding: boolean
  frontMarkdown: string
  backMarkdown: string
  borderColor: string
  titleFontSize: number
  bodyFontSize: number
  // Image stored as base64 data URL (optional, can be large)
  imageDataUrl?: string | null
  // Render-API only: when true, the headless renderer moves overflowing
  // front-card content to the back automatically. Ignored by the browser UI.
  autoReflow?: boolean
  // Blackout-overlay cut regions (mm). Omitted when there are none.
  masks?: MaskZone[]
}

export function exportCardToYaml(card: CardState, includeImage = true): string {
  const cardFile: CardFile = {
    version: CARD_FORMAT_VERSION,
    card: {
      title: card.title,
      imageEnabled: card.imageEnabled,
      imageCropY: card.imageCropY,
      imagePadding: card.imagePadding,
      frontMarkdown: card.frontMarkdown,
      backMarkdown: card.backMarkdown,
      borderColor: card.borderColor,
      titleFontSize: card.titleFontSize,
      bodyFontSize: card.bodyFontSize,
      ...(card.masks.length > 0 ? { masks: card.masks } : {}),
      ...(includeImage && card.imageDataUrl ? { imageDataUrl: card.imageDataUrl } : {}),
    },
  }

  return yaml.dump(cardFile, {
    lineWidth: -1, // Don't wrap lines
    noRefs: true,
    quotingType: '"',
  })
}

export function importCardFromYaml(yamlContent: string): Partial<CardState> {
  const parsed = yaml.load(yamlContent) as CardFile

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid YAML format')
  }

  if (!parsed.version) {
    throw new Error('Missing version field')
  }

  if (parsed.version > CARD_FORMAT_VERSION) {
    throw new Error(`Unsupported format version: ${parsed.version}. Please update the app.`)
  }

  // Handle version migrations here if needed in the future
  // if (parsed.version === 1) { ... migrate to v2 ... }

  const data = parsed.card
  if (!data) {
    throw new Error('Missing card data')
  }

  return {
    title: data.title ?? '',
    imageEnabled: data.imageEnabled ?? true,
    imageCropY: data.imageCropY ?? 50,
    imagePadding: data.imagePadding ?? false,
    frontMarkdown: data.frontMarkdown ?? '',
    backMarkdown: data.backMarkdown ?? '',
    borderColor: data.borderColor ?? '#540000',
    titleFontSize: data.titleFontSize ?? 18,
    bodyFontSize: data.bodyFontSize ?? 11,
    masks: data.masks ?? [],
    ...(data.imageDataUrl ? { imageDataUrl: data.imageDataUrl } : {}),
  }
}

export function downloadYaml(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/yaml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
