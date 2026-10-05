import React, { useState } from 'react';
import { Eye, EyeOff, User as UserIcon, MessageSquare, Tv, Radio, Users, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { VibeSpaceLogo } from '../ui/VibeSpaceLogo.tsx';

export const AuthView: React.FC = () => {
  const { login, register, isLoading } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleQuickLogin = async (quickUsername: string, quickPass: string) => {
    setError(null);
    setIsRegisterMode(false);
    setUsername(quickUsername);
    setPassword(quickPass);
    setStatusMessage(`Signing in as ${quickUsername}...`);
    try {
      await login(quickUsername, quickPass);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setStatusMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) {
      setError('Please provide all credentials.');
      return;
    }

    try {
      if (isRegisterMode) {
        if (!displayName.trim()) {
          setError('Display name is required.');
          return;
        }
        setStatusMessage('Creating your Vibe Space account...');
        await register(cleanUsername, displayName.trim(), password);
      } else {
        setStatusMessage('Signing into Vibe Space...');
        await login(cleanUsername, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setStatusMessage(null);
    }
  };

  const featurePills = [
    { icon: MessageSquare, text: 'Fast Real-Time Messaging & Direct DMs' },
    { icon: Radio, text: 'Clear High-Fidelity Voice & Video Calls' },
    { icon: Tv, text: 'Synchronized YouTube Watch Together' },
    { icon: Users, text: 'Custom Spaces, Channels & Communities' }
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: 'var(--bg-tertiary)',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          minHeight: '520px',
          borderRadius: 'var(--radius-md)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* LEFT COLUMN: Brand Atmosphere */}
        <div
          style={{
            padding: '44px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-tertiary)',
            borderRight: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <VibeSpaceLogo size={46} showWordmark={true} glow={false} />

            <div style={{ marginTop: '36px' }}>
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  lineHeight: '1.25',
                  color: 'var(--text-primary)',
                  marginBottom: '12px'
                }}
              >
                Where friends <br />
                hang out and vibe.
              </h2>

              <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', lineHeight: '1.6' }}>
                Join text and voice channels, call friends directly, and enjoy synchronized Watch Together rooms in a fast, modern social space.
              </p>
            </div>
          </div>

          {/* Feature Highlights */}
          <div style={{ marginTop: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {featurePills.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={16} color="var(--accent-secondary)" />
                  </div>
                  <span>{f.text}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Vibe Space • Modern Social & Gaming Communication
          </div>
        </div>

        {/* RIGHT COLUMN: Auth Form */}
        <div
          style={{
            padding: '44px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-xs)',
              padding: '3px',
              marginBottom: '24px'
            }}
          >
            <button
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: !isRegisterMode ? 'var(--accent-primary)' : 'transparent',
                color: !isRegisterMode ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all var(--trans-fast)'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegisterMode(true);
                setError(null);
              }}
              style={{
                flex: 1,
                padding: '9px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                background: isRegisterMode ? 'var(--accent-primary)' : 'transparent',
                color: isRegisterMode ? '#FFFFFF' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all var(--trans-fast)'
              }}
            >
              Register
            </button>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {isRegisterMode ? 'Create an account' : 'Welcome back!'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {isRegisterMode
              ? 'Enter your desired credentials to enter Vibe Space.'
              : 'Sign in to access your spaces, voice rooms, and watch parties.'}
          </p>

          {/* Quick Demo Login Chips */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}
            >
              ⚡ One-Click Demo Login:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleQuickLogin('toshal', 'password123')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Log in as toshal"
              >
                <span style={{ fontWeight: 700 }}>toshal</span>
                <span style={{ fontSize: '10.5px', color: 'var(--accent-secondary)' }}>(Host)</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('alice_cyber', 'password123')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Log in as alice_cyber"
              >
                <span style={{ fontWeight: 700 }}>alice_cyber</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('bob_runner', 'password123')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Log in as bob_runner"
              >
                <span style={{ fontWeight: 700 }}>bob_runner</span>
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'rgba(242, 63, 66, 0.15)',
                border: '1px solid var(--status-dnd)',
                color: '#FFA8A8',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ fontWeight: 600 }}>{error}</div>
              {error.toLowerCase().includes('already taken') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-secondary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textAlign: 'left',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  Click here to Sign In with this username instead →
                </button>
              )}
            </div>
          )}

          {statusMessage && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'rgba(88, 101, 242, 0.15)',
                border: '1px solid var(--accent-primary)',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={14} color="var(--accent-secondary)" />
              <span>{statusMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Display Name (Only in Register mode) */}
            {isRegisterMode && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '6px'
                  }}
                >
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="app-input"
                  required
                />
              </div>
            )}

            {/* Username */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '6px'
                }}
              >
                Username
              </label>
              <input
                type="text"
                placeholder="e.g. alex_vibe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="app-input"
                autoCapitalize="none"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '6px'
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input"
                  style={{ paddingRight: '40px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                marginTop: '10px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 700,
                width: '100%'
              }}
            >
              {isLoading ? 'Connecting...' : isRegisterMode ? 'Sign Up' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
