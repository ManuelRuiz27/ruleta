import type { Assignment } from '../types/tournament'

type GroupSlotProps = {
  assignment: Assignment | undefined
  group: string
  isHighlighted: boolean
  slot: number
}

export function GroupSlot({ assignment, group, isHighlighted, slot }: GroupSlotProps) {
  const hasScreenshot = Boolean(assignment?.screenshotDataUrl)

  return (
    <li
      className={`group-slot ${assignment ? 'is-filled' : ''} ${
        isHighlighted ? 'is-highlighted' : ''
      }`}
      data-slot-id={`${group}-${slot}`}
    >
      <div className="slot-index">{slot}</div>
      {assignment && hasScreenshot ? (
        <img
          alt={`${assignment.participantLabel} con ${assignment.flagName}`}
          className="slot-capture"
          src={assignment.screenshotDataUrl}
        />
      ) : assignment ? (
        <div className="slot-reconstructed">
          <img
            alt={assignment.participantLabel}
            className="slot-reconstructed-participant"
            src={assignment.participantImageUrl}
          />
          <div className="slot-reconstructed-meta">
            <strong>{assignment.participantLabel}</strong>
            <span>{assignment.flagName}</span>
          </div>
          <img
            alt={assignment.flagName}
            className="slot-reconstructed-flag"
            src={assignment.flagImageUrl}
          />
        </div>
      ) : (
        <div className="slot-placeholder">Pendiente</div>
      )}
    </li>
  )
}
