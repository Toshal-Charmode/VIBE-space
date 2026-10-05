import React, { useEffect, useRef, useState } from 'react';
import { VibeSpaceLogo } from '../ui/VibeSpaceLogo.tsx';

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Exact 0.0s - 3.2s choreographed timeline
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    const t1 = setTimeout(() => setPhase(1), 200);   // 0.2s: Subtle purple ambient glow appears
    const t2 = setTimeout(() => setPhase(2), 800);   // 0.8s: Small particles/light streaks move around center
    const t3 = setTimeout(() => setPhase(3), 1400);  // 1.4s: Translucent glass shape forms
    const t4 = setTimeout(() => setPhase(4), 2000);  // 2.0s: "VIBE SPACE" appears with subtle glow
    const t5 = setTimeout(() => setPhase(5), 2600);  // 2.6s: Glass expands outward
    const t6 = setTimeout(() => {
      onComplete();                                  // 3.2s+: Dashboard becomes fully interactive
    }, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [onComplete]);

  // Particle Canvas for light streaks & swirling stardust
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pool
    const particles: Array<{
      x: number;
      y: number;
      angle: number;
      radius: number;
      speed: number;
      size: number;
      alpha: number;
      color: string;
    }> = [];

    const colors = ['#C084FC', '#A855F7', '#D946EF', '#818CF8', '#E9D5FF'];
    const centerX = width / 2;
    const centerY = height / 2;

    for (let i = 0; i < 48; i++) {
      particles.push({
        x: centerX,
        y: centerY,
        angle: Math.random() * Math.PI * 2,
        radius: 40 + Math.random() * 160,
        speed: 0.015 + Math.random() * 0.025,
        size: 1 + Math.random() * 2.2,
        alpha: 0.2 + Math.random() * 0.7,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      particles.forEach((p) => {
        p.angle += p.speed;
        const targetX = cx + Math.cos(p.angle) * p.radius;
        const targetY = cy + Math.sin(p.angle) * (p.radius * 0.45); // Elliptical perspective

        // Draw light streak trailing behind
        const trailX = cx + Math.cos(p.angle - 0.25) * (p.radius * 0.98);
        const trailY = cy + Math.sin(p.angle - 0.25) * (p.radius * 0.44);

        const grad = ctx.createLinearGradient(trailX, trailY, targetX, targetY);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, p.color);

        ctx.strokeStyle = grad;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // Particle head
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(targetX, targetY, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#030205',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s ease-out',
        opacity: phase >= 5 ? 0 : 1,
        transform: phase >= 5 ? 'scale(1.08)' : 'scale(1)',
        pointerEvents: phase >= 5 ? 'none' : 'auto'
      }}
    >
      {/* 0.2s - 0.8s: Subtle purple ambient glow slowly expanding from center */}
      <div
        style={{
          position: 'absolute',
          width: '640px',
          height: '640px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.45) 0%, rgba(217, 70, 239, 0.18) 40%, rgba(79, 70, 229, 0.08) 65%, transparent 75%)',
          filter: 'blur(75px)',
          transform: phase >= 1 ? (phase >= 5 ? 'scale(2.8)' : 'scale(1)') : 'scale(0.2)',
          opacity: phase >= 1 ? (phase >= 5 ? 0 : 0.9) : 0,
          transition: 'all 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none'
        }}
      />

      {/* 0.8s - 1.4s: Canvas particles and light streaks around center */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: phase >= 2 ? (phase >= 5 ? 0 : 0.85) : 0,
          transition: 'opacity 0.6s ease'
        }}
      />

      {/* Outer Luminous Orbital Rings */}
      <div
        style={{
          position: 'absolute',
          width: '360px',
          height: '360px',
          borderRadius: '50%',
          border: '1.5px solid rgba(192, 132, 252, 0.28)',
          boxShadow: '0 0 35px rgba(168, 85, 247, 0.35)',
          transform: `rotate(${phase * 50}deg) scale(${phase >= 2 ? (phase >= 5 ? 1.6 : 1) : 0.3})`,
          opacity: phase >= 2 ? (phase >= 5 ? 0 : 0.75) : 0,
          transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none'
        }}
      />

      {/* 1.4s - 2.0s: Translucent glass shape/orb forms in middle */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '44px 52px',
          borderRadius: '36px',
          background: phase >= 3 ? 'linear-gradient(145deg, rgba(28, 22, 50, 0.72) 0%, rgba(12, 10, 24, 0.85) 100%)' : 'transparent',
          backdropFilter: phase >= 3 ? 'blur(28px)' : 'none',
          WebkitBackdropFilter: phase >= 3 ? 'blur(28px)' : 'none',
          border: phase >= 3 ? '1.5px solid rgba(192, 132, 252, 0.4)' : 'none',
          boxShadow: phase >= 3 ? '0 20px 60px rgba(0, 0, 0, 0.85), 0 0 45px rgba(168, 85, 247, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : 'none',
          transform: phase >= 3 ? (phase >= 5 ? 'scale(1.5)' : 'scale(1)') : 'scale(0.75)',
          opacity: phase >= 3 ? (phase >= 5 ? 0 : 1) : 0,
          transition: 'all 0.65s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <VibeSpaceLogo size={82} glow={phase >= 4} />

        {/* 2.0s - 2.6s: "VIBE SPACE" appears with subtle glow */}
        <div
          style={{
            marginTop: '22px',
            textAlign: 'center',
            opacity: phase >= 4 ? 1 : 0,
            transform: phase >= 4 ? 'translateY(0)' : 'translateY(14px)',
            transition: 'all 0.55s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              letterSpacing: '0.14em',
              background: 'linear-gradient(90deg, #FFFFFF 0%, #F5D0FE 35%, #C084FC 75%, #F0ABFC 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 32px rgba(168, 85, 247, 0.55)',
              margin: 0
            }}
          >
            VIBE SPACE
          </h1>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.28em',
              color: '#F0ABFC',
              textTransform: 'uppercase',
              marginTop: '8px'
            }}
          >
            Entering Futuristic Glass Space
          </p>
        </div>
      </div>

      {/* Skip Button */}
      <button
        onClick={onComplete}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '28px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          color: '#C084FC',
          padding: '7px 16px',
          borderRadius: '20px',
          fontSize: '11.5px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          cursor: 'pointer',
          zIndex: 20,
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(168, 85, 247, 0.25)';
          e.currentTarget.style.color = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.color = '#C084FC';
        }}
      >
        Skip Intro →
      </button>
    </div>
  );
};
