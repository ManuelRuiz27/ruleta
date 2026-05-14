import { useEffect, useState, type RefObject } from 'react'
import type { Flag, Participant, RouletteStatus } from '../types/tournament'
import { AssetImage } from './AssetImage'

type RouletteAreaProps = {
  captureRef: RefObject<HTMLDivElement | null>
  flags: Flag[]
  isFeatured: boolean
  participant: Participant | null
  selectedFlag: Flag | null
  status: RouletteStatus
}

function getInitials(label: string) {
  return label
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()
}

export function RouletteArea({
  captureRef,
  flags,
  isFeatured,
  participant,
  selectedFlag,
  status,
}: RouletteAreaProps) {
  const isSpinning = status === 'spinning'
  const [rollingFlag, setRollingFlag] = useState<Flag | null>(flags[0] ?? null)
  const displayedFlag = selectedFlag ?? (isSpinning ? rollingFlag : null)

  useEffect(() => {
    if (!isSpinning) return

    let timeoutId: number | null = null
    const startedAt = window.performance.now()

    function scheduleNextFlag() {
      const randomIndex = Math.floor(Math.random() * flags.length)
      setRollingFlag(flags[randomIndex] ?? null)

      const elapsed = window.performance.now() - startedAt
      const nextDelay = elapsed < 900 ? 52 : elapsed < 1750 ? 90 : 145
      timeoutId = window.setTimeout(scheduleNextFlag, nextDelay)
    }

    timeoutId = window.setTimeout(scheduleNextFlag, 52)

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [flags, isSpinning])

  return (
    <section
      className={`roulette-shell ${isFeatured ? 'is-featured' : ''}`}
      aria-label="Area de ruleta"
    >
      <div
        className={`roulette-capture ${isSpinning ? 'is-spinning' : ''}`}
        ref={captureRef}
      >
        <div className="capture-header">
          <span>Ronda mundialista</span>
          <strong>{participant?.label ?? 'Torneo completado'}</strong>
        </div>

        <div className="match-stage">
          <div className="participant-panel">
            {participant ? (
              <AssetImage
                alt={participant.label}
                className="participant-image"
                fallbackLabel={getInitials(participant.label)}
                key={participant.id}
                src={participant.imageUrl}
              />
            ) : (
              <div className="participant-image asset-fallback" role="img" aria-label="Sin participante">
                <span>FIN</span>
              </div>
            )}
            <span>{participant?.label ?? 'Sin rondas pendientes'}</span>
          </div>

          <div className="route-connector" aria-hidden="true">
            <span />
            <strong>Representa</strong>
            <span />
          </div>

          <div className={`flag-panel ${isSpinning ? 'is-rolling' : ''}`}>
            {displayedFlag ? (
              <AssetImage
                alt={displayedFlag.name}
                className="flag-image"
                fallbackLabel={displayedFlag.name.slice(0, 3).toUpperCase()}
                key={displayedFlag.id}
                src={displayedFlag.imageUrl}
              />
            ) : (
              <div className="flag-image flag-empty" aria-label="Bandera pendiente" role="img" />
            )}
            <span>{displayedFlag?.name ?? ''}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
