import { memo } from 'react'

const CARDS = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: 'Real-Time Monitor',
    body: 'Live webcam feed analysis at configurable intervals. Socket.IO pushes violations instantly to the dashboard.',
    accent: '#38bdf8',
    metric: '<500ms',
    metricLabel: 'detection latency',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    title: 'Violation Analytics',
    body: 'Trip scoring, violation history, and driver-level breakdowns. Export audit logs as CSV for compliance.',
    accent: '#818cf8',
    metric: '200+',
    metricLabel: 'violations tracked',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'RAG Intelligence',
    body: 'Ask natural-language questions about your fleet. Powered by Groq LLM + vector search over trip embeddings.',
    accent: '#34d399',
    metric: 'LLM',
    metricLabel: 'powered Q&A',
  },
]

const ExperienceSection = memo(function ExperienceSection({ scrollProgress }) {
  // Fade in 0.60→0.65, full 0.65→0.80, fade out 0.80→0.85
  let opacity = 0
  if (scrollProgress >= 0.60 && scrollProgress <= 0.85) {
    const fi = Math.min(1, (scrollProgress - 0.60) / 0.05)
    const fo = Math.min(1, (0.85 - scrollProgress) / 0.05)
    opacity = Math.min(fi, fo)
  }

  if (opacity === 0) return null

  return (
    <div
      className="section-overlay"
      style={{ opacity, alignItems: 'flex-start', paddingTop: '14vh', flexDirection: 'column' }}
    >
      <div style={{ width: '100%', padding: '0 6vw', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#34d399',
              marginBottom: 12,
            }}
          >
            The Experience
          </p>
          <h2
            style={{
              fontSize: 'clamp(26px, 3.2vw, 44px)',
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 1.1,
              color: '#f8fafc',
            }}
          >
            Fleet Command at Your{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #34d399, #38bdf8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Fingertips
            </span>
          </h2>
        </div>

        {/* Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {CARDS.map(({ icon, title, body, accent, metric, metricLabel }) => (
            <div
              key={title}
              className="glass-card"
              style={{
                padding: '24px',
                borderColor: `${accent}22`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Top accent line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, ${accent}, transparent)`,
                  borderRadius: '16px 16px 0 0',
                }}
              />

              {/* Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${accent}18`,
                  border: `1px solid ${accent}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accent,
                  marginBottom: 16,
                }}
              >
                {icon}
              </div>

              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#f8fafc',
                  letterSpacing: '-0.02em',
                  marginBottom: 8,
                }}
              >
                {title}
              </h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 20 }}>
                {body}
              </p>

              {/* Metric */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(148,163,184,0.08)',
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 800, color: accent, letterSpacing: '-0.03em' }}>
                  {metric}
                </span>
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                  {metricLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default ExperienceSection
