import { memo } from 'react'

const HeroSection = memo(function HeroSection({ scrollProgress }) {
  // Visible 0 → 0.18, fade out 0.14 → 0.20
  const opacity = scrollProgress < 0.14
    ? 1
    : Math.max(0, 1 - (scrollProgress - 0.14) / 0.06)

  if (opacity === 0) return null

  return (
    <div
      className="section-overlay"
      style={{ opacity, alignItems: 'flex-end', paddingBottom: '14vh' }}
    >
      <div
        style={{
          maxWidth: 680,
          width: '100%',
          padding: '0 40px',
        }}
      >
        {/* Live badge */}
        <div style={{ marginBottom: 24 }}>
          <span className="badge">
            <span className="badge-dot" />
            AI Fleet Safety Platform
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(40px, 6vw, 76px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            marginBottom: 24,
          }}
        >
          <span className="gradient-text">Every Driver.</span>
          <br />
          <span style={{ color: '#f8fafc' }}>Every Mile.</span>
          <br />
          <span style={{ color: '#f8fafc' }}>Under Watch.</span>
        </h1>

        {/* Sub */}
        <p
          style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: '#94a3b8',
            lineHeight: 1.65,
            marginBottom: 36,
            maxWidth: 520,
            fontWeight: 400,
          }}
        >
          Real-time computer vision monitoring for modern fleet operations.
          Five parallel AI models. Zero blind spots.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary">
            Request Demo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <button className="btn-ghost">
            See How It Works
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>

        {/* Scroll hint */}
        <div
          style={{
            marginTop: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#475569',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <div
            style={{
              width: 1,
              height: 32,
              background: 'linear-gradient(to bottom, transparent, #475569)',
            }}
          />
          Scroll to explore
        </div>
      </div>
    </div>
  )
})

export default HeroSection
