/**
 * "How it works" link for the editor preview pane.
 * Pinned top-right of the preview stage (.preview-panel must be position:relative).
 * Navigates client-side to the tutorial route; keeps a real href for
 * accessibility and middle-click / open-in-new-tab.
 */
interface HowItWorksLinkProps {
  href?: string
  onNavigate?: (to: string) => void
}

export function HowItWorksLink({ href = '/how-it-works', onNavigate }: HowItWorksLinkProps) {
  return (
    <a
      className="howto-link"
      href={href}
      title="See how to print & finish a card"
      onClick={(e) => {
        // Plain left-click → in-app navigation (preserves the in-progress card).
        // Modified clicks fall through to default so new-tab/window still work.
        if (onNavigate && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
          e.preventDefault()
          onNavigate(href)
        }
      }}
    >
      <svg
        className="howto-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 7v14" />
        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
      </svg>
      <span>How it works</span>
    </a>
  )
}
