import { useEffect } from 'react'

type KeyboardControlOptions = {
  disabled: boolean
  onStart: () => void
}

export function useKeyboardControls({ disabled, onStart }: KeyboardControlOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (disabled || event.repeat) return

      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault()
        onStart()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, onStart])
}
