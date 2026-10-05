import React, { useState } from 'react';
import { Plus, Compass, Sparkles } from 'lucide-react';
import { SpaceCommunity } from '../../types/index.ts';
import { VibeSpaceLogo } from '../ui/VibeSpaceLogo.tsx';

interface LeftmostSpaceBarProps {
  spaces: SpaceCommunity[];
  activeSpaceId: string;
  onSelectSpace: (spaceId: string) => void;
  onOpenDiscover: () => void;
  pendingRequestsCount?: number;
}

export const LeftmostSpaceBar: React.FC<LeftmostSpaceBarProps> = ({
  spaces,
  activeSpaceId,
  onSelectSpace,
  onOpenDiscover,
  pendingRequestsCount = 0
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <nav
      style={{
        width: '72px',
        height: '100%',
        backgroundColor: 'var(--bg-tertiary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
        gap: '8px',
        flexShrink: 0,
        zIndex: 30,
        overflowY: 'auto'
      }}
      aria-label="Communities and Spaces"
    >
      {/* Home / Direct Messages Icon */}
      <div
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={() => setHoveredId('home')}
        onMouseLeave={() => setHoveredId(null)}
      >
        {/* Left Indicator Pill with spring height transition */}
        <span
          className="space-pill-indicator"
          style={{
            height: activeSpaceId === 'home' ? '40px' : hoveredId === 'home' ? '20px' : '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: activeSpaceId === 'home' || hoveredId === 'home' ? 1 : 0
          }}
        />

        <button
          onClick={() => onSelectSpace('home')}
          className={`space-icon-btn ${activeSpaceId === 'home' ? 'active' : ''}`}
          style={{
            backgroundColor: activeSpaceId === 'home' ? 'var(--accent-primary)' : 'var(--bg-primary)',
            color: activeSpaceId === 'home' ? '#FFFFFF' : 'var(--text-secondary)',
            boxShadow: hoveredId === 'home' ? '0 4px 16px rgba(88, 101, 242, 0.4)' : undefined
          }}
          title="Direct Messages & Friends"
        >
          <VibeSpaceLogo size={28} glow={false} />
          {pendingRequestsCount > 0 && (
            <span
              className="badge-pop"
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                background: 'var(--status-dnd)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-tertiary)'
              }}
            >
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* Separator Line */}
      <div
        style={{
          width: '32px',
          height: '2px',
          backgroundColor: 'var(--border-subtle)',
          borderRadius: '1px',
          margin: '4px 0'
        }}
      />

      {/* Spaces / Communities List */}
      {spaces.map((space) => {
        const isActive = activeSpaceId === space.id;
        const isHovered = hoveredId === space.id;

        return (
          <div
            key={space.id}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={() => setHoveredId(space.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Left Indicator Pill */}
            <span
              className="space-pill-indicator"
              style={{
                height: isActive ? '40px' : isHovered ? '20px' : '0px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: isActive || isHovered ? 1 : 0
              }}
            />

            <button
              onClick={() => onSelectSpace(space.id)}
              className={`space-icon-btn ${isActive ? 'active' : ''}`}
              style={{
                backgroundColor: isActive ? 'var(--accent-primary)' : space.iconBg || 'var(--bg-primary)',
                color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '15px',
                boxShadow: isHovered
                  ? `0 4px 14px ${space.iconBg || 'rgba(88, 101, 242, 0.4)'}`
                  : undefined
              }}
              title={space.name}
            >
              {space.iconText}
            </button>
          </div>
        );
      })}

      {/* Add Space (+) Button */}
      <div
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={() => setHoveredId('add')}
        onMouseLeave={() => setHoveredId(null)}
      >
        <span
          className="space-pill-indicator"
          style={{
            height: hoveredId === 'add' ? '20px' : '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: hoveredId === 'add' ? 1 : 0
          }}
        />
        <button
          onClick={onOpenDiscover}
          className="space-icon-btn btn-icon-rotate"
          style={{
            color: 'var(--status-online)',
            backgroundColor: 'var(--bg-primary)'
          }}
          title="Add a Space or Join Room"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Explore / Discover Spaces Button */}
      <div
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onMouseEnter={() => setHoveredId('explore')}
        onMouseLeave={() => setHoveredId(null)}
      >
        <span
          className="space-pill-indicator"
          style={{
            height: hoveredId === 'explore' ? '20px' : '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: hoveredId === 'explore' ? 1 : 0
          }}
        />
        <button
          onClick={onOpenDiscover}
          className="space-icon-btn btn-icon-scale"
          style={{
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-primary)'
          }}
          title="Discover Spaces & Watch Rooms"
        >
          <Compass size={22} />
        </button>
      </div>
    </nav>
  );
};
