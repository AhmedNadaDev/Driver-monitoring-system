import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const CHAPTERS = [
  {
    id: 'hero',
    badge: '🛡️ AI Fleet Safety',
    title: 'Every Driver.\nEvery Mile.\nUnder Watch.',
    body: 'Real-time computer vision monitoring for modern fleet operations. Five parallel AI models. Zero blind spots.',
    accent: '#38bdf8',
  },
  {
    id: 'problem',
    badge: '⚠️ The Challenge',
    title: 'Fleet Safety\nis Broken',
    body: 'Manual oversight fails at scale. Incidents go undetected. Accountability is reactive, not proactive.',
    accent: '#f87171',
    stats: [
      { v: '94%', l: 'accidents preventable' },
      { v: '$31k', l: 'avg accident cost' },
      { v: '8.5s', l: 'causes a collision' },
    ],
  },
  {
    id: 'solution',
    badge: '🤖 The Platform',
    title: 'Intelligence That\nNever Sleeps',
    body: 'Five specialized YOLO models. Parallel inference. Instant alerts via Socket.IO.',
    accent: '#818cf8',
    pills: ['Drowsiness', 'Phone Use', 'Seat Belt', 'Smoking', 'Steering'],
  },
  {
    id: 'cta',
    badge: '🚀 Get Started',
    title: 'Deploy Safer\nFleets Today.',
    body: 'From school buses to commercial fleets — DMS gives you the visibility to act before incidents happen.',
    accent: '#34d399',
    cta: true,
  },
]

function Chapter({ chapter }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    gsap.fromTo(
      el.querySelectorAll('.animate-in'),
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      },
    )
  }, [])

  return (
    <section
      ref={ref}
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 28px 60px',
      }}
    >
      <div className="animate-in" style={{ marginBottom: 18 }}>
        <span className="badge" style={{ borderColor: `${chapter.accent}40`, color: chapter.accent, background: `${chapter.accent}12` }}>
          {chapter.badge}
        </span>
      </div>

      <h2
        className="animate-in"
        style={{
          fontSize: 'clamp(34px, 9vw, 52px)',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
          color: '#f8fafc',
          marginBottom: 20,
          whiteSpace: 'pre-line',
        }}
      >
        {chapter.title}
      </h2>

      <p
        className="animate-in"
        style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, marginBottom: 28 }}
      >
        {chapter.body}
      </p>

      {/* Stats */}
      {chapter.stats && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {chapter.stats.map(({ v, l }) => (
            <div key={v} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: chapter.accent, letterSpacing: '-0.03em' }}>{v}</span>
              <span style={{ fontSize: 14, color: '#94a3b8' }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pills */}
      {chapter.pills && (
        <div className="animate-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {chapter.pills.map((p) => (
            <span
              key={p}
              style={{
                padding: '8px 14px',
                background: `${chapter.accent}14`,
                border: `1px solid ${chapter.accent}30`,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: chapter.accent,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      {chapter.cta && (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
            Start Free Trial
          </button>
          <button className="btn-ghost" style={{ justifyContent: 'center', width: '100%' }}>
            View Documentation
          </button>
        </div>
      )}
    </section>
  )
}

// Animated bus graphic (pure CSS/SVG — no WebGL)
function MobileBusIllustration() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: -1,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #020817 0%, #040d1f 100%)',
      }}
    >
      {/* Animated gradient road */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '35%',
          background: 'linear-gradient(0deg, #04080f 0%, transparent 100%)',
        }}
      />
      {/* Glowing horizon line */}
      <div
        style={{
          position: 'absolute',
          bottom: '33%',
          left: '-20%',
          right: '-20%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
          opacity: 0.4,
        }}
      />
    </div>
  )
}

export default function MobileView() {
  return (
    <div style={{ background: '#020817', minHeight: '100svh' }}>
      <MobileBusIllustration />

      {/* Navbar */}
      <nav className="mobile-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>D</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.03em' }}>DMS<span style={{ color: '#38bdf8' }}>.</span></span>
        </div>
        <button className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>Demo</button>
      </nav>

      {CHAPTERS.map((ch) => (
        <Chapter key={ch.id} chapter={ch} />
      ))}
    </div>
  )
}
