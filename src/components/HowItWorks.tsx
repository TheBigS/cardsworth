import { useEffect, useState, type ReactNode, type MouseEvent } from 'react'
import { CardsworthMark } from './Logo'
import { GithubMark } from './SourceLink'
import { REPO_URL } from '../config'
import '../styles/how-it-works.css'

// Parchment "Add a photo" placeholder shown until real photos are dropped into
// public/. Swap individual supply/step images here for real files when ready.
// BASE_URL keeps it resolvable under a subpath (GitHub Pages) as well as at root.
const PLACEHOLDER = `${import.meta.env.BASE_URL}supply-placeholder.svg`

// White-balanced build photos (src/assets/images/balanced). Filenames keep their
// original capture timestamps; the aliases below name what each frame shows.
import imgSleevesSingle from '../assets/images/balanced/WIN_20260622_15_22_05_Pro.jpg'
import imgSleevesClear from '../assets/images/balanced/WIN_20260622_15_22_20_Pro.jpg'
import imgCornerPunch from '../assets/images/balanced/WIN_20260622_15_22_51_Pro.jpg'
import imgCutter from '../assets/images/balanced/WIN_20260622_15_23_49_Pro.jpg'
import imgStepPrint from '../assets/images/balanced/WIN_20260622_15_24_07_Pro.jpg'
import imgStepCut from '../assets/images/balanced/WIN_20260622_15_26_03_Pro.jpg'
import imgStepGlue from '../assets/images/balanced/WIN_20260622_15_26_56_Pro.jpg'
import imgBlackTape from '../assets/images/balanced/WIN_20260622_15_30_04_Pro.jpg'
import imgStepSleeve from '../assets/images/balanced/WIN_20260622_15_30_25_Pro.jpg'
import imgStepMask from '../assets/images/balanced/WIN_20260622_15_30_29_Pro.jpg'
import imgStepReady from '../assets/images/balanced/WIN_20260622_15_31_08_Pro.jpg'
import imgResultFront from '../assets/images/cardsworthcard2.png'
import imgGlueStick from '../assets/images/gluestick.jpg'
import imgMagicBulk from '../assets/images/magicbulk.jpg'
import imgPerfectFit from '../assets/images/perfectfit.jpg'
// Spares not yet placed: 15_28_51 (clean glued front), 15_30_43 (sleeved, angled).

interface Supply {
  id: string
  title: string
  note: ReactNode
  link?: { label: string; href: string } // product link button (affiliate where noted)
  image?: string // build photo; falls back to PLACEHOLDER when absent
}

const SUPPLIES: Supply[] = [
  {
    id: 'supply-paper',
    title: 'Standard printer paper',
    note: (
      <>
        What most cards print on. <span className="spec">Matte</span> gives the least glare under
        table light.
      </>
    ),
    link: { label: 'The paper I use', href: 'https://amzn.to/3QSF1Tj' },
  },
  {
    id: 'supply-cutter',
    title: 'Paper cutter',
    note: (
      <>
        A guillotine or rotary trimmer, a steel ruler and craft knife — or even a pair of scissors.
        Cutouts don't need to be perfect; the borders are forgiving.
      </>
    ),
    link: { label: 'The scissors I use', href: 'https://amzn.to/4vvBsBy' },
    image: imgCutter,
  },
  {
    id: 'supply-punch',
    title: 'Corner punch',
    note: (
      <>
        Optional. A <span className="spec">3 mm</span> radius rounds corners to match real cards.
      </>
    ),
    link: { label: 'The punch I use', href: 'https://amzn.to/4xJw9js' },
    image: imgCornerPunch,
  },
  {
    id: 'supply-adhesive',
    title: 'Glue stick',
    note: (
      <>
        The easy choice for mounting the faces onto a core card — or use spray adhesive for a
        flatter, bubble-free bond.
      </>
    ),
    link: { label: 'The glue I use', href: 'https://amzn.to/4aYs4hp' },
    image: imgGlueStick,
  },
  {
    id: 'supply-cores',
    title: 'Sacrificial MTG cards',
    note: <>Basic lands or spare game cards for weight and an opaque core.</>,
    link: {
      label: 'Bulk cards I use',
      href: 'https://www.tcgplayer.com/search/bulk-lots/magic-the-gathering-bulk-card-lots?productLineName=bulk-lots&setName=magic-the-gathering-bulk-card-lots&view=grid',
    },
    image: imgMagicBulk,
  },
  {
    id: 'supply-sleeves-single',
    title: 'Single-sided sleeves',
    note: <>Any color. One clear face, one solid back — shows the front and hides the core.</>,
    link: { label: 'The sleeves I use', href: 'https://amzn.to/4xKv6Q6' },
    image: imgSleevesSingle,
  },
  {
    id: 'supply-sleeves-clear',
    title: 'Clear sleeves',
    note: (
      <>
        Fully transparent <span className="spec">66 × 91 mm</span> sleeves for the outer layer.
      </>
    ),
    link: { label: 'The clear sleeves I use', href: 'https://amzn.to/3Sq48x9' },
    image: imgSleevesClear,
  },
  {
    id: 'supply-sleeves-fit',
    title: 'Perfect-fit clear sleeves',
    note: (
      <>
        Optional. Snug inner sleeves that hold the <span className="spec">mask</span> layer tight
        against the card.
      </>
    ),
    link: { label: 'The fit sleeves I use', href: 'https://amzn.to/4oDOkTq' },
    image: imgPerfectFit,
  },
  {
    id: 'supply-tape',
    title: "Black painter's tape",
    note: (
      <>
        Optional. For masking <span className="spec">unidentified</span> items — holds the mask
        layer, then peels clean.
      </>
    ),
    link: { label: 'The tape I use', href: 'https://amzn.to/43R9KD7' },
    image: imgBlackTape,
  },
]

