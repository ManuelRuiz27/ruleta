import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { GroupsBoard } from './components/GroupsBoard'
import { LineupReveal } from './components/LineupReveal'
import { RouletteArea } from './components/RouletteArea'
import { flags } from './data/flags'
import { participants } from './data/participants'
import { useKeyboardControls } from './hooks/useKeyboardControls'
import { useRoulette } from './hooks/useRoulette'
import type { Assignment, Participant, RouletteStatus } from './types/tournament'
import {
  captureNode,
  captureNodeWithTimeout,
  createFallbackCaptureDataUrl,
  downloadDataUrl,
  waitForPaint,
} from './utils/captureNode'
import { getGroupByIndex } from './utils/groupAssignment'
import {
  playComplete,
  playFlight,
  playLand,
  playReveal,
  playSpinStart,
  unlockAudio,
} from './utils/soundEffects'
import './styles/app.css'

const STORAGE_KEY = 'torneo-ruleta-state'
const TOTAL_ROUNDS = Math.min(participants.length, flags.length)
const ZOOM_IN_MS = 520
const LINEUP_REVEAL_MS = 3600
const REVEAL_HOLD_MS = 760
const FLIGHT_MS = 980
const GROUP_REVEAL_MS = 8000

type PresentationPhase =
  | 'normal'
  | 'lineupReveal'
  | 'zooming'
  | 'spinningZoomed'
  | 'revealing'
  | 'capturing'
  | 'flyingToSlot'
  | 'groupReveal'

type FlyingCapture = {
  dataUrl: string
  style: CSSProperties
}

type StoredTournamentState = {
  assignments: Assignment[]
  currentParticipantIndex: number
  participantOrderIds: string[]
  selectedFlagId: string | null
  status: RouletteStatus
}

function toStoredAssignment(assignment: Assignment): Assignment {
  return {
    ...assignment,
    screenshotDataUrl: '',
  }
}

function isRouletteStatus(value: unknown): value is RouletteStatus {
  return (
    value === 'idle' ||
    value === 'spinning' ||
    value === 'stopped' ||
    value === 'captured' ||
    value === 'completed'
  )
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function shuffleParticipants(source: Participant[]) {
  const shuffled = [...source]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }

  return shuffled
}

function sanitizeParticipantOrderIds(value: unknown) {
  if (!Array.isArray(value)) return []

  const validParticipantIds = new Set(participants.map((participant) => participant.id))
  const seenParticipantIds = new Set<string>()

  return value
    .filter((id): id is string => typeof id === 'string')
    .filter((id) => {
      if (!validParticipantIds.has(id) || seenParticipantIds.has(id)) return false
      seenParticipantIds.add(id)
      return true
    })
    .slice(0, TOTAL_ROUNDS)
}

function getParticipantsByOrder(orderIds: string[]) {
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]))

  return orderIds
    .map((participantId) => participantsById.get(participantId))
    .filter((participant): participant is Participant => Boolean(participant))
}

