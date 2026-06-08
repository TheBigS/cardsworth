import { useEffect, useState } from 'react'

// Default card art ("Card of Many Things"), bundled in public/. Treated like any
// uploaded image — replaced via the Image tab. BASE_URL keeps it resolvable both
// at the site root (self-hosted) and under a subpath (GitHub Pages).
const placeholderImage = `${import.meta.env.BASE_URL}placeholder-card.png`

// A mask region for the "unidentified item" blackout overlay. Stored in
// millimetres from the card's top-left so it renders identically in the browser
// preview and the headless API regardless of zoom or DPI.
export interface MaskZone {
  id: string
  face: 'front' | 'back'
  x: number                    // mm from card left
  y: number                    // mm from card top
  width: number                // mm
  height: number               // mm
  label?: string               // optional DM reference, e.g. "Curse"
}

export interface CardState {
  title: string
  imageEnabled: boolean        // whether to show image on front
  imageDataUrl: string | null
  imageCropY: number           // 0-100 vertical offset percentage
  imagePadding: boolean        // extra padding for transparent images
  frontMarkdown: string
  backMarkdown: string
  borderColor: string          // hex color
  titleFontSize: number        // px
  bodyFontSize: number         // px
  masks: MaskZone[]  // blackout-overlay cut regions (mm)
}

const defaultFrontMarkdown = `*Wondrous item, rare*

**Mimic.** As a bonus action, choose one card you can see within 30 feet. This card morphs into a perfect duplicate of it until you use this property again or it leaves your grasp.`

const defaultBackMarkdown = `**Card Sharp.** The next Sleight of Hand or Deception check you make to play, swap, or conceal the card before the end of your next turn has advantage.

**Wild Gamble.** The card has 3 charges and regains 1d3 expended charges daily at dawn. When you **Mimic**, you can expend 1 charge and roll a d4:
- 1: Backfire. Your next check has disadvantage.
- 2-3: Lucky. Reroll one die before the end of your next turn.
- 4: Jackpot. The next check to use the card succeeds automatically.

**Charges:** ☐ ☐ ☐`

const defaultCardState: CardState = {
  title: 'Card of Many Things',
  imageEnabled: true,
  imageDataUrl: placeholderImage,
  imageCropY: 50,
  imagePadding: false,
  frontMarkdown: defaultFrontMarkdown,
  backMarkdown: defaultBackMarkdown,
  borderColor: '#540000',
  titleFontSize: 18,
  bodyFontSize: 11,
  masks: [],
}

export function useCardState(initialState: Partial<CardState> = {}) {
  const [state, setState] = useState<CardState>({
    ...defaultCardState,
    ...initialState,
  })

  const updateState = (updates: Partial<CardState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const resetState = () => {
    setState(defaultCardState)
  }

  // Expose a global hook so the headless rendering server (Playwright) can
  // inject card state directly. Purely additive — does not affect the UI.
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__SET_CARD_STATE__ = (
      newState: Partial<CardState>
    ) => {
      updateState(newState)
    }
    return () => {
      delete (window as unknown as Record<string, unknown>).__SET_CARD_STATE__
    }
    // updateState is a stable closure over setState; register once on mount.
  }, [])

  return { state, updateState, resetState }
}
