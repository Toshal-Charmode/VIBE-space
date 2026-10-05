import React, { useState } from 'react';
import { Hash, Volume2, Tv, Lock, X } from 'lucide-react';
import { ChannelItem } from '../../types/index.ts';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onCreateChannel: (channel: ChannelItem) => void;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  spaceId,
  onCreateChannel
}) => {
  const [channelType, setChannelType] = useState<'text' | 'voice' | 'watch'>('text');
  const [channelName, setChannelName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;

    // Sanitize name: lowercase, dashes for text, clean for voice
    let formattedName = channelName.trim();
    if (channelType === 'text') {
      formattedName = formattedName.toLowerCase().replace(/\s+/g, '-');
    }

    const newChannel: ChannelItem = {
      id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: formattedName,
      type: channelType,
      spaceId: spaceId,
      description: isPrivate ? 'Private Space Channel' : `Community ${channelType} channel`
    };

    onCreateChannel(newChannel);
    setChannelName('');
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="glass-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          maxWidth: '92vw',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px 12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Create Channel
          </h2>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ padding: '4px', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '0 24px 20px 24px' }}>
          {/* Channel Type Selector */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}
            >
              Channel Type
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Text Option */}
              <div
                onClick={() => setChannelType('text')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: channelType === 'text' ? 'var(--bg-modifier-selected)' : 'var(--bg-tertiary)',
                  border: channelType === 'text' ? '1.5px solid var(--accent-primary)' : '1.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all var(--trans-fast)'
                }}
              >
                <Hash size={24} color={channelType === 'text' ? 'var(--text-primary)' : 'var(--text-muted)'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                    Text
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Post messages, images, GIFs, and vibe with friends.
                  </div>
                </div>
              </div>

              {/* Voice Option */}
              <div
                onClick={() => setChannelType('voice')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: channelType === 'voice' ? 'var(--bg-modifier-selected)' : 'var(--bg-tertiary)',
                  border: channelType === 'voice' ? '1.5px solid var(--accent-primary)' : '1.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all var(--trans-fast)'
                }}
              >
                <Volume2 size={24} color={channelType === 'voice' ? 'var(--status-online)' : 'var(--text-muted)'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                    Voice
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Hang out together with high-fidelity voice, video, and screen share.
                  </div>
                </div>
              </div>

              {/* Watch Together Option */}
              <div
                onClick={() => setChannelType('watch')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: channelType === 'watch' ? 'var(--bg-modifier-selected)' : 'var(--bg-tertiary)',
                  border: channelType === 'watch' ? '1.5px solid var(--accent-vibe)' : '1.5px solid transparent',
                  cursor: 'pointer',
                  transition: 'all var(--trans-fast)'
                }}
              >
                <Tv size={24} color={channelType === 'watch' ? 'var(--accent-vibe)' : 'var(--text-muted)'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                    Watch Together
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Synchronized YouTube videos, movie nights, and co-watching.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Name Input */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '8px'
              }}
            >
              Channel Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={
                  channelType === 'text'
                    ? 'new-channel'
                    : channelType === 'voice'
                    ? 'General Voice'
                    : 'Watch Party'
                }
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="app-input"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Private Channel Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} color="var(--text-muted)" />
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Private Channel
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Only selected members and roles will be able to view this channel.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
          </div>

          {/* Modal Actions */}
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              margin: '0 -24px -20px -24px',
              padding: '14px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!channelName.trim()}
              className="btn-primary"
              style={{ opacity: channelName.trim() ? 1 : 0.5 }}
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
