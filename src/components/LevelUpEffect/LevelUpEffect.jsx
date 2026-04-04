import { useEffect } from 'react'
import './LevelUpEffect.css'

// ── Constants ──────────────────────────────────────────────────────────────
const CX = 150
const CY = 150

function polar(r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

// Outer ring: 12 tick marks (every 30°), long at cardinal points
const TICKS = Array.from({ length: 12 }, (_, i) => {
  const angle = i * 30
  const isLong = i % 3 === 0
  const inner = polar(isLong ? 117 : 122, angle)
  const outer = polar(isLong ? 143 : 138, angle)
  return { id: i, isLong, x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y }
})

// Middle ring: 8 diamonds (every 45°)
const DIAMONDS = Array.from({ length: 8 }, (_, i) => {
  const angle = i * 45
  const { x, y } = polar(108, angle)
  return { id: i, x, y, angle }
})

// Inner ring: 4 triangles (every 90°)
const TRIANGLES = [0, 90, 180, 270].map((angle) => {
  const { x, y } = polar(78, angle)
  return { angle, x, y }
})

// Particles: pre-generated so they don't change on re-render
const PARTICLES = [
  { id: 0,  startX: -28, drift: -18, size: 3, delay: 0.05, dur: 2.1 },
  { id: 1,  startX:  22, drift:  28, size: 2, delay: 0.28, dur: 1.8 },
  { id: 2,  startX: -52, drift:  12, size: 4, delay: 0.0,  dur: 2.3 },
  { id: 3,  startX:  42, drift: -14, size: 2, delay: 0.48, dur: 1.6 },
  { id: 4,  startX: -14, drift:  22, size: 3, delay: 0.18, dur: 2.0 },
  { id: 5,  startX:  58, drift: -32, size: 2, delay: 0.38, dur: 1.9 },
  { id: 6,  startX: -38, drift:  42, size: 5, delay: 0.08, dur: 2.2 },
  { id: 7,  startX:  12, drift:  -8, size: 2, delay: 0.62, dur: 1.7 },
  { id: 8,  startX: -62, drift:  16, size: 3, delay: 0.32, dur: 2.4 },
  { id: 9,  startX:  36, drift:  22, size: 2, delay: 0.72, dur: 1.5 },
  { id: 10, startX: -22, drift: -38, size: 4, delay: 0.22, dur: 2.0 },
  { id: 11, startX:  62, drift:   6, size: 2, delay: 0.52, dur: 1.8 },
  { id: 12, startX: -8,  drift:  34, size: 3, delay: 0.02, dur: 2.2 },
  { id: 13, startX:  48, drift: -24, size: 2, delay: 0.82, dur: 1.6 },
  { id: 14, startX: -46, drift:  -4, size: 3, delay: 0.42, dur: 2.0 },
  { id: 15, startX:  18, drift:  48, size: 2, delay: 0.58, dur: 1.9 },
]

// ── Component ──────────────────────────────────────────────────────────────
export default function LevelUpEffect({ visible, onComplete }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onComplete, 3400)
    return () => clearTimeout(t)
  }, [visible, onComplete])

  if (!visible) return null

  return (
    <div className="lue-overlay">
      {/* Backdrop: dark ground glow, no blend mode */}
      <div className="lue-backdrop" />

      {/* Scene: all glow elements — screen blended */}
      <div className="lue-scene">

        {/* Light pillar */}
        <div className="lue-pillar" />

        {/* Particles */}
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="lue-particle"
            style={{
              width: p.size,
              height: p.size,
              left: `calc(50% + ${p.startX}px)`,
              marginLeft: -p.size / 2,
              '--drift': `${p.drift}px`,
              '--delay': `${p.delay}s`,
              '--dur':   `${p.dur}s`,
            }}
          />
        ))}

        {/* Magic circle SVG */}
        <svg className="lue-circle" width="300" height="300" viewBox="0 0 300 300">
          {/* Outer ring + tick marks */}
          <g className="lue-ring-outer">
            <circle cx={CX} cy={CY} r="132" fill="none" stroke="#ffd700" strokeWidth="1.8" opacity="0.9" />
            {TICKS.map((t) => (
              <line
                key={t.id}
                x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                stroke="#ffd700"
                strokeWidth={t.isLong ? 2.8 : 1.4}
                opacity="0.95"
              />
            ))}
          </g>

          {/* Middle ring + diamonds */}
          <g className="lue-ring-mid">
            <circle cx={CX} cy={CY} r="108" fill="none" stroke="#ffd700" strokeWidth="1" opacity="0.7" strokeDasharray="6 9" />
            {DIAMONDS.map((d) => (
              <rect
                key={d.id}
                x={d.x - 4} y={d.y - 7}
                width="8" height="14"
                fill="#ffd700" opacity="0.85"
                transform={`rotate(${d.angle} ${d.x} ${d.y})`}
              />
            ))}
          </g>

          {/* Inner ring + triangles */}
          <g className="lue-ring-inner">
            <circle cx={CX} cy={CY} r="78" fill="none" stroke="#ffd700" strokeWidth="1.5" opacity="0.8" />
            {TRIANGLES.map(({ angle, x, y }) => (
              <polygon
                key={angle}
                points="0,-9 -6,6 6,6"
                fill="#ffd700" opacity="0.95"
                transform={`translate(${x} ${y}) rotate(${angle})`}
              />
            ))}
          </g>

          {/* Connecting lines (cardinal cross inside inner ring) */}
          <g opacity="0.35">
            <line x1={CX} y1={CY - 70} x2={CX} y2={CY + 70} stroke="#ffd700" strokeWidth="1" />
            <line x1={CX - 70} y1={CY} x2={CX + 70} y2={CY} stroke="#ffd700" strokeWidth="1" />
          </g>

          {/* Center glow */}
          <circle cx={CX} cy={CY} r="18" fill="#ffd700" opacity="0.5" className="lue-center-glow" />
          <circle cx={CX} cy={CY} r="8"  fill="white"  opacity="0.95" />
        </svg>

        {/* LEVEL UP text */}
        <div className="lue-text">LEVEL UP!</div>
      </div>
    </div>
  )
}
