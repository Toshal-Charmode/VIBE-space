import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  iconOnly?: boolean;
  children?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  iconOnly = false,
  children,
  className = '',
  ...props
}) => {
  const variantClass = variant === 'primary' ? 'glass-btn-primary' : variant === 'danger' ? 'glass-btn-danger' : 'glass-btn-secondary';
  const iconClass = iconOnly ? 'glass-btn-icon' : '';

  return (
    <button className={`glass-btn ${variantClass} ${iconClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
