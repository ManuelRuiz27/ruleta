import { useCallback, useEffect, useRef, useState } from 'react'
import type { Flag, RouletteStatus } from '../types/tournament'
import { pickAvailableFlag } from '../utils/randomPicker'

const SPIN_DURATION_MS = 2500
const CAPTURED_PAUSE_MS = 180

type UseRouletteOptions = {
  flags: Flag[]
  initialSelectedFlagId: string | null
  initialStatus: RouletteStatus
  isTournamentCompleted: boolean
  usedFlagIds: string[]
}

export function useRoulette({
  flags,
  initialSelectedFlagId,
  initialStatus,
  isTournamentCompleted,
  usedFlagIds,
}: UseRouletteOptions) {
  const initialSelectedFlag =
    flags.find((flag) => flag.id === initialSelectedFlagId) ?? null
  const initialSafeStatus = isTournamentCompleted ? 'completed' : initialStatus
  const [status, setStatus] = useState<RouletteStatus>(initialSafeStatus)
  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(initialSelectedFlag)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearSpinTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => clearSpinTimeout, [clearSpinTimeout])

  const startRoulette = useCallback(() => {
    if (status !== 'idle') return
    if (isTournamentCompleted) {
      setStatus('completed')
      return
    }

    try {
      pickAvailableFlag(flags, usedFlagIds)
    } catch (error) {
      setStatus('completed')
      setErrorMessage(error instanceof Error ? error.message : 'No hay banderas disponibles')
      return
    }

    setErrorMessage(null)
    setSelectedFlag(null)
    setStatus('spinning')
    clearSpinTimeout()

    timeoutRef.current = window.setTimeout(() => {
      try {
        const winner = pickAvailableFlag(flags, usedFlagIds)
        setSelectedFlag(winner)
        setStatus('stopped')
      } catch (error) {
        setStatus('completed')
        setErrorMessage(error instanceof Error ? error.message : 'No hay banderas disponibles')
      }
    }, SPIN_DURATION_MS)
  }, [clearSpinTimeout, flags, isTournamentCompleted, status, usedFlagIds])

  const finishCapture = useCallback(
    (completed: boolean) => {
      clearSpinTimeout()
      setStatus('captured')
      setSelectedFlag(null)
      setErrorMessage(null)

      timeoutRef.current = window.setTimeout(() => {
        setStatus(completed ? 'completed' : 'idle')
      }, CAPTURED_PAUSE_MS)
    },
    [clearSpinTimeout],
  )

  const resetTournament = useCallback(() => {
    clearSpinTimeout()
    setSelectedFlag(null)
    setErrorMessage(null)
    setStatus('idle')
  }, [clearSpinTimeout])

  return {
    errorMessage,
    finishCapture,
    resetTournament,
    selectedFlag,
    startRoulette,
    status,
  }
}