interface Step {
  id: string
  badge: string // number, or "Optional"
  optional?: boolean
  title: string
  body: ReactNode
  tip: ReactNode
  alt: string
  image?: string // build photo; falls back to PLACEHOLDER when absent
  editorCta?: boolean // render an "open the editor" button in place of a photo
}

const STEPS: Step[] = [
  {
    id: 'howto-step-0',
    badge: '0',
    title: 'Build your card',
    alt: 'Open the Cardsworth editor',
    editorCta: true,
    body: (
      <>
        Start in the <strong>Cardsworth editor</strong>. Pick a card type, fill in the title, art,
        stats, and lore, and watch the card render live. When you're happy with it, you're ready to
        print.
      </>
    ),
    tip: (
      <>
        Save your work as <b>YAML</b> with the download button — re-import it anytime to reprint or
        revise the card later.
      </>
    ),
  },
  {
    id: 'howto-step-1',
    badge: '1',
    title: 'Export & print',
    alt: 'Printed sheet fresh off the printer',
    image: imgStepPrint,
    body: (
      <>
        Hit <strong>Download Front</strong> and <strong>Download Back</strong> to save both faces as
        high-resolution PNGs. Drop them into your layout of choice and print onto standard printer
        paper.
      </>
    ),
    tip: (
      <>
        <b>Print at 100% scale</b> — never "fit to page" — so the card lands at exactly 63.5 × 88.9
        mm.
      </>
    ),
  },
  {
    id: 'howto-step-2',
    badge: '2',
    title: 'Cut to size',
    alt: 'Trimming a card with a guillotine or craft knife',
    image: imgStepCut,
    body: (
      <>
        Trim each face along its border with a guillotine cutter, a steel ruler and craft knife, or
        even a pair of scissors — the borders are forgiving, so cuts don't need to be perfect. A
        corner punch rounds the edges to match a real card (a <strong>3 mm</strong> rounded corner
        matches an MTG card perfectly).
      </>
    ),
    tip: (
      <>
        Cut just <b>inside</b> the colored border for a clean, frame-true edge.
      </>
    ),
  },
  {
    id: 'howto-step-3',
    badge: '3',
    title: 'Glue to a core',
    alt: 'Gluing front and back onto a core card',
    image: imgStepGlue,
    body: (
      <>
        Spray-mount or glue-stick the front and back (if needed) onto a{' '}
        <strong>sacrificial MTG card</strong> — a basic land or a spare game card — to give your
        card real weight and an opaque core.
      </>
    ),
    tip: (
      <>
        A thin, even coat of <b>spray adhesive</b> avoids bubbles and warping.
      </>
    ),
  },
  {
    id: 'howto-step-mask',
    badge: 'Optional',
    optional: true,
    title: 'Mask an unidentified item',
    alt: 'Applying the mask with black tape',
    image: imgStepMask,
    body: (
      <>
        Only if the item is <strong>unidentified</strong>: turn on <strong>Mask</strong> mode in
        Cardsworth, export the blackout layer, and cut it out. Lay it over the finished card to hide
        the details.
      </>
    ),
    tip: (
      <>
        Fix the mask down with <b>black painter's tape</b> — it holds firm at the table but peels
        away cleanly when the party finally identifies the item.
      </>
    ),
  },
  {
    id: 'howto-step-4',
    badge: '4',
    title: 'Sleeve it',
    alt: 'Sliding the card into a sleeve',
    image: imgStepSleeve,
    body: (
      <>
        Match the sleeve to the card. <strong>Front-only cards</strong> go in single-sided sleeves
        (clear front, solid back). <strong>Front-and-back cards</strong> go in fully clear sleeves
        so both faces read.
      </>
    ),
    tip: (
      <>
        For an <b>unidentified</b> item, slip the printed mask layer into a snug{' '}
        <b>perfect-fit clear sleeve</b> first, then sleeve as normal — pop it out once the party
        identifies the item.
      </>
    ),
  },
  {
    id: 'howto-step-5',
    badge: '5',
    title: 'Ready for play',
    alt: 'The finished card in hand, fanned in a deck',
    image: imgStepReady,
    body: (
      <>
        That's a finished, table-ready Cardsworth card. Hand it to a player and watch the lore land
        — and since it's standard card size, it fits right into your MTG storage boxes, binder
        pages, and deck boxes.
      </>
    ),
    tip: (
      <>
        Built a set? Re-import any card's <b>YAML</b> later to reprint or revise it. Look for the{' '}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 14, height: 14, verticalAlign: -2, color: 'var(--brand)' }}
        >
          <path d="M12 3v12" />
          <path d="m7 11 5 4 5-4" />
          <path d="M5 20h14" />
        </svg>{' '}
        <b>download</b> in the editor to save your raw card data or share it with others.
      </>
    ),
  },
]

function ZoomIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  )
}

interface HowItWorksProps {
  onNavigate: (to: string) => void
}

export function HowItWorks({ onNavigate }: HowItWorksProps) {
  const [lightbox, setLightbox] = useState<{ title: string; src: string } | null>(null)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightbox])

  const toEditor = (e: MouseEvent) => {
    e.preventDefault()
    onNavigate('/')
  }

  return (
    <div className="hiw">
      <header className="topbar">
        <a className="brand-lockup" href={import.meta.env.BASE_URL} onClick={toEditor} title="Back to Cardsworth">
          <CardsworthMark className="brand-mark" />
          <span>
            <span className="brand-name">Cardsworth</span>
            <span className="brand-sub">Printable RPG Cards</span>
          </span>
        </a>
        <a className="back-link" href={import.meta.env.BASE_URL} onClick={toEditor}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to the editor
        </a>
      </header>

      <section className="hero">
        <h1>How it works</h1>
      </section>

      <section className="result">
        <figure>
          <span className="photo-tag">The finished card</span>
          <img className="photo" src={imgResultFront} alt="The finished, sleeved card" />
          <figcaption>
            <b>What you're making:</b> a finished, sleeved card — ready for the table.
          </figcaption>
        </figure>
      </section>

      <section className="supplies">
        <div className="supplies-head">
          <p className="eyebrow">Before you start</p>
          <h2>What you'll need</h2>
        </div>
        <div className="supply-list">
          {SUPPLIES.map((s) => (
            <div className="supply" key={s.id}>
              {s.image && (
                <div className="supply-thumb">
                  <img className="photo" src={s.image} alt={s.title} />
                  <button
                    className="thumb-zoom"
                    type="button"
                    aria-label={`View ${s.title} larger`}
                    onClick={() => setLightbox({ title: s.title, src: s.image! })}
                  >
                    <ZoomIcon />
                  </button>
                </div>
              )}
              <div className="supply-text">
                <h3>{s.title}</h3>
                <p>{s.note}</p>
              </div>
              {s.link && (
                <a
                  className="supply-link"
                  href={s.link.href}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  <ExternalIcon />
                  {s.link.label}
                </a>
              )}
            </div>
          ))}
        </div>
        <p className="supplies-disclaimer">
          Some links above are affiliate links — buying through them costs you nothing extra, and the
          proceeds go toward running D&amp;D games.
        </p>
      </section>

      <section className="steps">
        {STEPS.map((step) => (
          <article
            className={`step${step.optional ? ' step--optional' : ''}`}
            key={step.id}
          >
            <div className="step-media">
              {step.editorCta ? (
                <a className="editor-cta" href={import.meta.env.BASE_URL} onClick={toEditor}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  Open the editor
                </a>
              ) : (
                <img className="photo" src={step.image ?? PLACEHOLDER} alt={step.alt} />
              )}
            </div>
            <div className="step-body">
              <span className={`step-no${step.optional ? ' is-optional' : ''}`}>{step.badge}</span>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
              <div className="tip">{step.tip}</div>
            </div>
          </article>
        ))}
      </section>

      <section className="callout-wrap">
        <div className="callout">
          <CardsworthMark className="callout-mark brand-mark--watermark" />
          <div className="callout-text">
            <p className="eyebrow">Open source · self-hostable</p>
            <h2>Want to self-host? Get the source.</h2>
            <p>
              Cardsworth is fully open source. Run your own instance, wire it into automation
              pipelines with the API, or contribute back — it's all on GitHub.
            </p>
          </div>
          {/* TODO: REPO_URL points at a placeholder repo until the real one is set. */}
          <a className="source-btn" href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <GithubMark />
            Get the source
          </a>
        </div>
      </section>

      <footer>Built with ❤️ for the D&amp;D community</footer>

      {lightbox && (
        <div className="lightbox" onMouseDown={(e) => { if (e.target === e.currentTarget) setLightbox(null) }}>
          <div className="lightbox-card">
            <div className="lightbox-head">
              <h3>{lightbox.title}</h3>
              <button
                className="lightbox-close"
                type="button"
                aria-label="Close"
                onClick={() => setLightbox(null)}
              >
                ×
              </button>
            </div>
            <img className="lightbox-slot" src={lightbox.src} alt={lightbox.title} />
          </div>
        </div>
      )}
    </div>
  )
}
