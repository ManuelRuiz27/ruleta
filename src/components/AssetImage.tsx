import { useState } from 'react'

type AssetImageProps = {
  alt: string
  className?: string
  fallbackLabel: string
  src: string
}

export function AssetImage({ alt, className, fallbackLabel, src }: AssetImageProps) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div aria-label={alt} className={`${className ?? ''} asset-fallback`} role="img">
        <span>{fallbackLabel}</span>
      </div>
    )
  }

  return (
    <img
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setHasError(true)}
      src={src}
    />
  )
}
