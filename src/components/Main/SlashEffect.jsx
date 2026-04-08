import { useEffect, useRef } from 'react'
import * as PIXI from 'pixi.js'

const C = {
  edge:   0xFF6B00,
  orange: 0xFFA500,
  gold:   0xFFD700,
  bright: 0xFFFF88,
  core:   0xFFFFFF,
  pGold:  0xFFD700,
  pYel:   0xFFFF00,
}

// deCasteljau: partial quadratic bezier from t=0 to t=T
function splitQuad(P0x, P0y, Bx, By, P2x, P2y, T) {
  const t = Math.max(0, Math.min(T, 1))
  return {
    ctrl: { x: (1 - t) * P0x + t * Bx, y: (1 - t) * P0y + t * By },
    end: {
      x: (1 - t) ** 2 * P0x + 2 * (1 - t) * t * Bx + t ** 2 * P2x,
      y: (1 - t) ** 2 * P0y + 2 * (1 - t) * t * By + t ** 2 * P2y,
    },
  }
}

// Thickness: thin at start/end, thick at peak (sin profile)
const slashThick = (p) => 4 + 20 * Math.sin(Math.max(0, Math.min(p, 1)) * Math.PI)

export default function SlashEffect({ visible, onComplete, onShakeReady }) {
  const wrapRef = useRef(null)
  const onCompleteRef   = useRef(onComplete)
  const onShakeReadyRef = useRef(onShakeReady)

  // Keep refs current without restarting the animation
  useEffect(() => { onCompleteRef.current   = onComplete   }, [onComplete])
  useEffect(() => { onShakeReadyRef.current = onShakeReady }, [onShakeReady])

  useEffect(() => {
    if (!visible || !wrapRef.current) return

    const wrap = wrapRef.current
    const W = wrap.offsetWidth  || 400
    const H = wrap.offsetHeight || 72
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    const app = new PIXI.Application({
      width: W, height: H,
      backgroundAlpha: 0,
      antialias: true,
      resolution: DPR,
      autoDensity: true,
    })
    Object.assign(app.view.style, {
      position: 'absolute', inset: '0',
      width: '100%', height: '100%',
      pointerEvents: 'none',
    })
    wrap.appendChild(app.view)

    // Dark overlay — makes additive glow visible on white card
    const overlay = new PIXI.Graphics()
    overlay.beginFill(0x000000, 1).drawRect(0, 0, W, H).endFill()
    overlay.alpha = 0
    app.stage.addChild(overlay)

    // Slash (additive blend)
    const slashC = new PIXI.Container()
    slashC.blendMode = PIXI.BLEND_MODES.ADD
    app.stage.addChild(slashC)
    const slashG = new PIXI.Graphics()
    slashC.addChild(slashG)

    // Particles (additive)
    const partC = new PIXI.Container()
    partC.blendMode = PIXI.BLEND_MODES.ADD
    app.stage.addChild(partC)

    // White flash
    const flashG = new PIXI.Graphics()
    flashG.beginFill(0xFFFFFF, 1).drawRect(0, 0, W, H).endFill()
    flashG.alpha = 0
    app.stage.addChild(flashG)

    // Bezier anchors — rising diagonal, upward bow
    const P0x = W * 0.01,  P0y = H * 0.92
    const P2x = W * 0.99,  P2y = H * 0.06
    const Bx  = W * 0.50,  By  = H * -0.55

    const drawSlash = (progress, fade) => {
      slashG.clear()
      if (progress <= 0 || fade <= 0) return
      const { ctrl, end } = splitQuad(P0x, P0y, Bx, By, P2x, P2y, progress)
      const T = slashThick(progress)

      const draw = (w, col, a) => {
        slashG.lineStyle(w, col, a * fade)
        slashG.moveTo(P0x, P0y)
        slashG.quadraticCurveTo(ctrl.x, ctrl.y, end.x, end.y)
      }
      draw(T * 4.2, C.edge,   0.18)
      draw(T * 2.6, C.orange, 0.35)
      draw(T * 1.6, C.gold,   0.60)
      draw(T * 0.8, C.bright, 0.82)
      draw(T * 0.28, C.core,  1.00)

      // Leading speed lines
      if (progress > 0.20) {
        const dx = end.x - ctrl.x, dy = end.y - ctrl.y
        const mag = Math.hypot(dx, dy) || 1
        const tx = dx / mag, ty = dy / mag
        for (let i = 0; i < 7; i++) {
          const len = 7 + i * 8
          slashG.lineStyle(1.2, C.core, (0.55 - i * 0.07) * fade * Math.min(1, progress * 3))
          slashG.moveTo(end.x, end.y)
          slashG.lineTo(end.x + tx * len, end.y + ty * len)
        }
      }
    }

    // Particles
    const particles = []
    const spawnParticles = () => {
      const { end: imp } = splitQuad(P0x, P0y, Bx, By, P2x, P2y, 0.65)
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 70 + Math.random() * 140
        const size  = 2.5 + Math.random() * 5.5
        const g = new PIXI.Graphics()
        g.beginFill(i % 2 === 0 ? C.pGold : C.pYel, 1)
        if (i % 3 !== 2) {
          g.drawRect(-size / 2, -size / 2, size, size)
        } else {
          g.moveTo(0, -size * 0.85)
          g.lineTo(size * 0.55, 0)
          g.lineTo(0, size * 0.85)
          g.lineTo(-size * 0.55, 0)
          g.closePath()
        }
        g.endFill()
        g.position.set(imp.x, imp.y)
        partC.addChild(g)
        particles.push({
          g,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 30,
          grav: 110,
          life: 0,
          maxLife: 0.30 + Math.random() * 0.35,
          rot: (Math.random() - 0.5) * 14,
        })
      }
    }

    // Timeline
    const TD = 0.17, TH = 0.05, T_HITSTOP = 0.05, TF = 0.15
    const OVERLAY_MAX    = 0.42
    const T_FLASH_START  = TD + TH
    const T_FLASH_HALF   = 0.07

    let elapsed = 0, phaseT = 0
    let phase = 'draw'
    let done  = false

    const tick = () => {
      if (done) return
      const dt = app.ticker.deltaMS / 1000
      elapsed += dt
      phaseT  += dt

      // Overlay envelope
      const tTotal = TD + TH + T_HITSTOP + TF
      if (elapsed < TD)                         overlay.alpha = OVERLAY_MAX * (elapsed / TD)
      else if (elapsed < TD + TH + T_HITSTOP)  overlay.alpha = OVERLAY_MAX
      else if (elapsed < tTotal)                overlay.alpha = OVERLAY_MAX * (1 - (elapsed - TD - TH - T_HITSTOP) / TF)
      else                                      overlay.alpha = 0

      // White flash
      if (elapsed < T_FLASH_START)                          flashG.alpha = 0
      else if (elapsed < T_FLASH_START + T_FLASH_HALF)      flashG.alpha = 0.55 * ((elapsed - T_FLASH_START) / T_FLASH_HALF)
      else if (elapsed < T_FLASH_START + T_FLASH_HALF * 2)  flashG.alpha = 0.55 * (1 - (elapsed - T_FLASH_START - T_FLASH_HALF) / T_FLASH_HALF)
      else                                                   flashG.alpha = 0

      // State machine
      if (phase === 'draw') {
        drawSlash(phaseT / TD, 1)
        if (phaseT >= TD) { phase = 'hitstop'; phaseT = 0 }

      } else if (phase === 'hitstop') {
        drawSlash(1, 1)
        if (phaseT >= T_HITSTOP) {
          spawnParticles()
          onShakeReadyRef.current?.()
          phase = 'fade'; phaseT = 0
        }

      } else if (phase === 'fade') {
        drawSlash(1, Math.max(0, 1 - phaseT / TF))
        if (phaseT >= TF) {
          slashG.clear()
          phase = 'rest'
        }
      }

      // Particle update
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += dt
        if (p.life >= p.maxLife) {
          if (p.g.parent) partC.removeChild(p.g)
          particles.splice(i, 1)
          if (!done && particles.length === 0 && phase === 'rest') {
            done = true
            onCompleteRef.current()
          }
          continue
        }
        const t = p.life / p.maxLife
        p.g.x        += p.vx * dt
        p.g.y        += (p.vy + p.grav * p.life) * dt
        p.g.rotation += p.rot * dt
        p.g.alpha     = (1 - t) ** 1.6
        p.g.scale.set(Math.max(0.1, 1 - t * 0.55))
      }
    }

    app.ticker.add(tick)

    return () => {
      done = true
      app.ticker.remove(tick)
      try { app.destroy(true, { children: true }) } catch (_) {}
    }
  }, [visible])  // only visible controls mount/unmount; callbacks stay stable via refs

  if (!visible) return null

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'visible',
      }}
    />
  )
}
