import React from 'react';
import { MessageSquare, Hash, Tv, Users, Settings } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: 'chat' | 'watch' | 'discover';
  onSelectTab: (tab: 'chat' | 'watch' | 'discover') => void;
  onOpenSettings: () => void;
  pendingRequestsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  pendingRequestsCount = 0
}) => {
  return (
    <nav
      className="hide-on-desktop"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: 'var(--bg-tertiary)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
      aria-label="Mobile navigation"
    >
      {/* 1. Chat / Channels */}
      <button
        onClick={() => onSelectTab('chat')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          color: currentTab === 'chat' ? 'var(--accent-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px'
        }}
      >
        <MessageSquare size={20} strokeWidth={currentTab === 'chat' ? 2.4 : 1.8} />
        <span style={{ fontSize: '11px', fontWeight: currentTab === 'chat' ? 700 : 500 }}>
          Chat
        </span>
      </button>

      {/* 2. Watch Together */}
      <button
        onClick={() => onSelectTab('watch')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          color: currentTab === 'watch' ? 'var(--accent-vibe)' : 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px'
        }}
      >
        <Tv size={20} strokeWidth={currentTab === 'watch' ? 2.4 : 1.8} />
        <span style={{ fontSize: '11px', fontWeight: currentTab === 'watch' ? 700 : 500 }}>
          Watch
        </span>
      </button>

      {/* 3. Friends / Discover */}
      <button
        onClick={() => onSelectTab('discover')}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          color: currentTab === 'discover' ? 'var(--accent-secondary)' : 'var(--text-muted)',
          cursor: 'pointer',
          position: 'relative',
          padding: '6px'
        }}
      >
        <div style={{ position: 'relative' }}>
          <Users size={20} strokeWidth={currentTab === 'discover' ? 2.4 : 1.8} />
          {pendingRequestsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-8px',
                background: 'var(--status-dnd)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 700,
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {pendingRequestsCount}
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', fontWeight: currentTab === 'discover' ? 700 : 500 }}>
          Friends
        </span>
      </button>

      {/* 4. Settings */}
      <button
        onClick={onOpenSettings}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '6px'
        }}
      >
        <Settings size={20} strokeWidth={1.8} />
        <span style={{ fontSize: '11px', fontWeight: 500 }}>
          Settings
        </span>
      </button>
    </nav>
  );
};
