import { memo } from 'react'

const TRUST_ITEMS = [
  { icon: '🔐', text: 'SOC 2-ready audit logs' },
  { icon: '⚡', text: 'Sub-500ms detection' },
  { icon: '📡', text: 'Real-time Socket.IO' },
  { icon: '🤖', text: 'Groq LLM analytics' },
]

const CTASection = memo(function CTASection({ scrollProgress }) {
  // Fade in 0.85→0.90, stay 0.90→1.0
  let opacity = 0
  if (scrollProgress >= 0.85) {
    opacity = Math.min(1, (scrollProgress - 0.85) / 0.05)
  }

  if (opacity === 0) return null

  return (
    <div
      className="section-overlay"
      style={{ opacity, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
    >
      <div
        style={{
          maxWidth: 660,
          width: '100%',
          padding: '0 40px',
          textAlign: 'center',
        }}
      >
        {/* Glowing ring decoration */}
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
              border: '1px solid rgba(56,189,248,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 0 40px rgba(56,189,248,0.15)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        <h2
          style={{
            fontSize: 'clamp(34px, 5vw, 62px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            marginBottom: 20,
          }}
        >
          <span className="gradient-text">Deploy Safer</span>
          <br />
          <span style={{ color: '#f8fafc' }}>Fleets Today.</span>
        </h2>

        <p
          style={{
            fontSize: 17,
            color: '#94a3b8',
            lineHeight: 1.7,
            marginBottom: 40,
          }}
        >
          From school buses to commercial fleets — DMS gives you
          the visibility to act before incidents happen.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 48,
            pointerEvents: 'auto',
          }}
        >
          <button
            className="btn-primary"
            style={{ padding: '16px 36px', fontSize: 16 }}
          >
            Start Free Trial
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <button
            className="btn-ghost"
            style={{ padding: '16px 28px', fontSize: 16 }}
          >
            View Documentation
          </button>
        </div>

        {/* Trust row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          {TRUST_ITEMS.map(({ icon, text }) => (
            <div
              key={text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 13,
                color: '#64748b',
                fontWeight: 500,
              }}
            >
              <span>{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default CTASection