function loadStoredState(): StoredTournamentState {
  const fallback: StoredTournamentState = {
    assignments: [],
    currentParticipantIndex: 0,
    participantOrderIds: [],
    selectedFlagId: null,
    status: 'idle',
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback

    const parsed = JSON.parse(raw) as Partial<StoredTournamentState>
    const validFlagIds = new Set(flags.map((flag) => flag.id))
    const validParticipantIds = new Set(participants.map((participant) => participant.id))
    const assignments: Assignment[] = Array.isArray(parsed.assignments)
      ? parsed.assignments
          .filter((assignment): assignment is Assignment => {
            return (
              typeof assignment === 'object' &&
              assignment !== null &&
              validFlagIds.has(assignment.flagId) &&
              validParticipantIds.has(assignment.participantId) &&
              (assignment.group === 'A' || assignment.group === 'B' || assignment.group === 'C') &&
              Number.isInteger(assignment.groupSlot)
            )
          })
          .map(toStoredAssignment)
          .slice(0, TOTAL_ROUNDS)
      : []
    const storedOrderIds = sanitizeParticipantOrderIds(parsed.participantOrderIds)
    const assignedParticipantIds = assignments.map((assignment) => assignment.participantId)
    const reconstructedOrderIds =
      assignments.length > 0
        ? [
            ...assignedParticipantIds,
            ...participants
              .map((participant) => participant.id)
              .filter((participantId) => !assignedParticipantIds.includes(participantId)),
          ].slice(0, TOTAL_ROUNDS)
        : []
    const participantOrderIds =
      storedOrderIds.length > 0 ? storedOrderIds : reconstructedOrderIds
    const boundedIndex = Math.min(
      Math.max(Number(parsed.currentParticipantIndex) || assignments.length, 0),
      participantOrderIds.length || TOTAL_ROUNDS,
    )
    const safeStatus = isRouletteStatus(parsed.status) ? parsed.status : 'idle'
    const status = safeStatus === 'spinning' || safeStatus === 'captured' ? 'idle' : safeStatus

    return {
      assignments,
      currentParticipantIndex: boundedIndex,
      participantOrderIds,
      selectedFlagId: typeof parsed.selectedFlagId === 'string' ? parsed.selectedFlagId : null,
      status: assignments.length >= TOTAL_ROUNDS ? 'completed' : status,
    }
  } catch {
    return fallback
  }
}

