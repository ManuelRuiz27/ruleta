import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type { Assignment, GroupName } from '../types/tournament'
import { GroupTable } from './GroupTable'

type GroupsBoardProps = {
  assignments: Assignment[]
  boardRef: RefObject<HTMLDivElement | null>
  highlightedSlotId: string | null
  totalRounds: number
}

const groups: GroupName[] = ['A', 'B', 'C']

export function GroupsBoard({
  assignments,
  boardRef,
  highlightedSlotId,
  totalRounds,
}: GroupsBoardProps) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const latestSlotId = useMemo(() => {
    const latestAssignment = assignments.at(-1)

    if (!latestAssignment) return null

    return `${latestAssignment.group}-${latestAssignment.groupSlot}`
  }, [assignments])
  const activeSlotId = highlightedSlotId ?? latestSlotId

  useEffect(() => {
    if (!activeSlotId) return

    const scrollArea = scrollAreaRef.current
    const targetSlot = scrollArea?.querySelector<HTMLElement>(`[data-slot-id="${activeSlotId}"]`)

    if (!scrollArea || !targetSlot) return

    const scrollAreaRect = scrollArea.getBoundingClientRect()
    const targetRect = targetSlot.getBoundingClientRect()
    const centeredTop =
      scrollArea.scrollTop +
      targetRect.top -
      scrollAreaRect.top -
      (scrollArea.clientHeight - targetRect.height) / 2

    scrollArea.scrollTo({
      behavior: 'smooth',
      top: Math.max(centeredTop, 0),
    })
  }, [activeSlotId])

  return (
    <aside className="groups-shell" aria-label="Tablero de grupos" ref={boardRef}>
      <div className="groups-heading">
        <span>Tabla oficial</span>
        <strong>
          {assignments.length}/{totalRounds}
        </strong>
      </div>
      <div className="groups-grid" ref={scrollAreaRef}>
        {groups.map((group) => (
          <GroupTable
            assignments={assignments}
            group={group}
            highlightedSlotId={highlightedSlotId}
            key={group}
          />
        ))}
      </div>
    </aside>
  )
}
