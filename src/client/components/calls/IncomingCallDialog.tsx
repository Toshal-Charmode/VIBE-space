import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useWebRTC } from '../../context/WebRTCContext.tsx';
import { Avatar } from '../ui/Avatar.tsx';

export const IncomingCallDialog: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useWebRTC();

  if (!incomingCall) return null;

  return (
    <div
      id="incoming-call-dialog"
      className="participant-tile-enter"
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        width: '320px',
        maxWidth: 'calc(100vw - 32px)',
        padding: '18px 20px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}
    >
      {/* 1. Header Label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          fontWeight: 700,
          color: incomingCall.isVideo ? 'var(--accent-primary)' : 'var(--status-online)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '14px'
        }}
      >
        {incomingCall.isVideo ? <Video size={16} /> : <Phone size={16} />}
        <span>Incoming {incomingCall.isVideo ? 'video call' : 'voice call'}</span>
      </div>

      {/* 2. Friend Name & Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div style={{ position: 'relative' }}>
          <div
            className="speaking-pulse"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Avatar
              name={incomingCall.fromUser.displayName}
              src={incomingCall.fromUser.avatarUrl}
              size="md"
            />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {incomingCall.fromUser.displayName}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            @{incomingCall.fromUser.username}
          </div>
        </div>
      </div>

      {/* 3. Action Buttons: [Decline]   [Accept 📹] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          id="btn-decline-incoming-call"
          onClick={rejectCall}
          className="btn-danger"
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '13px',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          title="Decline Call"
        >
          <PhoneOff size={15} />
          <span>Decline</span>
        </button>

        <button
          id="btn-accept-incoming-call"
          onClick={acceptCall}
          className="btn-primary"
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '13px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--status-online)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          title={incomingCall.isVideo ? 'Accept Video Call' : 'Accept Voice Call'}
        >
          {incomingCall.isVideo ? <Video size={15} /> : <Phone size={15} />}
          <span>Accept {incomingCall.isVideo ? '📹' : ''}</span>
        </button>
      </div>
    </div>
  );
};
