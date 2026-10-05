import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  RefreshCw,
  Maximize2,
  Minimize2,
  Monitor,
  MonitorOff,
  LayoutGrid,
  Square,
  AlertCircle,
  X
} from 'lucide-react';
import { useWebRTC } from '../../context/WebRTCContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Avatar } from '../ui/Avatar.tsx';

export const CallHUD: React.FC = () => {
  const { user: currentUser } = useAuth();
  const {
    activeCall,
    localStream,
    remoteStream,
    endCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    switchCamera,
    availableVideoDevices,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    isLocalSpeaking,
    isRemoteSpeaking,
    cameraDeniedMessage,
    micDeniedMessage,
    dismissPermissionWarning
  } = useWebRTC();

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'spotlight'>('grid');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Bind local stream to video element
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoMuted, layoutMode]);

  // Bind remote stream to video and audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, activeCall?.remoteIsVideoMuted, layoutMode]);

  // Call duration timer
  useEffect(() => {
    if (activeCall?.status !== 'connected' || !activeCall.startTime) {
      setDurationSec(0);
      return;
    }

    const interval = setInterval(() => {
      const sec = Math.floor((Date.now() - activeCall.startTime!) / 1000);
      setDurationSec(sec);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall?.status, activeCall?.startTime]);

  if (!activeCall || activeCall.status === 'idle') return null;

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine local video visibility
  const hasLocalVideoTrack = Boolean(
    localStream &&
    localStream.getVideoTracks().some((t) => t.readyState === 'live')
  );
  const showLocalVideo = hasLocalVideoTrack && !isVideoMuted;

  // Determine remote video visibility
  const hasRemoteVideoTrack = Boolean(
    remoteStream &&
    remoteStream.getVideoTracks().some((t) => t.readyState === 'live')
  );
  const showRemoteVideo = hasRemoteVideoTrack && !activeCall.remoteIsVideoMuted;

  // Minimized floating picture-in-picture pill
  if (isMinimized) {
    return (
      <div
        id="call-hud-minimized"
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          cursor: 'pointer'
        }}
        onClick={() => setIsMinimized(false)}
        title="Click to expand video call"
      >
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-medium)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.7)'
          }}
        >
          <div style={{ position: 'relative' }}>
            <Avatar name={activeCall.peerUser.displayName} src={activeCall.peerUser.avatarUrl} size="sm" />
            <span
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: activeCall.status === 'connected' ? 'var(--status-online)' : 'var(--status-idle)',
                border: '2px solid var(--bg-secondary)'
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {activeCall.peerUser.displayName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--status-online)', fontWeight: 600 }}>
              {activeCall.status === 'connected'
                ? `${activeCall.isVideo ? 'Video' : 'Voice'} • ${formatTime(durationSec)}`
                : 'Connecting...'}
            </div>
          </div>
          <Maximize2 size={16} color="var(--text-muted)" style={{ marginLeft: '6px' }} />
        </div>
      </div>
    );
  }

  // Render connection status text & color
  const renderConnectionStatus = () => {
    if (activeCall.status === 'connected') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-online)',
              boxShadow: '0 0 8px var(--status-online)'
            }}
          />
          <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
            {activeCall.isVideo ? 'Video Connected' : 'Voice Connected'} • {formatTime(durationSec)}
          </span>
        </div>
      );
    }
    if (activeCall.status === 'reconnecting') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-idle)',
              boxShadow: '0 0 8px var(--status-idle)'
            }}
          />
          <span style={{ color: 'var(--status-idle)', fontSize: '13px', fontWeight: 600 }}>
            Reconnecting...
          </span>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            boxShadow: '0 0 8px var(--accent-primary)'
          }}
        />
        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
          Connecting with {activeCall.peerUser.displayName}...
        </span>
      </div>
    );
  };

  return (
    <div
      id="video-call-modal"
      className="channel-content-enter"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9990,
        backgroundColor: 'rgba(11, 12, 16, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px',
        userSelect: 'none'
      }}
    >
      <audio ref={remoteAudioRef} autoPlay />

      {/* =========================================================================
          1. CALL HEADER (STATUS, INFO & ACTIONS)
          ========================================================================= */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {renderConnectionStatus()}
          {activeCall.isScreenSharing && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(88, 101, 242, 0.2)',
                color: 'var(--accent-secondary)',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Monitor size={12} /> You are sharing your screen
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Toggle Grid vs Spotlight Layout */}
          {activeCall.isVideo && (
            <button
              onClick={() => setLayoutMode(layoutMode === 'grid' ? 'spotlight' : 'grid')}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title={layoutMode === 'grid' ? 'Switch to Spotlight View' : 'Switch to Grid View'}
            >
              {layoutMode === 'grid' ? <Square size={14} /> : <LayoutGrid size={14} />}
              <span className="hide-on-mobile">{layoutMode === 'grid' ? 'Spotlight' : 'Grid'}</span>
            </button>
          )}

          <button
            onClick={() => setIsMinimized(true)}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Minimize call to floating widget"
          >
            <Minimize2 size={14} />
            <span className="hide-on-mobile">Minimize</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          PERMISSION ERROR NOTIFICATION BANNERS (Requirements 3 & 18)
          ========================================================================= */}
      {(cameraDeniedMessage || micDeniedMessage) && (
        <div
          style={{
            maxWidth: '1280px',
            width: '100%',
            margin: '12px auto 0 auto',
            padding: '10px 16px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'rgba(235, 69, 158, 0.12)',
            border: '1px solid rgba(235, 69, 158, 0.4)',
            color: '#FEE75C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#FEE75C" />
            <span>{cameraDeniedMessage || micDeniedMessage}</span>
          </div>
          <button
            onClick={dismissPermissionWarning}
            style={{ background: 'none', border: 'none', color: '#FEE75C', cursor: 'pointer', padding: '4px' }}
            title="Dismiss notice"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =========================================================================
          2. PARTICIPANT STAGE & RESPONSIVE GRID (Requirements 6, 7, 8, 9, 21)
          ========================================================================= */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: '100%',
          maxWidth: '1280px',
          margin: '14px auto',
          minHeight: 0
        }}
      >
        {activeCall.isVideo ? (
          /* ==================== VIDEO CALL MODE ==================== */
          layoutMode === 'grid' ? (
            /* RESPONSIVE 2-PARTICIPANT / MULTI-PARTICIPANT GRID (Requirement 6) */
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                alignItems: 'stretch'
              }}
            >
              {/* --- TILE 1: REMOTE PARTICIPANT TILE --- */}
              <div
                className={`video-tile-base participant-tile-enter ${isRemoteSpeaking ? 'video-speaking-active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  minHeight: '260px'
                }}
              >
                {showRemoteVideo ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      backgroundColor: '#000000'
                    }}
                  />
                ) : (
                  /* Camera OFF or Audio-only State (Requirement 7) */
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <div style={{ width: '96px', height: '96px', margin: '0 auto 16px auto' }}>
                      <Avatar
                        name={activeCall.peerUser.displayName}
                        src={activeCall.peerUser.avatarUrl}
                        size="xl"
                        status={isRemoteSpeaking ? 'online' : undefined}
                      />
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {activeCall.peerUser.displayName}
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-muted)',
                        fontSize: '12px'
                      }}
                    >
                      <VideoOff size={13} color="var(--status-dnd)" />
                      <span>Camera Off</span>
                    </div>
                  </div>
                )}

                {/* Bottom-left Participant Name Tag & Indicators */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {activeCall.peerUser.displayName}
                  </span>
                  {activeCall.remoteIsAudioMuted ? (
                    <span title="Microphone muted" style={{ display: 'inline-flex' }}>
                      <MicOff size={14} color="var(--status-dnd)" />
                    </span>
                  ) : (
                    <span title="Microphone active" style={{ display: 'inline-flex' }}>
                      <Mic size={14} color={isRemoteSpeaking ? 'var(--status-online)' : 'var(--text-muted)'} />
                    </span>
                  )}
                  {activeCall.remoteIsScreenSharing && (
                    <span title="Presenting screen" style={{ display: 'inline-flex' }}>
                      <Monitor size={14} color="var(--accent-secondary)" />
                    </span>
                  )}
                </div>
              </div>

              {/* --- TILE 2: LOCAL USER TILE (Requirement 8) --- */}
              <div
                className={`video-tile-base participant-tile-enter ${isLocalSpeaking ? 'video-speaking-active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  minHeight: '260px'
                }}
              >
                {showLocalVideo ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      backgroundColor: '#000000',
                      // Front camera is horizontally mirrored; screen share is non-mirrored
                      transform: isScreenSharing ? 'none' : 'scaleX(-1)'
                    }}
                  />
                ) : (
                  /* Camera OFF state for local user */
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <div style={{ width: '96px', height: '96px', margin: '0 auto 16px auto' }}>
                      <Avatar
                        name={currentUser?.displayName || 'You'}
                        src={currentUser?.avatarUrl}
                        size="xl"
                        status={isLocalSpeaking ? 'online' : undefined}
                      />
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {currentUser?.displayName || 'You'} (You)
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-muted)',
                        fontSize: '12px'
                      }}
                    >
                      <VideoOff size={13} color="var(--status-dnd)" />
                      <span>Camera Off</span>
                    </div>
                  </div>
                )}

                {/* Bottom-left Local Name Tag */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {currentUser?.displayName || 'You'} (You)
                  </span>
                  {isAudioMuted ? (
                    <span title="You are muted" style={{ display: 'inline-flex' }}>
                      <MicOff size={14} color="var(--status-dnd)" />
                    </span>
                  ) : (
                    <span title="Microphone active" style={{ display: 'inline-flex' }}>
                      <Mic size={14} color={isLocalSpeaking ? 'var(--status-online)' : 'var(--text-muted)'} />
                    </span>
                  )}
                  {isScreenSharing && (
                    <span title="You are sharing screen" style={{ display: 'inline-flex' }}>
                      <Monitor size={14} color="var(--accent-secondary)" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* SPOTLIGHT VIEW: REMOTE LARGE VIDEO + FLOATING LOCAL PIP */
            <div
              className={`video-tile-base participant-tile-enter ${isRemoteSpeaking ? 'video-speaking-active' : ''}`}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {showRemoteVideo ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000000'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <Avatar name={activeCall.peerUser.displayName} src={activeCall.peerUser.avatarUrl} size="xl" />
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '16px' }}>
                    {activeCall.peerUser.displayName}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Camera is off
                  </p>
                </div>
              )}

              {/* Bottom-left Remote Name Tag */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {activeCall.peerUser.displayName}
                </span>
                {activeCall.remoteIsAudioMuted ? (
                  <MicOff size={14} color="var(--status-dnd)" />
                ) : (
                  <Mic size={14} color={isRemoteSpeaking ? 'var(--status-online)' : 'var(--text-muted)'} />
                )}
              </div>

              {/* Floating Picture-In-Picture for Local Camera Preview */}
              <div
                className={`video-tile-base ${isLocalSpeaking ? 'video-speaking-active' : ''}`}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  width: '200px',
                  height: '130px',
                  boxShadow: '0 12px 36px rgba(0, 0, 0, 0.7)',
                  zIndex: 20
                }}
              >
                {showLocalVideo ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: isScreenSharing ? 'none' : 'scaleX(-1)'
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--bg-tertiary)'
                    }}
                  >
                    <Avatar name={currentUser?.displayName || 'You'} src={currentUser?.avatarUrl} size="sm" />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Camera Off</span>
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '6px',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: '#ffffff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                  }}
                >
                  You {isAudioMuted && '• Muted'}
                </div>
              </div>
            </div>
          )
        ) : (
          /* ==================== VOICE-ONLY CALL VIEW ==================== */
          <div
            className="video-tile-base participant-tile-enter"
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 24px'
            }}
          >
            <div
              className={isRemoteSpeaking ? 'speaking-pulse' : ''}
              style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                margin: '0 auto 24px auto',
                borderRadius: '50%',
                border: `3px solid ${isRemoteSpeaking ? 'var(--status-online)' : 'var(--border-medium)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-secondary)',
                transition: 'border-color 0.2s ease'
              }}
            >
              <Avatar
                name={activeCall.peerUser.displayName}
                src={activeCall.peerUser.avatarUrl}
                size="xl"
                status={isRemoteSpeaking ? 'online' : undefined}
              />
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {activeCall.peerUser.displayName}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginBottom: '16px' }}>
              @{activeCall.peerUser.username}
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                fontSize: '12.5px',
                color: 'var(--text-secondary)'
              }}
            >
              {activeCall.remoteIsAudioMuted ? (
                <>
                  <MicOff size={14} color="var(--status-dnd)" />
                  <span>Remote user is muted</span>
                </>
              ) : (
                <>
                  <Mic size={14} color={isRemoteSpeaking ? 'var(--status-online)' : 'var(--accent-secondary)'} />
                  <span>{isRemoteSpeaking ? 'Speaking...' : 'Listening'}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. BOTTOM CALL CONTROLS DOCK (Requirements 4, 5, 15, 16, 19)
          ========================================================================= */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '12px 28px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(24, 25, 28, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-medium)',
          maxWidth: '520px',
          margin: '0 auto',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.65)',
          flexShrink: 0
        }}
      >
        {/* 1. Microphone Toggle Button (Requirement 4) */}
        <button
          id="btn-call-toggle-mic"
          onClick={toggleAudio}
          className={`video-control-btn ${isAudioMuted ? 'btn-danger' : 'btn-secondary'}`}
          title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          aria-label={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* 2. Camera Toggle Button (Requirement 5) */}
        <button
          id="btn-call-toggle-camera"
          onClick={toggleVideo}
          className={`video-control-btn ${isVideoMuted ? 'btn-danger' : 'btn-secondary'}`}
          title={isVideoMuted ? 'Turn Camera ON' : 'Turn Camera OFF'}
          aria-label={isVideoMuted ? 'Turn Camera ON' : 'Turn Camera OFF'}
        >
          {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
        </button>

        {/* 3. Screen Share Toggle Button (Requirement 16) */}
        <button
          id="btn-call-toggle-screen"
          onClick={toggleScreenShare}
          className={`video-control-btn ${isScreenSharing ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            backgroundColor: isScreenSharing ? 'var(--accent-primary)' : undefined,
            color: isScreenSharing ? '#ffffff' : undefined
          }}
          title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
          aria-label={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
        >
          {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
        </button>

        {/* 4. Switch Camera (Only when multiple physical cameras exist) */}
        {activeCall.isVideo && availableVideoDevices.length > 1 && !isScreenSharing && (
          <button
            onClick={switchCamera}
            className="video-control-btn btn-secondary"
            title="Switch front / rear camera"
            aria-label="Switch front / rear camera"
          >
            <RefreshCw size={18} />
          </button>
        )}

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />

        {/* 5. Leave Call Button (Requirement 19) */}
        <button
          id="btn-call-leave"
          onClick={endCall}
          className="video-control-btn btn-danger"
          style={{ backgroundColor: '#ED4245', color: '#FFFFFF' }}
          title="Disconnect and leave call"
          aria-label="Disconnect and leave call"
        >
          <PhoneOff size={20} />
        </button>
      </footer>
    </div>
  );
};
