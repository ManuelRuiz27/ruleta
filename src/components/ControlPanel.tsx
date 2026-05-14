type ControlPanelProps = {
  assignmentCount: number
  canCapture: boolean
  canStart: boolean
  isCapturing: boolean
  isFullscreen: boolean
  message: string
  onCapture: () => void
  onExport: () => void
  onToggleFullscreen: () => void
  onReset: () => void
  onStart: () => void
}

export function ControlPanel({
  assignmentCount,
  canCapture,
  canStart,
  isCapturing,
  isFullscreen,
  message,
  onCapture,
  onExport,
  onToggleFullscreen,
  onReset,
  onStart,
}: ControlPanelProps) {
  return (
    <section className="control-panel" aria-label="Controles del operador">
      <div className="control-actions">
        <button disabled={!canStart} onClick={onStart} type="button">
          Iniciar ruleta
        </button>
        <button disabled={!canCapture || isCapturing} onClick={onCapture} type="button">
          {isCapturing ? 'Capturando' : 'Capturar resultado'}
        </button>
        <button disabled={assignmentCount === 0} onClick={onExport} type="button">
          Exportar tablero
        </button>
        <button onClick={onToggleFullscreen} type="button">
          {isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
        </button>
        <button className="button-danger" onClick={onReset} type="button">
          Reiniciar torneo
        </button>
      </div>
      <p className="operator-message" aria-live="polite">
        {message}
      </p>
    </section>
  )
}