function App() {
  const storedState = useMemo(() => loadStoredState(), [])
  const [assignments, setAssignments] = useState<Assignment[]>(storedState.assignments)
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(
    storedState.currentParticipantIndex,
  )
  const [participantOrderIds, setParticipantOrderIds] = useState<string[]>(
    storedState.participantOrderIds,
  )
  const [message, setMessage] = useState('Presiona Espacio o Enter para iniciar.')
  const [isCapturing, setIsCapturing] = useState(false)
  const [presentationPhase, setPresentationPhase] = useState<PresentationPhase>('normal')
  const [lineupParticipants, setLineupParticipants] = useState<Participant[]>([])
  const [highlightedSlotId, setHighlightedSlotId] = useState<string | null>(null)
  const [flyingCapture, setFlyingCapture] = useState<FlyingCapture | null>(null)
  const [recentAssignment, setRecentAssignment] = useState<Assignment | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const presentationPhaseRef = useRef<PresentationPhase>('normal')
  const lineupTimerRef = useRef<number | null>(null)
  const captureCurrentResultRef = useRef<((animated: boolean) => Promise<void>) | null>(null)
  const rouletteCaptureRef = useRef<HTMLDivElement | null>(null)
  const groupsBoardRef = useRef<HTMLDivElement | null>(null)

  const usedFlagIds = useMemo(
    () => assignments.map((assignment) => assignment.flagId),
    [assignments],
  )
  const orderedParticipants = useMemo(
    () => getParticipantsByOrder(participantOrderIds),
    [participantOrderIds],
  )
  const activeParticipants = orderedParticipants.length > 0 ? orderedParticipants : participants
  const currentParticipant =
    currentParticipantIndex < TOTAL_ROUNDS ? activeParticipants[currentParticipantIndex] : null
  const isTournamentCompleted = assignments.length >= TOTAL_ROUNDS

  const roulette = useRoulette({
    flags,
    initialSelectedFlagId: storedState.selectedFlagId,
    initialStatus: storedState.status,
    isTournamentCompleted,
    usedFlagIds,
  })

  const isPresentationBusy = presentationPhase !== 'normal'
  const canStart =
    roulette.status === 'idle' && !isTournamentCompleted && !isCapturing && !isPresentationBusy
  const canCapture =
    roulette.status === 'stopped' &&
    Boolean(roulette.selectedFlag) &&
    Boolean(currentParticipant) &&
    !isCapturing &&
    !isPresentationBusy
  const visibleMessage = roulette.errorMessage ?? message
  const isRouletteFeatured =
    presentationPhase === 'zooming' ||
    presentationPhase === 'spinningZoomed' ||
    presentationPhase === 'revealing' ||
    presentationPhase === 'capturing'
  const recentGroupCount = recentAssignment
    ? assignments.filter((assignment) => assignment.group === recentAssignment.group).length
    : 0

  useEffect(() => {
    presentationPhaseRef.current = presentationPhase
  }, [presentationPhase])

  useEffect(() => {
    return () => {
      if (lineupTimerRef.current !== null) {
        window.clearTimeout(lineupTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    syncFullscreenState()
    document.addEventListener('fullscreenchange', syncFullscreenState)

    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  useEffect(() => {
    const assets = [
      '/assets/recurso-3.png',
      ...participants.map((participant) => participant.imageUrl),
      ...flags.map((flag) => flag.imageUrl),
    ]

    assets.forEach((src) => {
      const image = new Image()
      image.src = src
    })
  }, [])

  useEffect(() => {
    const snapshot: StoredTournamentState = {
      assignments: assignments.map(toStoredAssignment),
      currentParticipantIndex,
      participantOrderIds,
      selectedFlagId: roulette.selectedFlag?.id ?? null,
      status: roulette.status === 'spinning' || roulette.status === 'captured' ? 'idle' : roulette.status,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [
    assignments,
    currentParticipantIndex,
    participantOrderIds,
    roulette.selectedFlag?.id,
    roulette.status,
  ])

  const startRoulettePresentation = useCallback(() => {
    presentationPhaseRef.current = 'zooming'
    playSpinStart()
    setMessage('Preparando escenario.')
    setPresentationPhase('zooming')

    window.setTimeout(() => {
      presentationPhaseRef.current = 'spinningZoomed'
      setMessage('Ruleta en marcha. Espera a que se detenga.')
      setPresentationPhase('spinningZoomed')
      roulette.startRoulette()
    }, ZOOM_IN_MS)
  }, [roulette])

  const handleStart = useCallback(() => {
    if (!canStart || presentationPhaseRef.current !== 'normal') return
    unlockAudio()

    if (participantOrderIds.length === 0 && assignments.length === 0) {
      const nextLineupParticipants = shuffleParticipants(participants).slice(0, TOTAL_ROUNDS)

      presentationPhaseRef.current = 'lineupReveal'
      setParticipantOrderIds(nextLineupParticipants.map((participant) => participant.id))
      setLineupParticipants(nextLineupParticipants)
      setMessage('Sorteando orden de participantes.')
      setPresentationPhase('lineupReveal')

      lineupTimerRef.current = window.setTimeout(() => {
        lineupTimerRef.current = null
        setLineupParticipants([])
        startRoulettePresentation()
      }, LINEUP_REVEAL_MS)
      return
    }

    startRoulettePresentation()
  }, [assignments.length, canStart, participantOrderIds.length, startRoulettePresentation])

  useKeyboardControls({
    disabled: !canStart,
    onStart: handleStart,
  })

  const runFlightAnimation = useCallback(async (dataUrl: string, slotId: string) => {
    const originElement = rouletteCaptureRef.current
    const targetElement = document.querySelector<HTMLElement>(`[data-slot-id="${slotId}"]`)

    if (!originElement || !targetElement) return

    const origin = originElement.getBoundingClientRect()
    targetElement.scrollIntoView({ block: 'center', inline: 'center' })
    await delay(80)
    const destination = targetElement.getBoundingClientRect()
    const scale = Math.max(destination.width / origin.width, 0.12)

    setFlyingCapture({
      dataUrl,
      style: {
        '--fly-h0': `${origin.height}px`,
        '--fly-scale': `${scale}`,
        '--fly-w0': `${origin.width}px`,
        '--fly-x0': `${origin.left}px`,
        '--fly-x1': `${destination.left}px`,
        '--fly-xm': `${(origin.left + destination.left) / 2}px`,
        '--fly-y0': `${origin.top}px`,
        '--fly-y1': `${destination.top}px`,
        '--fly-ym': `${(origin.top + destination.top) / 2 - 90}px`,
      } as CSSProperties,
    })
    playFlight()
    setPresentationPhase('flyingToSlot')
    await delay(FLIGHT_MS)
    setFlyingCapture(null)
  }, [])

  const captureCurrentResult = useCallback(
    async (animated: boolean) => {
      if (!currentParticipant || !roulette.selectedFlag || !rouletteCaptureRef.current) {
        setMessage('La captura solo esta disponible cuando el resultado ya esta detenido.')
        return
      }

      setIsCapturing(true)
      setPresentationPhase(animated ? 'capturing' : 'normal')
      setMessage(animated ? 'Capturando resultado ampliado.' : 'Generando captura del resultado.')

      try {
        const groupPosition = getGroupByIndex(assignments.length)
        const slotId = `${groupPosition.group}-${groupPosition.slot}`

        setHighlightedSlotId(slotId)
        await waitForPaint()
        const capturedDataUrl = animated
          ? await captureNodeWithTimeout(rouletteCaptureRef.current)
          : await captureNode(rouletteCaptureRef.current)
        const screenshotDataUrl =
          capturedDataUrl ??
          createFallbackCaptureDataUrl(currentParticipant.label, roulette.selectedFlag.name)
        const assignment: Assignment = {
          id: `${currentParticipant.id}-${roulette.selectedFlag.id}-${Date.now()}`,
          participantId: currentParticipant.id,
          participantLabel: currentParticipant.label,
          participantImageUrl: currentParticipant.imageUrl,
          flagId: roulette.selectedFlag.id,
          flagName: roulette.selectedFlag.name,
          flagImageUrl: roulette.selectedFlag.imageUrl,
          screenshotDataUrl,
          group: groupPosition.group,
          groupSlot: groupPosition.slot,
          createdAt: new Date().toISOString(),
        }
        const nextAssignments = [...assignments, assignment]
        const completed = nextAssignments.length >= TOTAL_ROUNDS

        if (animated) {
          setMessage('Enviando resultado al grupo correspondiente.')
          await runFlightAnimation(screenshotDataUrl, slotId)
        }

        setAssignments(nextAssignments)
        setCurrentParticipantIndex(Math.min(nextAssignments.length, TOTAL_ROUNDS))
        setRecentAssignment(assignment)
        setPresentationPhase('groupReveal')
        if (completed) {
          playComplete()
        } else {
          playLand()
        }
        setMessage(
          completed
            ? 'Torneo completado. El tablero ya esta listo.'
            : 'Captura guardada. Siguiente participante listo.',
        )
        await delay(GROUP_REVEAL_MS)
        setRecentAssignment(null)
        roulette.finishCapture(completed)
        setPresentationPhase('normal')
        setHighlightedSlotId(null)
      } catch {
        setMessage('No se pudo generar la captura. Intenta capturar de nuevo.')
        setPresentationPhase('normal')
      } finally {
        setIsCapturing(false)
      }
    },
    [assignments, currentParticipant, roulette, runFlightAnimation],
  )

  useEffect(() => {
    captureCurrentResultRef.current = captureCurrentResult
  }, [captureCurrentResult])

  useEffect(() => {
    if (
      roulette.status !== 'stopped' ||
      presentationPhaseRef.current !== 'spinningZoomed' ||
      !roulette.selectedFlag
    ) {
      return
    }

    let captureTimer: number | null = null
    const revealTimer = window.setTimeout(() => {
      setPresentationPhase('revealing')
      setMessage('Resultado confirmado.')
      playReveal()

      captureTimer = window.setTimeout(() => {
        void captureCurrentResultRef.current?.(true)
      }, REVEAL_HOLD_MS)
    }, 120)

    return () => {
      window.clearTimeout(revealTimer)
      if (captureTimer !== null) window.clearTimeout(captureTimer)
    }
  }, [roulette.selectedFlag, roulette.status])

  const handleCapture = useCallback(async () => {
    if (!canCapture) {
      setMessage('La captura solo esta disponible cuando el resultado ya esta detenido.')
      return
    }

    await captureCurrentResult(false)
  }, [canCapture, captureCurrentResult])

  const handleReset = useCallback(() => {
    const confirmed = window.confirm('Esto limpiara todas las asignaciones. Deseas reiniciar?')
    if (!confirmed) return

    localStorage.removeItem(STORAGE_KEY)
    if (lineupTimerRef.current !== null) {
      window.clearTimeout(lineupTimerRef.current)
      lineupTimerRef.current = null
    }
    setAssignments([])
    setCurrentParticipantIndex(0)
    setParticipantOrderIds([])
    setLineupParticipants([])
    setFlyingCapture(null)
    setHighlightedSlotId(null)
    setRecentAssignment(null)
    presentationPhaseRef.current = 'normal'
    setPresentationPhase('normal')
    roulette.resetTournament()
    setMessage('Torneo reiniciado. Presiona Espacio o Enter para iniciar.')
  }, [roulette])

  const handleExport = useCallback(async () => {
    if (!groupsBoardRef.current) return

    setMessage('Exportando tablero de grupos.')

    try {
      await waitForPaint()
      const dataUrl = await captureNode(groupsBoardRef.current)
      downloadDataUrl(dataUrl, `tablero-torneo-${new Date().toISOString().slice(0, 10)}.png`)
      setMessage('Tablero exportado como PNG.')
    } catch {
      setMessage('No se pudo exportar el tablero.')
    }
  }, [])

  const handleToggleFullscreen = useCallback(async () => {
    unlockAudio()

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      setMessage('No se pudo cambiar el modo de pantalla completa.')
    }
  }, [])

  return (
    <main className={`app-shell presentation-${presentationPhase}`}>
      {isRouletteFeatured ||
      presentationPhase === 'lineupReveal' ||
      presentationPhase === 'flyingToSlot' ||
      presentationPhase === 'groupReveal' ? (
        <div className="presentation-overlay" />
      ) : null}
      {presentationPhase === 'lineupReveal' ? (
        <LineupReveal participants={lineupParticipants} />
      ) : null}
      {recentAssignment ? (
        <section className="group-reveal" aria-live="polite">
          <span>Asignacion confirmada</span>
          <strong>Grupo {recentAssignment.group}</strong>
          <p>
            {recentAssignment.participantLabel} representa a {recentAssignment.flagName}
          </p>
          <small>
            Posicion {recentAssignment.groupSlot} de 4
            {recentGroupCount === 4 ? ' - Grupo completo' : ''}
          </small>
        </section>
      ) : null}
      {flyingCapture ? (
        <img
          alt="Resultado asignado en movimiento"
          className="flying-capture"
          src={flyingCapture.dataUrl}
          style={flyingCapture.style}
        />
      ) : null}
      <header className="app-header">
        <img
          alt="Potosi sin limites - INPOJUVE"
          className="institutional-logo"
          src="/assets/recurso-3.png"
        />
        <div className="event-title">
          <span>Torneo rapido</span>
          <h1>Ruleta Mundialista</h1>
          <p>
            Control local para {TOTAL_ROUNDS} participantes, banderas sin repeticion y grupos
            automaticos.
          </p>
        </div>
      </header>

      <div className="app-layout">
        <div className="left-stack">
          <RouletteArea
            captureRef={rouletteCaptureRef}
            flags={flags}
            isFeatured={isRouletteFeatured}
            participant={currentParticipant}
            selectedFlag={roulette.selectedFlag}
            status={roulette.status}
          />
          <ControlPanel
            assignmentCount={assignments.length}
            canCapture={canCapture}
            canStart={canStart}
            isCapturing={isCapturing}
            isFullscreen={isFullscreen}
            message={visibleMessage}
            onCapture={handleCapture}
            onExport={handleExport}
            onToggleFullscreen={handleToggleFullscreen}
            onReset={handleReset}
            onStart={handleStart}
          />
        </div>

        <GroupsBoard
          assignments={assignments}
          boardRef={groupsBoardRef}
          highlightedSlotId={highlightedSlotId}
          totalRounds={TOTAL_ROUNDS}
        />
      </div>
    </main>
  )
}

export default App
