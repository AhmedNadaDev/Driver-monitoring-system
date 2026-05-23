import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import SceneManager      from './three/SceneManager'
import CameraRig         from './three/CameraRig'
import createBus         from './three/BusGeometry'
import BusController     from './three/BusController'
import LightingController from './three/LightingController'
import ScrollBridge      from './three/ScrollBridge'
import createEnvironment from './three/Environment'

import Navbar            from './components/Navbar'
import HeroSection       from './components/HeroSection'
import ProblemSection    from './components/ProblemSection'
import SolutionSection   from './components/SolutionSection'
import ExperienceSection from './components/ExperienceSection'
import CTASection        from './components/CTASection'
import MobileView        from './components/MobileView'

gsap.registerPlugin(ScrollTrigger)

// Evaluated once at module load — safe for CSR/Vite.
const IS_MOBILE = window.innerWidth < 768

// ─── Progress bar (thin top bar reflecting scroll) ────────────────────────────
function ProgressBar({ progress }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        height: 2,
        width: `${progress * 100}%`,
        background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
        zIndex: 100,
        transition: 'width 0.05s linear',
        boxShadow: '0 0 8px rgba(56,189,248,0.6)',
      }}
    />
  )
}

// ─── Section progress indicator (right side dots) ────────────────────────────
const SECTIONS = [
  { label: 'Hero',       range: [0.00, 0.20] },
  { label: 'Problem',    range: [0.20, 0.40] },
  { label: 'Solution',   range: [0.40, 0.60] },
  { label: 'Experience', range: [0.60, 0.85] },
  { label: 'CTA',        range: [0.85, 1.00] },
]

function SectionDots({ progress }) {
  return (
    <div
      style={{
        position: 'fixed',
        right: 28,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 40,
      }}
    >
      {SECTIONS.map(({ label, range }) => {
        const active = progress >= range[0] && progress < range[1]
        return (
          <div
            key={label}
            title={label}
            style={{
              width: active ? 8 : 4,
              height: active ? 8 : 4,
              borderRadius: '50%',
              background: active ? '#38bdf8' : '#1e293b',
              border: active ? '1px solid rgba(56,189,248,0.5)' : '1px solid #2d3748',
              boxShadow: active ? '0 0 8px rgba(56,189,248,0.5)' : 'none',
              transition: 'all 0.3s ease',
              cursor: 'default',
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Desktop App ──────────────────────────────────────────────────────────────
export default function App() {
  if (IS_MOBILE) return <MobileView />

  const canvasRef   = useRef(null)
  const engineRef   = useRef(null)
  const rafRef      = useRef(null)

  // Throttled state for React UI (avoids per-frame renders)
  const [uiProgress, setUiProgress] = useState(0)
  const lastUiRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current

    // ── Three.js initialization ────────────────────────────────────────────
    const sceneManager = new SceneManager(canvas)
    const cameraRig    = new CameraRig()
    const lighting     = new LightingController(sceneManager.scene)
    const bus          = createBus()
    const busCtrl      = new BusController(bus)
    const scrollBridge = new ScrollBridge()
    const disposeEnv   = createEnvironment(sceneManager.scene)

    sceneManager.scene.add(bus)
    engineRef.current = { sceneManager, cameraRig, lighting, busCtrl, scrollBridge, disposeEnv }

    // ── GSAP ScrollTrigger ─────────────────────────────────────────────────
    // Only touches scrollBridge — no Three.js mutations inside GSAP.
    ScrollTrigger.create({
      trigger: '#scroll-spacer',
      start:   'top top',
      end:     'bottom bottom',
      onUpdate: (self) => {
        scrollBridge.setTarget(self.progress)

        // Throttle React state updates: only when delta > 0.003
        if (Math.abs(self.progress - lastUiRef.current) > 0.003) {
          lastUiRef.current = self.progress
          setUiProgress(self.progress)
        }
      },
    })

    // ── Single RAF loop ────────────────────────────────────────────────────
    let lastTime = performance.now()

    const animate = (now) => {
      rafRef.current = requestAnimationFrame(animate)
      const delta = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      scrollBridge.tick()
      const p = scrollBridge.getSmoothed()

      cameraRig.update(p, delta)
      busCtrl.update(p, delta)
      lighting.update(p, bus.position.x)

      sceneManager.render(cameraRig.camera)
    }

    rafRef.current = requestAnimationFrame(animate)

    // ── Resize handler ─────────────────────────────────────────────────────
    const onResize = () => {
      sceneManager.resize()
      cameraRig.resize()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      ScrollTrigger.getAll().forEach((t) => t.kill())
      busCtrl.dispose()
      disposeEnv()
      sceneManager.dispose()
    }
  }, [])

  return (
    <div>
      {/* Fixed WebGL canvas — z-0 */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          width: '100vw',
          height: '100vh',
          display: 'block',
        }}
      />

      {/* Scroll spacer — 600 vh to create scroll distance */}
      <div id="scroll-spacer" style={{ height: '600vh', position: 'relative', zIndex: 0 }} />

      {/* Progress bar */}
      <ProgressBar progress={uiProgress} />

      {/* Section nav dots */}
      <SectionDots progress={uiProgress} />

      {/* Fixed UI overlay — z-10 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <Navbar scrollProgress={uiProgress} />
        <HeroSection       scrollProgress={uiProgress} />
        <ProblemSection    scrollProgress={uiProgress} />
        <SolutionSection   scrollProgress={uiProgress} />
        <ExperienceSection scrollProgress={uiProgress} />
        <CTASection        scrollProgress={uiProgress} />
      </div>
    </div>
  )
}
