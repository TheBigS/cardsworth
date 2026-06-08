// Precomputed `@font-face` CSS (fonts inlined as base64 data URLs) for use as
// html-to-image's `fontEmbedCSS` option when rasterizing card faces.
//
// We build this ourselves instead of letting html-to-image scan
// `document.styleSheets`, for two reasons:
//
//   1. That scan crashes in Firefox ("TypeError: font is undefined" in
//      normalizeFontFamily) when it encounters an @font-face rule whose
//      `style.fontFamily` it reads back as undefined.
//   2. The card is rasterized by loading an SVG <foreignObject> into an <img>,
//      which renders in a sandbox with no access to the page's loaded fonts —
//      the faces must be inlined as data URLs or the PNG falls back to a
//      generic serif.
//
// Importing the .woff2 files lets Vite resolve their final (hashed) URLs.
import cinzelRegular from '../assets/fonts/cinzel-regular.woff2'
import ebGaramondRoman from '../assets/fonts/ebgaramond-roman.woff2'
import ebGaramondItalic from '../assets/fonts/ebgaramond-italic.woff2'

// The card faces (front, back, and both overlays) only ever use Cinzel for
// titles and EB Garamond for body text. The Alegreya Sans UI font never
// appears on a card, so it is intentionally omitted to keep the payload small.
// Descriptors mirror src/styles/fonts.css.
const FACES: { family: string; style: string; weight: string; url: string }[] = [
  { family: 'Cinzel', style: 'normal', weight: '400', url: cinzelRegular },
  { family: 'EB Garamond', style: 'normal', weight: '400 700', url: ebGaramondRoman },
  { family: 'EB Garamond', style: 'italic', weight: '400 700', url: ebGaramondItalic },
]

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url)
  const bytes = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return `data:font/woff2;base64,${btoa(binary)}`
}

let cached: Promise<string> | null = null

// Returns the embeddable @font-face CSS, fetching/encoding the fonts once and
// reusing the result for every subsequent download.
export function getCardFontEmbedCSS(): Promise<string> {
  if (!cached) {
    cached = Promise.all(
      FACES.map(async (face) => {
        const dataUrl = await toDataUrl(face.url)
        return `@font-face {
  font-family: '${face.family}';
  font-style: ${face.style};
  font-weight: ${face.weight};
  src: url(${dataUrl}) format('woff2');
}`
      }),
    ).then((blocks) => blocks.join('\n'))
  }
  return cached
}
