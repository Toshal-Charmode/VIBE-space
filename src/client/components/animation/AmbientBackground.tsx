import React, { useEffect, useRef } from 'react';

type ObjectCategory = 'food' | 'book' | 'gaming' | 'music' | 'vibe' | 'watch';
type ObjectType =
  | 'samosa'
  | 'burger'
  | 'coffee'
  | 'pizza'
  | 'book'
  | 'pencil'
  | 'controller'
  | 'gamedisc'
  | 'joystick'
  | 'headphones'
  | 'musicnote'
  | 'microphone'
  | 'chatbubble'
  | 'popcorn'
  | 'ticket'
  | 'heart'
  | 'lightning';

interface FloatingObject {
  type: ObjectType;
  category: ObjectCategory;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  floatPhase: number;
  floatAmplitude: number;
  floatFreq: number;
  layer: 'background' | 'midground' | 'foreground';
  baseAlpha: number;
  alpha: number;
  parallaxFactor: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  color: string;
}

interface AmbientBackgroundProps {
  density?: 'low' | 'normal';
  interactive?: boolean;
  contextType?: 'general' | 'gaming' | 'music' | 'watch' | 'social';
}

export const AmbientBackground: React.FC<AmbientBackgroundProps> = ({
  density = 'normal',
  interactive = true,
  contextType = 'general'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let isVisible = !document.hidden;

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Object counts: Desktop (12-16), Tablet (8-10), Mobile (4-6)
    const objectCount = isMobile
      ? (density === 'low' ? 3 : 5)
      : isTablet
      ? (density === 'low' ? 6 : 9)
      : (density === 'low' ? 10 : 15);

    // Particle count (60-70% tiny dust): Desktop (28-36), Mobile (10-14)
    const particleCount = isMobile ? 12 : 32;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Categories and item types pool
    const allObjectTypes: { type: ObjectType; category: ObjectCategory }[] = [
      // Food
      { type: 'samosa', category: 'food' },
      { type: 'burger', category: 'food' },
      { type: 'coffee', category: 'food' },
      { type: 'pizza', category: 'food' },
      // Book / Study
      { type: 'book', category: 'book' },
      { type: 'pencil', category: 'book' },
      // Gaming
      { type: 'controller', category: 'gaming' },
      { type: 'gamedisc', category: 'gaming' },
      { type: 'joystick', category: 'gaming' },
      // Music
      { type: 'headphones', category: 'music' },
      { type: 'musicnote', category: 'music' },
      { type: 'microphone', category: 'music' },
      // Vibe Space / Social / Watch
      { type: 'chatbubble', category: 'vibe' },
      { type: 'popcorn', category: 'watch' },
      { type: 'ticket', category: 'watch' },
      { type: 'heart', category: 'vibe' },
      { type: 'lightning', category: 'vibe' }
    ];

    // Context-weighted selection
    const getWeightedPool = () => {
      if (contextType === 'gaming') {
        return allObjectTypes.filter((o) => o.category === 'gaming' || o.category === 'vibe' || o.category === 'food');
      }
      if (contextType === 'music') {
        return allObjectTypes.filter((o) => o.category === 'music' || o.category === 'vibe' || o.category === 'food');
      }
      if (contextType === 'watch') {
        return allObjectTypes.filter((o) => o.category === 'watch' || o.category === 'food' || o.category === 'vibe');
      }
      return allObjectTypes;
    };

    const pool = getWeightedPool();

    // Initialize Floating Objects with 3 Depth Layers
    const objects: FloatingObject[] = [];
    const layers: ('background' | 'midground' | 'foreground')[] = ['background', 'midground', 'foreground'];

    for (let i = 0; i < objectCount; i++) {
      const selected = pool[i % pool.length];
      const layer = layers[i % layers.length];

      // Sizes: Small (20-28px), Medium (32-44px), Large (48-65px)
      let size = 32;
      let baseAlpha = 0.35;
      let parallaxFactor = 3;

      if (layer === 'background') {
        size = Math.floor(Math.random() * 8 + 20); // 20-28px
        baseAlpha = Math.random() * 0.08 + 0.16;   // 0.16-0.24
        parallaxFactor = 1.5;                      // far: 1-3px
      } else if (layer === 'midground') {
        size = Math.floor(Math.random() * 12 + 32); // 32-44px
        baseAlpha = Math.random() * 0.12 + 0.3;     // 0.30-0.42
        parallaxFactor = 3.5;                       // mid
      } else {
        size = Math.floor(Math.random() * 16 + 48); // 48-64px
        // Rarely 70-80px for a foreground ambient showpiece
        if (i === 0 && !isMobile) size = 72;
        baseAlpha = Math.random() * 0.14 + 0.48;    // 0.48-0.62
        parallaxFactor = 5.5;                       // near: 4-6px
      }

      // Distribute around empty peripheral areas (outer quadrants)
      const posX = ((i + 0.5) / objectCount) * canvas.width + (Math.random() - 0.5) * 60;
      const posY = Math.random() * canvas.height;

      objects.push({
        type: selected.type,
        category: selected.category,
        x: posX,
        y: posY,
        baseX: posX,
        baseY: posY,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size,
        rotation: (Math.random() - 0.5) * 0.4,
        rotSpeed: (Math.random() - 0.5) * 0.003,
        floatPhase: Math.random() * Math.PI * 2,
        floatAmplitude: Math.random() * 12 + 8,
        floatFreq: Math.random() * 0.0008 + 0.0005,
        layer,
        baseAlpha,
        alpha: baseAlpha,
        parallaxFactor
      });
    }

    // Initialize tiny ambient dust particles (65% volume)
    const dustColors = [
      'rgba(114, 137, 218, ',   // #7289DA
      'rgba(88, 101, 242, ',    // #5865F2
      'rgba(139, 92, 246, ',    // #8B5CF6
      'rgba(181, 186, 193, '    // #B5BAC1
    ];

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const baseAlpha = Math.random() * 0.14 + 0.06;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 1.0,
        baseAlpha,
        alpha: baseAlpha,
        color: dustColors[Math.floor(Math.random() * dustColors.length)]
      });
    }

    // Mouse tracking for subtle desktop parallax & hover
    let mouse = { x: -9999, y: -9999, targetOffsetX: 0, targetOffsetY: 0, currentOffsetX: 0, currentOffsetY: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive || isMobile) return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;

      // Parallax offset relative to center of screen
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      mouse.targetOffsetX = (mouse.x - centerX) / centerX;
      mouse.targetOffsetY = (mouse.y - centerY) / centerY;
    };

    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      mouse.targetOffsetX = 0;
      mouse.targetOffsetY = 0;
    };

    if (interactive && !isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseleave', handleMouseLeave);
    }

    // Visibility change handler (pauses loop when tab is hidden to save 100% CPU)
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        render(performance.now());
      } else {
        cancelAnimationFrame(animationFrameId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // =========================================================================
    // SIGNATURE OBJECT 2D/2.5D VECTOR ILLUSTRATION DRAWING FUNCTIONS
    // =========================================================================

    const drawSamosa = (s: number) => {
      // Golden triangular crispy samosa with folded crimped base and spice seeds
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(s * 0.5, s * 0.4);
      ctx.quadraticCurveTo(0, s * 0.48, -s * 0.5, s * 0.4);
      ctx.closePath();
      ctx.fillStyle = '#D97706';
      ctx.fill();

      // Folded crimp base edge
      ctx.beginPath();
      ctx.moveTo(-s * 0.46, s * 0.38);
      ctx.quadraticCurveTo(0, s * 0.46, s * 0.46, s * 0.38);
      ctx.lineWidth = Math.max(1.5, s * 0.08);
      ctx.strokeStyle = '#B45309';
      ctx.stroke();

      // Cumin / ajwain spice dots
      ctx.fillStyle = '#78350F';
      ctx.fillRect(-s * 0.12, s * 0.05, s * 0.07, s * 0.05);
      ctx.fillRect(s * 0.15, s * 0.18, s * 0.06, s * 0.04);
      ctx.fillRect(-s * 0.05, -s * 0.18, s * 0.06, s * 0.04);
    };

    const drawBurger = (s: number) => {
      // Top Bun
      ctx.beginPath();
      ctx.arc(0, -s * 0.15, s * 0.42, Math.PI, 0);
      ctx.fillStyle = '#F59E0B';
      ctx.fill();

      // Sesame seeds
      ctx.fillStyle = '#FEF3C7';
      ctx.fillRect(-s * 0.18, -s * 0.28, s * 0.06, s * 0.04);
      ctx.fillRect(s * 0.12, -s * 0.32, s * 0.06, s * 0.04);
      ctx.fillRect(0, -s * 0.36, s * 0.06, s * 0.04);

      // Green lettuce frill
      ctx.fillStyle = '#10B981';
      ctx.fillRect(-s * 0.44, -s * 0.12, s * 0.88, s * 0.1);

      // Cheese slice triangle
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, -s * 0.02);
      ctx.lineTo(s * 0.42, -s * 0.02);
      ctx.lineTo(0, s * 0.18);
      ctx.closePath();
      ctx.fill();

      // Patty
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.roundRect(-s * 0.42, 0, s * 0.84, s * 0.14, s * 0.06);
      ctx.fill();

      // Bottom bun
      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.roundRect(-s * 0.4, s * 0.14, s * 0.8, s * 0.16, s * 0.06);
      ctx.fill();
    };

    const drawCoffee = (s: number) => {
      // Paper cup body
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.2);
      ctx.lineTo(s * 0.3, -s * 0.2);
      ctx.lineTo(s * 0.22, s * 0.45);
      ctx.lineTo(-s * 0.22, s * 0.45);
      ctx.closePath();
      ctx.fillStyle = '#374151';
      ctx.fill();

      // Cardboard sleeve
      ctx.fillStyle = '#92400E';
      ctx.beginPath();
      ctx.moveTo(-s * 0.27, 0);
      ctx.lineTo(s * 0.27, 0);
      ctx.lineTo(s * 0.24, s * 0.25);
      ctx.lineTo(-s * 0.24, s * 0.25);
      ctx.closePath();
      ctx.fill();

      // Cup lid
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.roundRect(-s * 0.34, -s * 0.34, s * 0.68, s * 0.14, s * 0.04);
      ctx.fill();

      // Steam swirl
      ctx.strokeStyle = 'rgba(156, 163, 175, 0.6)';
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.4);
      ctx.quadraticCurveTo(0, -s * 0.55, -s * 0.05, -s * 0.7);
      ctx.stroke();
    };

    const drawPizza = (s: number) => {
      // Crust
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, -s * 0.4);
      ctx.lineTo(s * 0.45, -s * 0.4);
      ctx.lineTo(0, s * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#FBBF24'; // Melted cheese
      ctx.fill();

      // Top crust bar
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.roundRect(-s * 0.48, -s * 0.48, s * 0.96, s * 0.15, s * 0.06);
      ctx.fill();

      // Pepperoni slices
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(-s * 0.15, -s * 0.15, s * 0.09, 0, Math.PI * 2);
      ctx.arc(s * 0.18, -s * 0.1, s * 0.08, 0, Math.PI * 2);
      ctx.arc(0, s * 0.15, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawBook = (s: number) => {
      // Hardcover book cover
      ctx.fillStyle = '#4F46E5';
      ctx.beginPath();
      ctx.roundRect(-s * 0.4, -s * 0.45, s * 0.8, s * 0.9, s * 0.08);
      ctx.fill();

      // Pages layer
      ctx.fillStyle = '#E0E7FF';
      ctx.fillRect(-s * 0.32, -s * 0.38, s * 0.68, s * 0.76);

      // Spine & Ribbon
      ctx.fillStyle = '#3730A3';
      ctx.fillRect(-s * 0.4, -s * 0.45, s * 0.12, s * 0.9);

      ctx.fillStyle = '#EC4899';
      ctx.fillRect(s * 0.05, s * 0.2, s * 0.08, s * 0.35);
    };

    const drawPencil = (s: number) => {
      // Pencil shaft
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-s * 0.12, -s * 0.35, s * 0.24, s * 0.6);

      // Wood tip
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, s * 0.25);
      ctx.lineTo(s * 0.12, s * 0.25);
      ctx.lineTo(0, s * 0.48);
      ctx.closePath();
      ctx.fill();

      // Graphite point
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, s * 0.38);
      ctx.lineTo(s * 0.05, s * 0.38);
      ctx.lineTo(0, s * 0.48);
      ctx.closePath();
      ctx.fill();

      // Silver ferrule & pink eraser
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(-s * 0.12, -s * 0.42, s * 0.24, s * 0.07);
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.roundRect(-s * 0.12, -s * 0.54, s * 0.24, s * 0.12, s * 0.04);
      ctx.fill();
    };

    const drawController = (s: number) => {
      // Ergonomic Gamepad Body
      ctx.fillStyle = '#1E1F22';
      ctx.strokeStyle = '#383A40';
      ctx.lineWidth = Math.max(1, s * 0.04);
      ctx.beginPath();
      ctx.roundRect(-s * 0.5, -s * 0.3, s * 1.0, s * 0.6, s * 0.2);
      ctx.fill();
      ctx.stroke();

      // D-Pad cross (left)
      ctx.fillStyle = '#4B5563';
      ctx.fillRect(-s * 0.36, -s * 0.12, s * 0.16, s * 0.06);
      ctx.fillRect(-s * 0.31, -s * 0.17, s * 0.06, s * 0.16);

      // Action buttons (right)
      ctx.fillStyle = '#5865F2';
      ctx.beginPath();
      ctx.arc(s * 0.25, -s * 0.12, s * 0.045, 0, Math.PI * 2);
      ctx.arc(s * 0.35, -s * 0.12, s * 0.045, 0, Math.PI * 2);
      ctx.arc(s * 0.3, -s * 0.17, s * 0.045, 0, Math.PI * 2);
      ctx.arc(s * 0.3, -s * 0.07, s * 0.045, 0, Math.PI * 2);
      ctx.fill();

      // Analog sticks (bottom)
      ctx.fillStyle = '#111214';
      ctx.beginPath();
      ctx.arc(-s * 0.15, s * 0.08, s * 0.09, 0, Math.PI * 2);
      ctx.arc(s * 0.15, s * 0.08, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawGameDisc = (s: number) => {
      // Outer CD / Disc
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#374151';
      ctx.fill();

      // Holographic Rainbow Sheen Arc
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.38, 0, Math.PI * 1.3);
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = s * 0.14;
      ctx.stroke();

      // Central hole cutout
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#18191C'; // canvas background color
      ctx.fill();
    };

    const drawJoystick = (s: number) => {
      // Arcade base
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.roundRect(-s * 0.35, s * 0.15, s * 0.7, s * 0.25, s * 0.06);
      ctx.fill();

      // Metal shaft
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(-s * 0.05, -s * 0.2, s * 0.1, s * 0.35);

      // Red ball top
      ctx.beginPath();
      ctx.arc(0, -s * 0.25, s * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
    };

    const drawHeadphones = (s: number) => {
      // Headband arc
      ctx.beginPath();
      ctx.arc(0, -s * 0.05, s * 0.38, Math.PI, 0);
      ctx.lineWidth = Math.max(2, s * 0.09);
      ctx.strokeStyle = '#5865F2';
      ctx.stroke();

      // Left earcup
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.roundRect(-s * 0.44, -s * 0.15, s * 0.16, s * 0.38, s * 0.08);
      ctx.fill();

      // Right earcup
      ctx.beginPath();
      ctx.roundRect(s * 0.28, -s * 0.15, s * 0.16, s * 0.38, s * 0.08);
      ctx.fill();
    };

    const drawMusicNote = (s: number) => {
      // Dual eighth notes with connecting beam
      ctx.fillStyle = '#7289DA';
      // Left note head
      ctx.beginPath();
      ctx.arc(-s * 0.2, s * 0.2, s * 0.12, 0, Math.PI * 2);
      ctx.arc(s * 0.2, s * 0.1, s * 0.12, 0, Math.PI * 2);
      ctx.fill();

      // Stems
      ctx.fillRect(-s * 0.1, -s * 0.3, s * 0.06, s * 0.5);
      ctx.fillRect(s * 0.3, -s * 0.4, s * 0.06, s * 0.5);

      // Beam
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.22);
      ctx.lineTo(s * 0.36, -s * 0.32);
      ctx.lineTo(s * 0.36, -s * 0.4);
      ctx.lineTo(-s * 0.1, -s * 0.3);
      ctx.closePath();
      ctx.fill();
    };

    const drawMicrophone = (s: number) => {
      // Capsule
      ctx.fillStyle = '#9CA3AF';
      ctx.beginPath();
      ctx.roundRect(-s * 0.16, -s * 0.4, s * 0.32, s * 0.45, s * 0.14);
      ctx.fill();

      // Base stand
      ctx.fillStyle = '#4B5563';
      ctx.fillRect(-s * 0.05, 0.05, s * 0.1, s * 0.3);
      ctx.beginPath();
      ctx.arc(0, s * 0.35, s * 0.22, 0, Math.PI);
      ctx.fill();
    };

    const drawChatBubble = (s: number) => {
      ctx.fillStyle = '#5865F2';
      ctx.beginPath();
      ctx.roundRect(-s * 0.42, -s * 0.32, s * 0.84, s * 0.56, s * 0.16);
      ctx.fill();

      // Tail
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 0.24);
      ctx.lineTo(-s * 0.35, s * 0.42);
      ctx.lineTo(-s * 0.05, s * 0.24);
      ctx.closePath();
      ctx.fill();

      // 3 dots
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-s * 0.18, -s * 0.04, s * 0.05, 0, Math.PI * 2);
      ctx.arc(0, -s * 0.04, s * 0.05, 0, Math.PI * 2);
      ctx.arc(s * 0.18, -s * 0.04, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawPopcorn = (s: number) => {
      // Red & white cinema bucket
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.15);
      ctx.lineTo(s * 0.3, -s * 0.15);
      ctx.lineTo(s * 0.22, s * 0.42);
      ctx.lineTo(-s * 0.22, s * 0.42);
      ctx.closePath();
      ctx.fill();

      // White stripes
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-s * 0.14, -s * 0.15, s * 0.08, s * 0.55);
      ctx.fillRect(s * 0.06, -s * 0.15, s * 0.08, s * 0.55);

      // Fluffy golden popcorn puffs
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(-s * 0.18, -s * 0.22, s * 0.11, 0, Math.PI * 2);
      ctx.arc(0, -s * 0.26, s * 0.13, 0, Math.PI * 2);
      ctx.arc(s * 0.18, -s * 0.22, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawTicket = (s: number) => {
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.roundRect(-s * 0.45, -s * 0.24, s * 0.9, s * 0.48, s * 0.06);
      ctx.fill();

      // Notches on left & right
      ctx.fillStyle = '#18191C'; // background cutout
      ctx.beginPath();
      ctx.arc(-s * 0.45, 0, s * 0.09, 0, Math.PI * 2);
      ctx.arc(s * 0.45, 0, s * 0.09, 0, Math.PI * 2);
      ctx.fill();

      // Star in center
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawHeart = (s: number) => {
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s * 0.45, s * 0.1, -s * 0.45, -s * 0.35, 0, -s * 0.18);
      ctx.bezierCurveTo(s * 0.45, -s * 0.35, s * 0.45, s * 0.1, 0, s * 0.35);
      ctx.fill();
    };

    const drawLightning = (s: number) => {
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.moveTo(s * 0.08, -s * 0.45);
      ctx.lineTo(-s * 0.25, 0);
      ctx.lineTo(-s * 0.02, 0);
      ctx.lineTo(-s * 0.15, s * 0.45);
      ctx.lineTo(s * 0.25, -s * 0.05);
      ctx.lineTo(s * 0.02, -s * 0.05);
      ctx.closePath();
      ctx.fill();
    };

    const renderObject = (obj: FloatingObject) => {
      switch (obj.type) {
        case 'samosa': drawSamosa(obj.size); break;
        case 'burger': drawBurger(obj.size); break;
        case 'coffee': drawCoffee(obj.size); break;
        case 'pizza': drawPizza(obj.size); break;
        case 'book': drawBook(obj.size); break;
        case 'pencil': drawPencil(obj.size); break;
        case 'controller': drawController(obj.size); break;
        case 'gamedisc': drawGameDisc(obj.size); break;
        case 'joystick': drawJoystick(obj.size); break;
        case 'headphones': drawHeadphones(obj.size); break;
        case 'musicnote': drawMusicNote(obj.size); break;
        case 'microphone': drawMicrophone(obj.size); break;
        case 'chatbubble': drawChatBubble(obj.size); break;
        case 'popcorn': drawPopcorn(obj.size); break;
        case 'ticket': drawTicket(obj.size); break;
        case 'heart': drawHeart(obj.size); break;
        case 'lightning': drawLightning(obj.size); break;
        default: drawChatBubble(obj.size);
      }
    };

    // =========================================================================
    // MAIN ANIMATION LOOP
    // =========================================================================

    const render = (time: number) => {
      if (!isVisible) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smooth mouse parallax lerp
      mouse.currentOffsetX += (mouse.targetOffsetX - mouse.currentOffsetX) * 0.05;
      mouse.currentOffsetY += (mouse.targetOffsetY - mouse.currentOffsetY) * 0.05;

      // 1. RENDER SIGNATURE FLOATING OBJECTS (20-30% visual layer)
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];

        if (!prefersReducedMotion) {
          // Slow floating drift
          obj.x += obj.vx;
          obj.y += obj.vy;

          // Sinusoidal floating breathing
          const floatOffset = Math.sin(time * obj.floatFreq + obj.floatPhase) * obj.floatAmplitude;
          const currentY = obj.y + floatOffset;

          // Tiny continuous rotation
          obj.rotation += obj.rotSpeed;

          // Wrap around edges with generous margin
          if (obj.x < -80) obj.x = canvas.width + 80;
          if (obj.x > canvas.width + 80) obj.x = -80;
          if (obj.y < -80) obj.y = canvas.height + 80;
          if (obj.y > canvas.height + 80) obj.y = -80;

          // Subtle Parallax offset (2-6px for foreground, 1-3px for background)
          const parallaxX = mouse.currentOffsetX * obj.parallaxFactor;
          const parallaxY = mouse.currentOffsetY * obj.parallaxFactor;

          // Cursor proximity check for gentle hover reaction
          let hoverScale = 1.0;
          let hoverAlpha = obj.baseAlpha;

          if (interactive && !isMobile && mouse.x > 0) {
            const dx = (obj.x + parallaxX) - mouse.x;
            const dy = (currentY + parallaxY) - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 90) {
              hoverScale = 1.06;
              hoverAlpha = Math.min(obj.baseAlpha * 1.5, 0.85);
            }
          }

          obj.alpha += (hoverAlpha - obj.alpha) * 0.08;

          ctx.save();
          ctx.translate(obj.x + parallaxX, currentY + parallaxY);
          ctx.rotate(obj.rotation);
          ctx.scale(hoverScale, hoverScale);
          ctx.globalAlpha = obj.alpha;

          // Subtle shadow for foreground & midground objects
          if (obj.layer === 'foreground') {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetY = 4;
          } else if (obj.layer === 'midground') {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;
          }

          renderObject(obj);
          ctx.restore();
        } else {
          // Static position when reduced motion is preferred
          ctx.save();
          ctx.translate(obj.baseX, obj.baseY);
          ctx.globalAlpha = obj.baseAlpha;
          renderObject(obj);
          ctx.restore();
        }
      }

      // 2. RENDER TINY AMBIENT DUST PARTICLES (65% volume)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < -10) p.x = canvas.width + 10;
          if (p.x > canvas.width + 10) p.x = -10;
          if (p.y < -10) p.y = canvas.height + 10;
          if (p.y > canvas.height + 10) p.y = -10;

          // Gentle cursor avoidance
          if (interactive && !isMobile && mouse.x > 0) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80 && dist > 0) {
              const force = (80 - dist) / 80;
              p.x -= (dx / dist) * force * 1.2;
              p.y -= (dy / dist) * force * 1.2;
              p.alpha = Math.min(p.baseAlpha * 1.8, 0.4);
            } else {
              p.alpha += (p.baseAlpha - p.alpha) * 0.05;
            }
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [density, interactive, contextType]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1
      }}
      aria-hidden="true"
    >
      {/* 5-10% Subtle Slow-Drifting Ambient Orbs (16-18s) */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />

      {/* High-Performance Canvas for Signature Floating Objects + Ambient Dust */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};
