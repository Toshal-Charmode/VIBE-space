import React from 'react';

interface VibeSpaceLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  glow?: boolean;
}

export const VibeSpaceLogo: React.FC<VibeSpaceLogoProps> = ({
  size = 38,
  showWordmark = false,
  className = '',
  glow = true
}) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size > 40 ? '14px' : '10px',
        userSelect: 'none'
      }}
      className={className}
    >
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <svg
          viewBox="0 0 120 120"
          width={size}
          height={size}
          style={{
            filter: glow ? 'drop-shadow(0 0 14px rgba(168, 85, 247, 0.45))' : 'none',
            transition: 'all 0.3s ease'
          }}
        >
          <defs>
            <radialGradient id={`vibeGlow_${size}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#C084FC" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#9333EA" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
            </radialGradient>

            <linearGradient id={`neonGrad_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F0ABFC" />
              <stop offset="35%" stopColor="#C084FC" />
              <stop offset="70%" stopColor="#9333EA" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>

            <linearGradient id={`orbitGrad_${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#E879F9" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#A855F7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id={`glassSph_${size}`} x1="20%" y1="20%" x2="80%" y2="80%">
              <stop offset="0%" stopColor="rgba(192, 132, 252, 0.45)" />
              <stop offset="50%" stopColor="rgba(30, 24, 52, 0.85)" />
              <stop offset="100%" stopColor="rgba(10, 9, 18, 0.95)" />
            </linearGradient>
          </defs>

          {/* Ambient Glow */}
          <circle cx="60" cy="60" r="46" fill={`url(#vibeGlow_${size})`} opacity="0.65" />

          {/* Orbital Back */}
          <ellipse
            cx="60"
            cy="62"
            rx="48"
            ry="16"
            transform="rotate(-26 60 62)"
            fill="none"
            stroke={`url(#orbitGrad_${size})`}
            strokeWidth="2.5"
            opacity="0.5"
            strokeDasharray="6 3"
          />

          {/* Glass Sphere */}
          <circle
            cx="60"
            cy="58"
            r="26"
            fill={`url(#glassSph_${size})`}
            stroke="rgba(192, 132, 252, 0.45)"
            strokeWidth="1.5"
          />
          <ellipse cx="52" cy="48" rx="8" ry="5" fill="#FFFFFF" opacity="0.25" transform="rotate(-30 52 48)" />

          {/* Abstract "V" Wings */}
          <path
            d="M 28 32 L 60 88 L 92 32 L 80 32 L 60 74 L 40 32 Z"
            fill={`url(#neonGrad_${size})`}
          />

          {/* Inner Vertex Nexus Orb */}
          <circle cx="60" cy="74" r="5" fill="#F0ABFC" />

          {/* Orbital Front (Overlapping "V") */}
          <path
            d="M 16 66 A 48 16 0 0 0 102 52"
            transform="rotate(-26 60 62)"
            fill="none"
            stroke={`url(#orbitGrad_${size})`}
            strokeWidth="3"
          />
        </svg>
      </div>

      {showWordmark && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: size > 40 ? '24px' : '18px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              background: 'linear-gradient(90deg, #FFFFFF 0%, #E9D5FF 40%, #C084FC 75%, #F0ABFC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 24px rgba(168, 85, 247, 0.35)',
              lineHeight: 1.15
            }}
          >
            VIBE SPACE
          </span>
          <span
            style={{
              fontSize: size > 40 ? '11px' : '9.5px',
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: '#A855F7',
              textTransform: 'uppercase',
              marginTop: '1px'
            }}
          >
            Cyber-Glass Mesh
          </span>
        </div>
      )}
    </div>
  );
};
