import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'panel' | 'card' | 'interactive';
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'card',
  glow = false,
  className = '',
  ...props
}) => {
  const baseClass = variant === 'panel' ? 'glass-panel' : variant === 'interactive' ? 'glass-card glass-card-interactive' : 'glass-card';
  const glowClass = glow ? 'animate-pulse-glow' : '';

  return (
    <div className={`${baseClass} ${glowClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
