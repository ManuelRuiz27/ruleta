import type { Assignment, GroupName } from '../types/tournament'
import { GroupSlot } from './GroupSlot'

type GroupTableProps = {
  assignments: Assignment[]
  group: GroupName
  highlightedSlotId: string | null
}

export function GroupTable({ assignments, group, highlightedSlotId }: GroupTableProps) {
  return (
    <section className="group-table" aria-label={`Grupo ${group}`}>
      <header>
        <span>Grupo</span>
        <strong>{group}</strong>
      </header>
      <ol>
        {[1, 2, 3, 4].map((slot) => (
          <GroupSlot
            assignment={assignments.find(
              (assignment) => assignment.group === group && assignment.groupSlot === slot,
            )}
            group={group}
            isHighlighted={highlightedSlotId === `${group}-${slot}`}
            key={`${group}-${slot}`}
            slot={slot}
          />
        ))}
      </ol>
    </section>
  )
}
