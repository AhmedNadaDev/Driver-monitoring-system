import { memo } from 'react'

const STATS = [
  { value: '94%', label: 'of fleet accidents are preventable', color: '#f87171' },
  { value: '$31k', label: 'average cost per accident incident', color: '#fb923c' },
  { value: '8.5s', label: 'is all it takes to cause a collision', color: '#fbbf24' },
]

const ProblemSection = memo(function ProblemSection({ scrollProgress }) {
  // Fade in 0.20→0.25, full 0.25→0.35, fade out 0.35→0.40
  let opacity = 0
  if (scrollProgress >= 0.20 && scrollProgress <= 0.40) {
    const fi = Math.min(1, (scrollProgress - 0.20) / 0.05)
    const fo = Math.min(1, (0.40 - scrollProgress) / 0.05)
    opacity = Math.min(fi, fo)
  }

  if (opacity === 0) return null

  return (
    <div
      className="section-overlay"
      style={{ opacity, alignItems: 'center', justifyContent: 'flex-end', padding: '0 6vw' }}
    >
      <div style={{ maxWidth: 540, width: '100%' }}>

        {/* Label */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#f87171',
            marginBottom: 16,
          }}
        >
          The Challenge
        </p>

        {/* Headline */}
        <h2
          style={{
            fontSize: 'clamp(30px, 4vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            marginBottom: 20,
            color: '#f8fafc',
          }}
        >
          Fleet Safety{' '}
          <span style={{ color: '#f87171' }}>is Broken</span>
        </h2>

        <p
          style={{
            fontSize: 16,
            color: '#94a3b8',
            lineHeight: 1.7,
            marginBottom: 36,
          }}
        >
          Manual oversight fails at scale. Incidents go undetected.
          Accountability is reactive — not proactive.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {STATS.map(({ value, label, color }) => (
            <div
              key={value}
              className="glass-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                padding: '16px 20px',
              }}
            >
              <span
                className="stat-number"
                style={{ color, fontSize: 'clamp(28px, 3.5vw, 40px)', minWidth: 80 }}
              >
                {value}
              </span>
              <span style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default ProblemSection
