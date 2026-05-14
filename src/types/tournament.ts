export type RouletteStatus =
  | 'idle'
  | 'spinning'
  | 'stopped'
  | 'captured'
  | 'completed'

export type GroupName = 'A' | 'B' | 'C'

export type Participant = {
  id: string
  label: string
  imageUrl: string
}

export type Flag = {
  id: string
  name: string
  imageUrl: string
}

export type Assignment = {
  id: string
  participantId: string
  participantLabel: string
  participantImageUrl: string
  flagId: string
  flagName: string
  flagImageUrl: string
  screenshotDataUrl: string
  group: GroupName
  groupSlot: number
  createdAt: string
}
