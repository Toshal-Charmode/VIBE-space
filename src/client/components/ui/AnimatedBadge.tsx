import React, { useState, useEffect, useRef } from 'react';

interface AnimatedBadgeProps {
  count: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
  bgColor?: string;
}

/**
 * AnimatedBadge
 * Adheres to Requirement 4:
 * "If Suggestions has a notification/count indicator:
 *  Animate only when the count actually changes.
 *  Example: count: 3 -> 4. Use: small scale-up -> settle back.
 *  Do NOT continuously animate it."
 */
export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  count,
  className = '',
  style,
  color = '#FFFFFF',
  bgColor = 'var(--accent-primary)'
}) => {
  const [isPopping, setIsPopping] = useState(false);
  const prevCountRef = useRef<number>(count);
  const isInitialMount = useRef<boolean>(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (prevCountRef.current !== count) {
      prevCountRef.current = count;
      setIsPopping(true);
      const timer = setTimeout(() => {
        setIsPopping(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [count]);

  if (count <= 0) return null;

  return (
    <span
      className={`${isPopping ? 'badge-pop' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '18px',
        height: '18px',
        padding: '0 6px',
        borderRadius: '10px',
        backgroundColor: bgColor,
        color: color,
        fontSize: '11px',
        fontWeight: 700,
        lineHeight: 1,
        userSelect: 'none',
        transition: 'background-color var(--anim-fast) var(--ease-out)',
        ...style
      }}
    >
      {count}
    </span>
  );
};
