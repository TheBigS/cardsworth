import { REPO_URL } from '../config'
import { SourceLink } from './SourceLink'

/**
 * Cardsworth brand mark — "The Majordomo" (top hat · monocle · mustache).
 * A filled enamel-pin portrait. Every fill is driven by a CSS custom property
 * so ONE component themes for any background; set the --cw-* vars on the SVG
 * (or an ancestor). The fallbacks below are the light/on-parchment theme:
 *   --cw-ink (outline/hat/pupils) · --cw-brass (band+face) ·
 *   --cw-brass-dark (ears/nose/cord) · --cw-garnet (hat gem) · --cw-lens (glass)
 */
export function CardsworthMark({
  className,
  title = 'Cardsworth',
}: {
  className?: string
  title?: string
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 92"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="30" y="2" width="40" height="22" rx="2.5" fill="var(--cw-ink,#540000)" />
      <rect x="30" y="17" width="40" height="7" fill="var(--cw-brass,#b9923a)" />
      <circle cx="50" cy="20.5" r="2.8" fill="var(--cw-garnet,#7c1f1f)" />
      <rect x="20" y="24" width="60" height="6" rx="3" fill="var(--cw-ink,#540000)" />
      <rect x="26" y="30" width="48" height="46" rx="9" fill="var(--cw-brass,#b9923a)" stroke="var(--cw-ink,#540000)" strokeWidth="3.5" />
      <circle cx="25" cy="52" r="5" fill="var(--cw-brass-dark,#8B6914)" stroke="var(--cw-ink,#540000)" strokeWidth="3" />
      <circle cx="75" cy="52" r="5" fill="var(--cw-brass-dark,#8B6914)" stroke="var(--cw-ink,#540000)" strokeWidth="3" />
      <circle cx="40" cy="48" r="3.8" fill="var(--cw-ink,#540000)" />
      <circle cx="62" cy="48" r="7.5" fill="var(--cw-lens,#fbf6ea)" stroke="var(--cw-ink,#540000)" strokeWidth="3.5" />
      <circle cx="62" cy="48" r="2.7" fill="var(--cw-ink,#540000)" />
      <rect x="47.6" y="54" width="4.8" height="8" rx="2" fill="var(--cw-brass-dark,#8B6914)" />
      <g stroke="var(--cw-ink,#540000)" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M50 67 C44.7 71.6, 40 72.3, 37.2 70.4 C35 68.7, 34.3 66.4, 35.2 64.6" />
        <path d="M50 67 C55.3 71.6, 60 72.3, 62.8 70.4 C65 68.7, 65.7 66.4, 64.8 64.6" />
      </g>
    </svg>
  )
}

/**
 * Header lockup: mark + "Cardsworth" wordmark + "PRINTABLE RPG CARDS" subtitle,
 * with a GitHub Source link in the header's right gutter (space-between row).
 * Requires the .brand-* / .source-link rules from brand.css.
 */
export function BrandHeader() {
  return (
    <div className="brand-header">
      <div className="brand-lockup">
        <CardsworthMark className="brand-mark" />
        <div className="brand-text">
          <div className="brand-name">Cardsworth</div>
          <div className="brand-sub">Printable RPG Cards</div>
        </div>
      </div>
      <SourceLink repoUrl={REPO_URL} />
    </div>
  )
}
