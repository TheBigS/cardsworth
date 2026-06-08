import type { RefObject } from 'react'
import type { CardState } from '../hooks/useCardState'
import { renderMarkdown } from '../utils/markdown'

interface CardBackProps {
  card: CardState
  bodyRef?: RefObject<HTMLDivElement>
}

export function CardBack({ card, bodyRef }: CardBackProps) {
  const style = {
    '--border-color': card.borderColor,
    '--body-font-size': `${card.bodyFontSize}px`,
  } as React.CSSProperties

  return (
    <div className="card card-back" style={style}>
      <div className="card-inner">
        <div
          ref={bodyRef}
          className="card-body card-body-full"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(card.backMarkdown) }}
        />
      </div>
    </div>
  )
}
