import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import express, { type Request, type Response } from 'express'
import yaml from 'js-yaml'
import { marked } from 'marked'
import sharp from 'sharp'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

// Mirror the frontend's marked config (src/utils/markdown.ts) so block→element
// counts computed here match what the page actually renders.
marked.setOptions({ breaks: true, gfm: true })

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, 'dist')

const PORT = Number(process.env.PORT) || 8080
// Number of warm Playwright pages kept ready to serve renders concurrently.
const POOL_SIZE = Number(process.env.RENDER_POOL_SIZE) || 3

// ---------------------------------------------------------------------------
// Card data parsing (mirrors src/utils/cardFormat.ts importCardFromYaml).
// We deliberately do NOT import the frontend module here — it pulls in React.
// ---------------------------------------------------------------------------

const CARD_FORMAT_VERSION = 1

// Blackout-overlay cut region, in millimetres from the card's top-left.
interface MaskZone {
  id: string
  face: 'front' | 'back'
  x: number
  y: number
  width: number
  height: number
  label?: string
}

interface CardState {
  title: string
  imageEnabled: boolean
  imageDataUrl: string | null
  imageCropY: number
  imagePadding: boolean
  frontMarkdown: string
  backMarkdown: string
  borderColor: string
  titleFontSize: number
  bodyFontSize: number
  // When true, overflowing front content is auto-moved to the back card.
  autoReflow: boolean
  // Blackout-overlay cut regions (mm).
  masks: MaskZone[]
}

class BadRequestError extends Error {}

// Validate and normalize the optional masks array from a request body.
// Invalid entries are dropped rather than rejected so a malformed zone never
// fails an otherwise-valid render.
function parseMasks(raw: unknown): MaskZone[] {
  if (!Array.isArray(raw)) return []
  const zones: MaskZone[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const z = item as Record<string, unknown>
    const face = z.face === 'back' ? 'back' : 'front'
    const x = Number(z.x)
    const y = Number(z.y)
    const width = Number(z.width)
    const height = Number(z.height)
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue
    zones.push({
      id: typeof z.id === 'string' ? z.id : `${zones.length}`,
      face,
      x,
      y,
      width,
      height,
      ...(typeof z.label === 'string' ? { label: z.label } : {}),
    })
  }
  return zones
}

/**
 * Parse a JSON or YAML request body (JSON is valid YAML, so yaml.load handles
 * both) into a complete CardState, applying the same defaults the browser app
 * uses on import. Throws BadRequestError for invalid/missing fields.
 */
