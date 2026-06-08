import type { RefObject } from 'react'
import type { CardState } from '../hooks/useCardState'
import { renderMarkdown } from '../utils/markdown'

interface CardFrontProps {
  card: CardState
  bodyRef?: RefObject<HTMLDivElement>
}

export function CardFront({ card, bodyRef }: CardFrontProps) {
  const style = {
    '--border-color': card.borderColor,
    '--title-font-size': `${card.titleFontSize}px`,
    '--body-font-size': `${card.bodyFontSize}px`,
  } as React.CSSProperties

  const imageStyle = card.imageDataUrl ? {
    backgroundImage: `url(${card.imageDataUrl})`,
    backgroundSize: card.imagePadding ? 'contain' : 'cover',
    backgroundPosition: `center ${card.imageCropY}%`,
    backgroundRepeat: 'no-repeat',
  } as React.CSSProperties : undefined

  return (
    <div className="card card-front" style={style}>
      <div className="card-inner">
        <div className="card-title">{card.title || 'Untitled'}</div>

        {card.imageEnabled && card.imageDataUrl && (
          <div
            className={`card-image-container ${card.imagePadding ? 'with-padding' : ''}`}
            style={imageStyle}
          />
        )}

        <div
          ref={bodyRef}
          className="card-body"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(card.frontMarkdown) }}
        />
      </div>
    </div>
  )
}
