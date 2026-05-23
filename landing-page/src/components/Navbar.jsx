import { memo } from 'react'

const Navbar = memo(function Navbar({ scrollProgress }) {
  const scrolled = scrollProgress > 0.03

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '18px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'auto',
        background: scrolled
          ? 'rgba(2, 8, 23, 0.85)'
          : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(148,163,184,0.08)' : '1px solid transparent',
        transition: 'background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '-0.02em',
            flexShrink: 0,
          }}
        >
          D
        </div>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#f8fafc',
            letterSpacing: '-0.03em',
          }}
        >
          DMS<span style={{ color: '#38bdf8' }}>.</span>
        </span>
      </div>

      {/* Nav links */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {['Platform', 'Features', 'Pricing'].map((item) => (
          <span
            key={item}
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'color 0.2s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => (e.target.style.color = '#f8fafc')}
            onMouseLeave={(e) => (e.target.style.color = '#94a3b8')}
          >
            {item}
          </span>
        ))}
      </div>

      {/* CTA */}
      <button className="btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
        Request Demo
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </nav>
  )
})

export default Navbar
