import { useEffect } from 'react'

// multiplier > 1.10 → critical hit (yellow), otherwise normal (red-orange)
function isCrit(multiplier) {
  return multiplier >= 1.10
}

export default function DamageNumber({ damage, multiplier, visible, onComplete }) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => onComplete?.(), 850)
    return () => clearTimeout(timer)
  }, [visible, onComplete])

  if (!visible || damage == null) return null

  const crit = isCrit(multiplier)

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 30,
        animation: 'damage-float 0.85s ease-out forwards',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          fontSize: crit ? '1.9rem' : '1.5rem',
          fontWeight: 900,
          fontFamily: '"Inter", monospace',
          letterSpacing: '0.03em',
          color: crit ? '#FFD700' : '#FF4444',
          textShadow: crit
            ? '0 0 12px #FF8C00, 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000'
            : '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
        }}
      >
        {crit && <span style={{ fontSize: '0.75em', marginRight: 3 }}>CRIT!</span>}
        -{damage}
      </span>
    </div>
  )
}
