let audioContext: AudioContext | null = null

function getAudioContext() {
  audioContext ??= new AudioContext()
  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }

  return audioContext
}

function tone(frequency: number, startAt: number, duration: number, gain = 0.04) {
  const context = getAudioContext()
  const oscillator = context.createOscillator()
  const volume = context.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, startAt)
  volume.gain.setValueAtTime(0.0001, startAt)
  volume.gain.exponentialRampToValueAtTime(gain, startAt + 0.02)
  volume.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(volume)
  volume.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

export function unlockAudio() {
  getAudioContext()
}

export function playSpinStart() {
  const context = getAudioContext()
  const now = context.currentTime
  tone(220, now, 0.09, 0.035)
  tone(330, now + 0.08, 0.1, 0.035)
  tone(440, now + 0.16, 0.12, 0.04)
}

export function playReveal() {
  const context = getAudioContext()
  const now = context.currentTime
  tone(523.25, now, 0.11, 0.045)
  tone(659.25, now + 0.1, 0.13, 0.045)
  tone(783.99, now + 0.22, 0.2, 0.05)
}

export function playFlight() {
  const context = getAudioContext()
  const now = context.currentTime
  tone(392, now, 0.08, 0.03)
  tone(587.33, now + 0.12, 0.09, 0.035)
}

export function playLand() {
  const context = getAudioContext()
  const now = context.currentTime
  tone(783.99, now, 0.08, 0.045)
  tone(1046.5, now + 0.08, 0.18, 0.05)
}

export function playComplete() {
  const context = getAudioContext()
  const now = context.currentTime
  ;[523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    tone(frequency, now + index * 0.09, 0.18, 0.045)
  })
}
