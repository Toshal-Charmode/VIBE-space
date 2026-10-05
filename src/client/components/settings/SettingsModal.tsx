import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Smile,
  Shield,
  Bell,
  Palette,
  Mic,
  Keyboard,
  Accessibility,
  Globe,
  Sliders,
  LogOut,
  X,
  Play,
  Volume2,
  Video,
  Monitor,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Avatar } from '../ui/Avatar.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayIntro: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onReplayIntro
}) => {
  const { user, logout } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('account');

  // Appearance settings state
  const [theme, setTheme] = useState<'dark' | 'midnight'>('dark');
  const [density, setDensity] = useState<'cozy' | 'compact'>('cozy');
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Audio / Video settings state
  const [inputVolume, setInputVolume] = useState<number>(85);
  const [outputVolume, setOutputVolume] = useState<number>(100);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);
  const [isMicTesting, setIsMicTesting] = useState<boolean>(false);
  const [testLevel, setTestLevel] = useState<number>(0);

  // Keyboard shortcut listener for ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Mic test simulation
  useEffect(() => {
    let interval: any;
    if (isMicTesting) {
      interval = setInterval(() => {
        setTestLevel(Math.floor(20 + Math.random() * 70));
      }, 120);
    } else {
      setTestLevel(0);
    }
    return () => clearInterval(interval);
  }, [isMicTesting]);

  if (!isOpen || !user) return null;

  const categories = [
    {
      group: 'USER SETTINGS',
      items: [
        { id: 'account', label: 'My Account', icon: UserIcon },
        { id: 'profile', label: 'User Profile', icon: Smile },
        { id: 'privacy', label: 'Privacy & Safety', icon: Shield }
      ]
    },
    {
      group: 'APP SETTINGS',
      items: [
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'voice', label: 'Voice & Video', icon: Mic },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'keybinds', label: 'Keybinds', icon: Keyboard },
        { id: 'accessibility', label: 'Accessibility', icon: Accessibility }
      ]
    }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '940px',
          maxWidth: '95vw',
          height: '660px',
          maxHeight: '90vh',
          display: 'flex',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* LEFT SETTINGS SIDEBAR */}
        <div
          style={{
            width: '240px',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '40px 16px 20px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {categories.map((cat) => (
              <div key={cat.group}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    padding: '4px 8px 6px 8px'
                  }}
                >
                  {cat.group}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeCategory === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveCategory(item.id)}
                        className={`channel-item ${isActive ? 'channel-item-active' : ''}`}
                        style={{
                          width: '100%',
                          background: isActive ? 'var(--bg-modifier-selected)' : 'transparent',
                          border: 'none',
                          color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                          fontWeight: isActive ? 600 : 500,
                          textAlign: 'left'
                        }}
                      >
                        <Icon size={17} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quick Actions in Sidebar */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  padding: '4px 8px 6px 8px'
                }}
              >
                EXPERIENCE
              </div>
              <button
                onClick={() => {
                  onClose();
                  onReplayIntro();
                }}
                className="channel-item"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-secondary)',
                  textAlign: 'left'
                }}
              >
                <Play size={17} />
                <span>Replay Intro Animation</span>
              </button>
            </div>
          </div>

          {/* Log Out Button */}
          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="channel-item"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: 'var(--status-dnd)',
                textAlign: 'left'
              }}
            >
              <LogOut size={17} />
              <span style={{ fontWeight: 600 }}>Log Out</span>
            </button>
          </div>
        </div>

        {/* RIGHT CONTENT PANE */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-primary)',
            padding: '40px 48px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Top ESC Close Button */}
          <div
            style={{
              position: 'absolute',
              top: '24px',
              right: '28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={onClose}
            title="Close Settings (Esc)"
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '2px solid var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                transition: 'all var(--trans-fast)'
              }}
              className="hover-lift"
            >
              <X size={18} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>
              ESC
            </span>
          </div>

          {/* 1. MY ACCOUNT SECTION */}
          {activeCategory === 'account' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>
                My Account
              </h2>

              {/* Profile Card Banner */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  marginBottom: '28px'
                }}
              >
                <Avatar name={user.displayName} src={user.avatarUrl} size="lg" status="online" />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {user.displayName}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    @{user.username}
                  </div>
                </div>
              </div>

              {/* Account Details Box */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Display Name
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {user.displayName}
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                    Edit
                  </button>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Username
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px' }}>
                      @{user.username}
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                    Edit
                  </button>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Identity Fingerprint
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {user.publicKey ? `${user.publicKey.substring(0, 24)}...` : 'Protected Key'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. APPEARANCE SECTION */}
          {activeCategory === 'appearance' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>
                Appearance
              </h2>

              {/* Theme Selector */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Theme
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div
                    onClick={() => setTheme('dark')}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card)',
                      border: theme === 'dark' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Vibe Dark (Default)</span>
                      {theme === 'dark' && <Check size={18} color="var(--accent-primary)" />}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Balanced #313338 dark theme optimized for long gaming and chatting sessions.
                    </p>
                  </div>

                  <div
                    onClick={() => setTheme('midnight')}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: theme === 'midnight' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Midnight Space</span>
                      {theme === 'midnight' && <Check size={18} color="var(--accent-primary)" />}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Deep #1E1F22 obsidian shade with high contrast text.
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Display Density */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Message Density
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => setDensity('cozy')}
                    className={density === 'cozy' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px 20px' }}
                  >
                    Cozy (Avatars & Spacing)
                  </button>
                  <button
                    onClick={() => setDensity('compact')}
                    className={density === 'compact' ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '10px 20px' }}
                  >
                    Compact (High Message Count)
                  </button>
                </div>
              </div>

              {/* Reduced Motion Toggle */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      Enable Reduced Motion
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Reduces the intensity of space animations and smooth transitions.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. VOICE & VIDEO SECTION */}
          {activeCategory === 'voice' && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '20px' }}>
                Voice & Video Settings
              </h2>

              {/* Volume Sliders */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '28px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Input Volume
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {inputVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={inputVolume}
                    onChange={(e) => setInputVolume(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Output Volume
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {outputVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={outputVolume}
                    onChange={(e) => setOutputVolume(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* Mic Test Section */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '20px',
                  marginBottom: '28px'
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Mic Test
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                  Having mic issues? Test your audio input levels in real-time.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    onClick={() => setIsMicTesting(!isMicTesting)}
                    className={isMicTesting ? 'btn-danger' : 'btn-primary'}
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                  >
                    {isMicTesting ? 'Stop Testing' : 'Let\'s Check'}
                  </button>

                  <div
                    style={{
                      flex: 1,
                      height: '14px',
                      backgroundColor: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${testLevel}%`,
                        backgroundColor: 'var(--status-online)',
                        transition: 'width 0.1s ease-out',
                        borderRadius: 'var(--radius-full)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Noise Suppression */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Noise Suppression
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Removes background keyboard typing and room echoes using WebRTC DSP.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={noiseSuppression}
                  onChange={(e) => setNoiseSuppression(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                />
              </div>
            </div>
          )}

          {/* 4. OTHER SECTIONS (Profile, Privacy, Notifications, etc.) */}
          {['profile', 'privacy', 'notifications', 'keybinds', 'accessibility'].includes(activeCategory) && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
                {activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Settings
              </h2>
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '24px',
                  color: 'var(--text-secondary)',
                  fontSize: '13.5px',
                  lineHeight: '1.6'
                }}
              >
                Configured with optimal presets for Vibe Space social communication and low-latency gaming.
                All parameters automatically sync across your active session.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
