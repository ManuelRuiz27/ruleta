import { toPng } from 'html-to-image'

export async function captureNode(node: HTMLElement): Promise<string> {
  return toPng(node, {
    cacheBust: true,
    pixelRatio: 1,
    backgroundColor: '#101012',
  })
}

export async function captureNodeWithTimeout(
  node: HTMLElement,
  timeoutMs = 2200,
): Promise<string | null> {
  let timeoutId: number | null = null

  try {
    return await Promise.race([
      captureNode(node),
      new Promise<null>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(null), timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId)
  }
}

export function createFallbackCaptureDataUrl(participantLabel: string, flagName: string) {
  const escapedParticipant = escapeSvg(participantLabel)
  const escapedFlag = escapeSvg(flagName)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560">
      <rect width="1000" height="560" fill="#105018"/>
      <rect x="28" y="28" width="944" height="504" rx="10" fill="#0a3812" stroke="#b0c808" stroke-width="4"/>
      <text x="500" y="116" fill="#70b830" font-family="Verdana, sans-serif" font-size="32" font-weight="700" text-anchor="middle">Ronda mundialista</text>
      <text x="500" y="250" fill="#ffffff" font-family="Verdana, sans-serif" font-size="54" font-weight="800" text-anchor="middle">${escapedParticipant}</text>
      <text x="500" y="326" fill="#b0c808" font-family="Verdana, sans-serif" font-size="32" font-weight="800" text-anchor="middle">Representa</text>
      <text x="500" y="422" fill="#ffffff" font-family="Verdana, sans-serif" font-size="60" font-weight="900" text-anchor="middle">${escapedFlag}</text>
    </svg>
  `

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function escapeSvg(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement('a')
  link.download = fileName
  link.href = dataUrl
  link.click()
}

export function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}