function parseCardBody(body: string): CardState {
  let parsed: unknown
  try {
    parsed = yaml.load(body)
  } catch (err) {
    throw new BadRequestError(`Could not parse body as YAML/JSON: ${(err as Error).message}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new BadRequestError('Body must be a YAML/JSON object')
  }

  const file = parsed as { version?: number; card?: Record<string, unknown> }

  if (!file.version) {
    throw new BadRequestError('Missing required field: version')
  }
  if (file.version > CARD_FORMAT_VERSION) {
    throw new BadRequestError(
      `Unsupported format version: ${file.version}. Maximum supported is ${CARD_FORMAT_VERSION}.`
    )
  }
  if (!file.card || typeof file.card !== 'object') {
    throw new BadRequestError('Missing required field: card')
  }

  const c = file.card
  // A complete state is always built so a reused page never bleeds the prior
  // request's image; imageDataUrl is null (not the editor placeholder) when absent.
  return {
    title: (c.title as string) ?? '',
    imageEnabled: (c.imageEnabled as boolean) ?? true,
    imageDataUrl: (c.imageDataUrl as string | null | undefined) ?? null,
    imageCropY: (c.imageCropY as number) ?? 50,
    imagePadding: (c.imagePadding as boolean) ?? false,
    frontMarkdown: (c.frontMarkdown as string) ?? '',
    backMarkdown: (c.backMarkdown as string) ?? '',
    borderColor: (c.borderColor as string) ?? '#540000',
    titleFontSize: (c.titleFontSize as number) ?? 18,
    bodyFontSize: (c.bodyFontSize as number) ?? 11,
    autoReflow: (c.autoReflow as boolean) ?? false,
    masks: parseMasks(c.masks),
  }
}

// ---------------------------------------------------------------------------
// Playwright render pool: one warm browser, a fixed set of reusable pages.
// ---------------------------------------------------------------------------

interface ReflowInfo {
  // Whether the front card overflows its visible area (incl. safety margin).
  needed: boolean
  // Hidden pixels on the front (scrollHeight - availableHeight), for debugging.
  overflowPx?: number
  // 0-indexed block after which content was split; -1 means even the first
  // block does not fit (front area too small for any content).
  splitAfterBlock?: number
  // Markdown that fits on the front / should move to the back.
  suggestedFront?: string
  suggestedBack?: string
  // Set when the back card still overflows after reflow — not auto-fixable.
  backOverflow?: boolean
  backOverflowPx?: number
}

interface RenderResult {
  front: string
  back: string
  reflow: ReflowInfo
  // Blackout cut-guide overlays, per face. Present only when the card has
  // mask zones; a face key appears only when that face has zones.
  overlay?: { front?: string; back?: string }
}

// Measurement of a `.card-body` element, taken inside the Playwright page.
interface BodyMeasure {
  found: boolean
  hasOverflow: boolean
  overflowPx: number
  // Index of the last top-level child fully inside the visible area, or -1.
  lastFittingIndex: number
  childCount: number
  scrollHeight: number
}

// Pixels of headroom kept above the bottom edge so text does not crowd or clip
// against the rounded `.card-inner` border (border-radius: 1mm).
const SAFETY_MARGIN = 4

// Print output: an MTG-sized card (63.5mm × 88.9mm = 2.5" × 3.5") at 300 DPI is
// 750 × 1050 px. We capture at higher resolution (see RENDER_SCALE) and
// downscale for crisp, supersampled text, then tag the PNG with 300 DPI so
// Word/print apps place it at exactly 2.5" × 3.5" with no manual resizing.
const OUTPUT_WIDTH = 750
const OUTPUT_HEIGHT = 1050
const OUTPUT_DPI = 300

/**
 * Normalize a raw card screenshot to the print target: exactly 750 × 1050 px
 * with 300 DPI metadata (pHYs chunk), returned as a base64 PNG data URL.
 * `fit: 'fill'` pins the exact pixel dimensions; the source aspect ratio
 * already matches 2.5:3.5 so there is no visible distortion.
 */
async function finalizePng(shot: Buffer): Promise<string> {
  const png = await sharp(shot)
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'fill' })
    .withMetadata({ density: OUTPUT_DPI })
    .png()
    .toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}

/**
 * Split front markdown into block-level source chunks, mirroring how `marked`
 * turns blank-line-separated text into top-level block elements. Used to map a
 * DOM split point (child index) back to source markdown for reflow.
 */
function splitMarkdownBlocks(md: string): string[] {
  return md
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
}

/**
 * How many top-level block elements `marked` renders for a single markdown
 * block. One blank-line-separated block can produce several top-level elements
 * — e.g. a paragraph immediately followed by a list yields <p> + <ul> — so DOM
 * child indices do NOT line up 1:1 with source blocks. Counting non-space lexer
 * tokens gives the element count without needing a DOM.
 */
function countBlockElements(block: string): number {
  const n = marked.lexer(block).filter((t) => t.type !== 'space').length
  return n > 0 ? n : 1
}

/**
 * Measure a `.card-body` in the live page: does its content overflow the
 * visible card area, by how much, and the index of the last top-level child
 * that fully fits.
 *
 * The clip boundary is the enclosing `.card-inner` (overflow: hidden), NOT the
 * body itself: the front body has no fixed height and expands to its content,
 * so `.card-inner` is what actually clips. All positions use viewport-space
 * getBoundingClientRect so they are directly comparable.
 */
async function measureBody(page: Page, selector: string): Promise<BodyMeasure> {
  return page.evaluate(
    ({ sel, safety }) => {
      const body = document.querySelector(sel) as HTMLElement | null
      if (!body) {
        return {
          found: false,
          hasOverflow: false,
          overflowPx: 0,
          lastFittingIndex: -1,
          childCount: 0,
          scrollHeight: 0,
        }
      }
      const bodyRect = body.getBoundingClientRect()
      // The preview renders the card CSS-transform-scaled, so viewport
      // (getBoundingClientRect) px differ from layout px (clientHeight /
      // scrollHeight). Recover the scale so we can express every position in
      // layout px — matching scrollHeight and giving a scale-independent count.
      const scale = body.clientHeight > 0 ? bodyRect.height / body.clientHeight : 1
      const clip = (body.closest('.card-inner') as HTMLElement) ?? body
      // Clip line (the rounded .card-inner bottom) in the body's own layout px,
      // pulled up by the safety margin to avoid the rounded corner.
      const visibleBottom =
        (clip.getBoundingClientRect().bottom - bodyRect.top) / scale - safety
      // scrollHeight already covers content hidden by overflow:hidden.
      const overflowPx = body.scrollHeight - visibleBottom
      const hasOverflow = overflowPx > 0
      const children = body.children
      let lastFittingIndex = -1
      for (let i = 0; i < children.length; i++) {
        const childBottom = (children[i].getBoundingClientRect().bottom - bodyRect.top) / scale
        if (childBottom <= visibleBottom) lastFittingIndex = i
        else break
      }
      return {
        found: true,
        hasOverflow,
        overflowPx,
        lastFittingIndex,
        childCount: children.length,
        scrollHeight: body.scrollHeight,
      }
    },
    { sel: selector, safety: SAFETY_MARGIN }
  )
}

class RenderPool {
  private browser!: Browser
  private context!: BrowserContext
  private idle: Page[] = []
  private waiters: Array<(page: Page) => void> = []

  async init(baseUrl: string): Promise<void> {
    this.browser = await chromium.launch({ args: ['--no-sandbox'] })
    // High DPR so the captured card exceeds the 750×1050 print target and is
    // downscaled (supersampled) in finalizePng for crisp text.
    this.context = await this.browser.newContext({ deviceScaleFactor: 3.125 })

    for (let i = 0; i < POOL_SIZE; i++) {
      const page = await this.context.newPage()
      await page.goto(baseUrl, { waitUntil: 'networkidle' })
      await page.waitForFunction(() => '__SET_CARD_STATE__' in window)
      this.idle.push(page)
    }
  }

  private async acquire(): Promise<Page> {
    const page = this.idle.pop()
    if (page) return page
    return new Promise<Page>((resolve) => this.waiters.push(resolve))
  }

  private release(page: Page): void {
    const waiter = this.waiters.shift()
    if (waiter) waiter(page)
    else this.idle.push(page)
  }

  // Inject card state into the page and wait for web fonts to be ready.
  private async applyState(page: Page, state: CardState): Promise<void> {
    await page.evaluate((s) => {
      const fn = (window as unknown as Record<string, unknown>).__SET_CARD_STATE__ as
        | ((next: unknown) => void)
        | undefined
      if (!fn) throw new Error('__SET_CARD_STATE__ not available')
      fn(s)
    }, state)
    await page.evaluate(() => (document as Document).fonts.ready)
  }

  async render(state: CardState): Promise<RenderResult> {
    const page = await this.acquire()
    try {
      await this.applyState(page, state)
      // Wait for React to commit this state (title reflects the request).
      await page.waitForFunction(
        (title) => {
          const el = document.querySelector('.card-front .card-title')
          return el != null && el.textContent === (title || 'Untitled')
        },
        state.title
      )

      const front = await measureBody(page, '.card-front .card-body')
      const reflow: ReflowInfo = { needed: front.hasOverflow }

      // Only compute a split when the front overflows and has content to move.
      if (front.hasOverflow && state.frontMarkdown.trim()) {
        const blocks = splitMarkdownBlocks(state.frontMarkdown)
        // front.lastFittingIndex is a DOM-child index, but a markdown block can
        // render as several top-level elements, so child indices are not block
        // indices. Map the COUNT of fitting children to the last source block
        // whose elements are all within that count, keeping the split on a
        // block boundary.
        const fittingChildren = front.lastFittingIndex + 1
        let splitAfterBlock = -1
        let elementsSoFar = 0
        for (let b = 0; b < blocks.length; b++) {
          elementsSoFar += countBlockElements(blocks[b])
          if (elementsSoFar <= fittingChildren) splitAfterBlock = b
          else break
        }
        const suggestedFront =
          splitAfterBlock >= 0 ? blocks.slice(0, splitAfterBlock + 1).join('\n\n') : ''
        const suggestedBack = (
          splitAfterBlock >= 0 ? blocks.slice(splitAfterBlock + 1) : blocks
        ).join('\n\n')

        reflow.overflowPx = Math.round(front.overflowPx)
        reflow.splitAfterBlock = splitAfterBlock
        reflow.suggestedFront = suggestedFront
        reflow.suggestedBack = suggestedBack

        // Auto-reflow only when there is genuinely something to move down.
        if (state.autoReflow && suggestedBack) {
          const newBack = state.backMarkdown
            ? `${suggestedBack}\n\n${state.backMarkdown}`
            : suggestedBack
          await this.applyState(page, {
            ...state,
            frontMarkdown: suggestedFront,
            backMarkdown: newBack,
          })
          // Removing content strictly shrinks the front body; wait for that
          // rather than an exact child count (robust to block/element mismatch).
          await page.waitForFunction(
            (prev) => {
              const b = document.querySelector('.card-front .card-body')
              return b != null && b.scrollHeight < prev
            },
            front.scrollHeight
          )
        }
      }

      // Check the back AFTER any reflow — its content may now be fuller.
      const back = await measureBody(page, '.card-back .card-body')
      if (back.found && back.hasOverflow) {
        reflow.backOverflow = true
        reflow.backOverflowPx = Math.round(back.overflowPx)
      }

      const frontShot = await page.locator('.card-front').screenshot({ omitBackground: true })
      const backShot = await page.locator('.card-back').screenshot({ omitBackground: true })

      // Blackout cut-guide overlays — one per face that has mask zones. The
      // SPA renders `.card-overlay-<face>` whenever masks exist, so the
      // element is present; reuse finalizePng for the same 750×1050 @ 300 DPI.
      const overlay: { front?: string; back?: string } = {}
      if (state.masks.some((z) => z.face === 'front')) {
        const shot = await page
          .locator('.card-overlay-front')
          .screenshot({ omitBackground: true })
        overlay.front = await finalizePng(shot)
      }
      if (state.masks.some((z) => z.face === 'back')) {
        const shot = await page
          .locator('.card-overlay-back')
          .screenshot({ omitBackground: true })
        overlay.back = await finalizePng(shot)
      }

      return {
        front: await finalizePng(frontShot),
        back: await finalizePng(backShot),
        reflow,
        ...(overlay.front || overlay.back ? { overlay } : {}),
      }
    } finally {
      this.release(page)
    }
  }

  async close(): Promise<void> {
    await this.browser?.close()
  }
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

async function main() {
  const pool = new RenderPool()

  const app = express()
  // Accept any content type as raw text; we sniff JSON vs YAML via yaml.load.
  app.use(express.text({ type: '*/*', limit: '25mb' }))

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' })
  })

  app.post('/api/render', async (req: Request, res: Response) => {
    let state: CardState
    try {
      const body = typeof req.body === 'string' ? req.body : ''
      if (!body.trim()) throw new BadRequestError('Empty request body')
      state = parseCardBody(body)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid request body'
      res.status(400).json({ error: message })
      return
    }

    try {
      const result = await pool.render(state)
      res.json(result)
    } catch (err) {
      console.error('Render error:', err)
      res.status(500).json({ error: (err as Error).message || 'Rendering failed' })
    }
  })

  // Serve the built SPA; catch-all falls back to index.html for client routes.
  app.use(express.static(DIST_DIR))
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(join(DIST_DIR, 'index.html'))
  })

  const server = app.listen(PORT, () => {
    console.log(`cardsworth server listening on http://localhost:${PORT}`)
  })

  await pool.init(`http://localhost:${PORT}/`)
  console.log(`Render pool ready (${POOL_SIZE} pages)`)

  const shutdown = async () => {
    console.log('Shutting down...')
    await pool.close()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
