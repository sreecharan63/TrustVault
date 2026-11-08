import React from 'react'

export default function TrustVaultLogo({ size = 32, showText = false, subtitle = 'DIGITAL PROTECTION', style = {} }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', ...style }}>
      {/* Digital Protection Vault Shield SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 8px rgba(229, 9, 20, 0.45))' }}
      >
        <defs>
          <linearGradient id="tvShieldGrad" x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E50914" />
            <stop offset="65%" stopColor="#B81D24" />
            <stop offset="100%" stopColor="#4A0508" />
          </linearGradient>
          <radialGradient id="tvCoreGlow" cx="24" cy="24" r="12" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E50914" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#141414" stopOpacity="0.95" />
          </radialGradient>
        </defs>

        {/* Outer Digital Security Shield */}
        <path
          d="M24 3L6 10V22C6 33.2 13.8 43.1 24 46C34.2 43.1 42 33.2 42 22V10L24 3Z"
          fill="url(#tvShieldGrad)"
          stroke="#E50914"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Inner Cyber Protection Surface */}
        <path
          d="M24 6L9.5 12V22C9.5 31.2 15.8 39.5 24 42.2C32.2 39.5 38.5 31.2 38.5 22V12L24 6Z"
          fill="#121212"
          fillOpacity="0.92"
          stroke="#E50914"
          strokeWidth="0.8"
          strokeOpacity="0.6"
        />

        {/* Digital Protection Traces & Micro Nodes */}
        <path
          d="M24 8V13M12.5 19H16.5M31.5 19H35.5M24 35V40"
          stroke="#E50914"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        <circle cx="24" cy="13" r="1.5" fill="#ffffff" />
        <circle cx="16.5" cy="19" r="1.5" fill="#ffffff" />
        <circle cx="31.5" cy="19" r="1.5" fill="#ffffff" />
        <circle cx="24" cy="35" r="1.5" fill="#ffffff" />

        {/* Circular Vault Door Dial */}
        <circle
          cx="24"
          cy="24"
          r="9.5"
          fill="url(#tvCoreGlow)"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.95"
        />
        <circle
          cx="24"
          cy="24"
          r="7"
          stroke="#E50914"
          strokeWidth="1.2"
          strokeDasharray="2.5 2"
        />

        {/* Central Vault Lock Core */}
        <path
          d="M22 21.5C22 20.4 22.9 19.5 24 19.5C25.1 19.5 26 20.4 26 21.5C26 22.25 25.6 22.9 25 23.3V27C25 27.6 24.6 28 24 28C23.4 28 23 27.6 23 27V23.3C22.4 22.9 22 22.25 22 21.5Z"
          fill="#ffffff"
        />
      </svg>

      {/* Brand Typography */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{
            fontSize: size >= 40 ? '1.75rem' : '1.25rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            color: 'var(--accent)',
            textShadow: '0 0 14px rgba(229, 9, 20, 0.45)'
          }}>
            TRUSTVAULT
          </span>
          {subtitle && (
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'var(--text-muted)',
              marginTop: '0.2rem',
              textTransform: 'uppercase'
            }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
