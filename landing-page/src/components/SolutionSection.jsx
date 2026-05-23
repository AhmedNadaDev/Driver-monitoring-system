import { memo } from 'react'

const DETECTIONS = [
  { label: 'Drowsiness',    icon: '👁', color: '#38bdf8', desc: 'Eye closure + head drop' },
  { label: 'Phone Use',     icon: '📱', color: '#818cf8', desc: 'YOLO cellphone detection' },
  { label: 'Seat Belt',     icon: '🔒', color: '#34d399', desc: 'Belt compliance check' },
  { label: 'Smoking',       icon: '🚬', color: '#fb923c', desc: 'Cigarette / vape detection' },
  { label: 'Steering',      icon: '🚗', color: '#e879f9', desc: 'Hands-off-wheel alert' },
]

const SolutionSection = memo(function SolutionSection({ scrollProgress }) {
  // Fade in 0.40→0.45, full 0.45→0.55, fade out 0.55→0.60
  let opacity = 0
  if (scrollProgress >= 0.40 && scrollProgress <= 0.60) {
    const fi = Math.min(1, (scrollProgress - 0.40) / 0.05)
    const fo = Math.min(1, (0.60 - scrollProgress) / 0.05)
    opacity = Math.min(fi, fo)
  }

  if (opacity === 0) return null

  return (
    <div
      className="section-overlay"
      style={{ opacity, alignItems: 'center', justifyContent: 'flex-start', padding: '0 6vw' }}
    >
      <div style={{ maxWidth: 480, width: '100%' }}>

        {/* Label */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#38bdf8',
            marginBottom: 16,
          }}
        >
          The Platform
        </p>

        <h2
          style={{
            fontSize: 'clamp(28px, 3.5vw, 48px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            marginBottom: 12,
            color: '#f8fafc',
          }}
        >
          Intelligence That{' '}
          <span className="accent-text">Never Sleeps</span>
        </h2>

        <p
          style={{
            fontSize: 15,
            color: '#94a3b8',
            lineHeight: 1.7,
            marginBottom: 28,
          }}
        >
          Five specialized YOLO models running in parallel.
          Continuous monitoring. Instant alerts. Zero latency gaps.
        </p>

        {/* Detection pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DETECTIONS.map(({ label, icon, color, desc }) => (
            <div key={label} className="feature-pill">
              <span
                className="feature-dot"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
              <span style={{ fontSize: 16 }}>{icon}</span>
              <div>
                <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 1 }}>{desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: color,
                    animation: 'pulse-ring 2s ease-out infinite',
                  }}
                />
                <span style={{ fontSize: 11, color: '#475569', letterSpacing: '0.04em' }}>LIVE</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default SolutionSection
