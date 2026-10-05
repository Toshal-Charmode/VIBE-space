import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className = ''
}) => {
  const sizeMap = {
    sm: 32,
    md: 42,
    lg: 56,
    xl: 72
  };
  const px = sizeMap[size];

  // Default fallback generator
  const initials = (name || '?').substring(0, 2).toUpperCase();
  const avatarUrl = src || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'user')}`;

  return (
    <div
      style={{
        position: 'relative',
        width: px,
        height: px,
        flexShrink: 0
      }}
      className={className}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '1.5px solid rgba(168, 85, 247, 0.4)',
          background: 'rgba(20, 18, 30, 0.8)',
          boxShadow: '0 0 10px rgba(168, 85, 247, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#E9D5FF',
          fontWeight: 600,
          fontSize: px * 0.4
        }}
      >
        <img
          src={avatarUrl}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <span>{initials}</span>
      </div>

      {status && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: Math.max(10, px * 0.26),
            height: Math.max(10, px * 0.26),
            borderRadius: '50%',
            backgroundColor: status === 'online' ? '#10B981' : '#6B7280',
            border: '2px solid #06070B',
            boxShadow: status === 'online' ? '0 0 8px #10B981' : 'none'
          }}
        />
      )}
    </div>
  );
};
