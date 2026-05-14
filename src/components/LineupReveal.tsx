import type { CSSProperties } from 'react'
import type { Participant } from '../types/tournament'
import { AssetImage } from './AssetImage'

type LineupRevealProps = {
  participants: Participant[]
}

export function LineupReveal({ participants }: LineupRevealProps) {
  return (
    <section className="lineup-reveal" aria-live="polite">
      <header>
        <span>Sorteo de orden</span>
        <strong>Orden de participacion</strong>
      </header>
      <div className="lineup-grid">
        {participants.map((participant, index) => (
          <article
            className="lineup-card"
            key={participant.id}
            style={{ '--lineup-delay': `${index * 72}ms` } as CSSProperties}
          >
            <div className="lineup-number">{index + 1}</div>
            <AssetImage
              alt={participant.label}
              className="lineup-image"
              fallbackLabel={participant.label.slice(0, 2).toUpperCase()}
              src={participant.imageUrl}
            />
            <strong>{participant.label}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
