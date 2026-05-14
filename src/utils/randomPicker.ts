import type { Flag } from '../types/tournament'

export function pickAvailableFlag(flags: Flag[], usedFlagIds: string[]): Flag {
  const used = new Set(usedFlagIds)
  const availableFlags = flags.filter((flag) => !used.has(flag.id))

  if (availableFlags.length === 0) {
    throw new Error('No quedan banderas disponibles')
  }

  const randomIndex = Math.floor(Math.random() * availableFlags.length)

  return availableFlags[randomIndex]
}
