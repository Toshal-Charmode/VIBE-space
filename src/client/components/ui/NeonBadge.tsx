import React from 'react';

interface NeonBadgeProps {
  children: React.ReactNode;
  variant?: 'purple' | 'success' | 'cyan';
  icon?: React.ReactNode;
  className?: string;
}

export const NeonBadge: React.FC<NeonBadgeProps> = ({
  children,
  variant = 'purple',
  icon,
  className = ''
}) => {
  const variantClass = variant === 'success' ? 'neon-badge-success' : variant === 'cyan' ? 'neon-badge-cyan' : '';

  return (
    <span className={`neon-badge ${variantClass} ${className}`}>
      {icon}
      {children}
    </span>
  );
};
