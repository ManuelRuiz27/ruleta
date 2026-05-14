import type { GroupName } from '../types/tournament'

export type GroupAssignment = {
  group: GroupName
  slot: number
}

export function getGroupByIndex(index: number): GroupAssignment {
  if (index >= 0 && index <= 3) return { group: 'A', slot: index + 1 }
  if (index >= 4 && index <= 7) return { group: 'B', slot: index - 3 }
  if (index >= 8 && index <= 11) return { group: 'C', slot: index - 7 }

  throw new Error('Indice fuera de rango')
}
