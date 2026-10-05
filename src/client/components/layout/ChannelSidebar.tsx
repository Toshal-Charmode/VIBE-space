import React, { useState } from 'react';
import {
  Hash,
  Volume2,
  VolumeX,
  Tv,
  Plus,
  Compass,
  MessageSquare,
  Users,
  Search,
  Mic,
  MicOff,
  Headphones,
  Settings,
  PhoneOff,
  Radio,
  ChevronDown,
  Sparkles,
  UserPlus,
  Smile,
  Shield,
  LogOut,
  FolderPlus,
  Check,
  Video,
  VideoOff
} from 'lucide-react';
import { User, Connection, SpaceCommunity, ChannelItem, ActiveCall } from '../../types/index.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { AnimatedBadge } from '../ui/AnimatedBadge.tsx';

interface ChannelSidebarProps {
  activeSpace: SpaceCommunity;
  channels: ChannelItem[];
  activeChannelId: string;
  onSelectChannel: (channel: ChannelItem) => void;
  connections: Connection[];
  selectedChatUser: User | null;
  onSelectUser: (user: User) => void;
  activeCall: ActiveCall | null;
  onEndCall: () => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  onCreateChannelClick: () => void;
  onOpenSettings: () => void;
  onOpenDiscover: (tab?: 'friends' | 'suggestions' | 'pending' | 'add' | 'watch') => void;
  currentUser: User;
  presenceMap: Record<string, string>;
  activeVoiceChannelId?: string | null;
  onJoinVoiceChannel?: (channelId: string) => void;
  onLeaveVoiceChannel?: () => void;
  activeDiscoverTab?: 'friends' | 'suggestions' | 'pending' | 'add' | 'watch';
  suggestionsCount?: number;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  activeSpace,
  channels,
  activeChannelId,
  onSelectChannel,
  connections,
  selectedChatUser,
  onSelectUser,
  activeCall,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  isAudioMuted,
  isVideoMuted,
  onCreateChannelClick,
  onOpenSettings,
  onOpenDiscover,
  currentUser,
  presenceMap,
  activeVoiceChannelId,
  onJoinVoiceChannel,
  onLeaveVoiceChannel,
  activeDiscoverTab = 'friends',
  suggestionsCount = 4
}) => {
  const [searchDm, setSearchDm] = useState('');
  const [isDeafened, setIsDeafened] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isHome = activeSpace.id === 'home';

  // Filter text, voice, watch channels
  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');
  const watchChannels = channels.filter((c) => c.type === 'watch');

  // Filter connections for DMs
  const acceptedConnections = connections.filter((c) => c.status === 'ACCEPTED');
  const filteredConnections = acceptedConnections.filter((c) => {
    if (!searchDm.trim()) return true;
    const q = searchDm.toLowerCase();
    return (
      c.user.displayName.toLowerCase().includes(q) ||
      c.user.username.toLowerCase().includes(q)
    );
  });

  const isVoiceConnected = Boolean(
    activeVoiceChannelId || (activeCall && activeCall.status === 'connected')
  );

  return (
    <aside
      className="panel-secondary"
      style={{
        width: '240px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative',
        userSelect: 'none',
        zIndex: 10
      }}
      aria-label="Channel and conversation navigation"
    >
      {/* 1. TOP HEADER / COMMUNITY NAME */}
      <div
        style={{
          height: '48px',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '15px',
          color: 'var(--text-primary)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
          transition: 'background-color var(--anim-fast) var(--ease-out)'
        }}
        onClick={isHome ? () => onOpenDiscover() : undefined}
        title={isHome ? 'Open Discover & Friends' : activeSpace.name}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {isHome ? (
            <>
              <Compass size={18} color="var(--accent-secondary)" />
              <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                Vibe Space
              </span>
            </>
          ) : (
            <>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-vibe)',
                  flexShrink: 0
                }}
              />
              <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {activeSpace.name}
              </span>
            </>
          )}
        </div>
        <ChevronDown size={16} color="var(--text-muted)" />
      </div>

      {/* 2. CHANNELS OR DIRECT MESSAGES LIST */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 8px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {isHome ? (
          /* ==================== HOME / DIRECT MESSAGES VIEW ==================== */
          <>
            {/* Refined Navigation Controls (Friends, Suggestions, Discover) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Friends Button */}
              <button
                type="button"
                className={`nav-pill-btn nav-pill-btn-friends ${selectedChatUser === null && activeDiscoverTab === 'friends' ? 'active' : ''}`}
                onClick={() => onOpenDiscover('friends')}
                title="Friends List"
              >
                <Users size={18} />
                <span style={{ flex: 1, textAlign: 'left' }}>Friends</span>
                {acceptedConnections.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {acceptedConnections.length}
                  </span>
                )}
              </button>

              {/* Suggestions Button */}
              <button
                type="button"
                className={`nav-pill-btn nav-pill-btn-suggestions ${selectedChatUser === null && activeDiscoverTab === 'suggestions' ? 'active' : ''}`}
                onClick={() => onOpenDiscover('suggestions')}
                title="Friend & Community Suggestions"
              >
                <Sparkles size={18} color="var(--accent-secondary)" />
                <span style={{ flex: 1, textAlign: 'left' }}>Suggestions</span>
                <AnimatedBadge count={suggestionsCount} />
              </button>

              {/* Discover Spaces Button */}
              <button
                type="button"
                className={`nav-pill-btn nav-pill-btn-discover ${selectedChatUser === null && activeDiscoverTab === 'watch' ? 'active' : ''}`}
                onClick={() => onOpenDiscover('watch')}
                title="Explore Spaces & Watch Together"
              >
                <Compass size={18} color="var(--accent-vibe)" />
                <span style={{ flex: 1, textAlign: 'left' }}>Discover Spaces</span>
              </button>
            </div>

            {/* DMs Header with Search */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 8px 6px 8px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={13} />
                  <span>Direct Messages</span>
                </div>
                <button
                  onClick={() => onOpenDiscover('add')}
                  className="btn-icon btn-icon-scale"
                  style={{ padding: '2px' }}
                  title="Find or Add Friends"
                >
                  <UserPlus size={15} />
                </button>
              </div>

              {/* DMs Quick Filter */}
              {acceptedConnections.length > 5 && (
                <div style={{ padding: '0 4px 6px 4px' }}>
                  <input
                    type="text"
                    placeholder="Find a friend..."
                    value={searchDm}
                    onChange={(e) => setSearchDm(e.target.value)}
                    className="app-input"
                    style={{
                      height: '28px',
                      fontSize: '12px',
                      padding: '4px 8px',
                      backgroundColor: 'var(--bg-tertiary)'
                    }}
                  />
                </div>
              )}

              {/* DMs List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                {filteredConnections.length === 0 ? (
                  <div
                    style={{
                      padding: '16px 8px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      lineHeight: '1.4'
                    }}
                  >
                    No direct messages yet.
                    <br />
                    <button
                      onClick={() => onOpenDiscover()}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-secondary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        marginTop: '4px',
                        fontWeight: 600
                      }}
                    >
                      + Find Friends in Discover
                    </button>
                  </div>
                ) : (
                  filteredConnections.map((conn) => {
                    const peer = conn.user;
                    const isOnline = presenceMap[peer.id] === 'online';
                    const isSelected = selectedChatUser?.id === peer.id;

                    return (
                      <div
                        key={peer.id}
                        className={`channel-item ${isSelected ? 'channel-item-active' : ''}`}
                        onClick={() => onSelectUser(peer)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-xs)'
                        }}
                      >
                        <Avatar
                          name={peer.displayName}
                          src={peer.avatarUrl}
                          size="sm"
                          status={isOnline ? 'online' : 'offline'}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13.5px',
                              fontWeight: isSelected ? 600 : 500,
                              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {peer.displayName}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            @{peer.username}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        ) : (
          /* ==================== SERVER / COMMUNITY VIEW ==================== */
          <>
            {/* 1. TEXT CHANNELS SECTION */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px 6px 8px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)'
                }}
              >
                <span>Text Channels</span>
                <button
                  onClick={onCreateChannelClick}
                  className="btn-icon btn-icon-rotate"
                  style={{ padding: '2px' }}
                  title="Create Text Channel"
                >
                  <Plus size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {textChannels.map((channel) => {
                  const isActive = activeChannelId === channel.id && !selectedChatUser;
                  return (
                    <div
                      key={channel.id}
                      className={`channel-item ${isActive ? 'channel-item-active' : ''}`}
                      onClick={() => onSelectChannel(channel)}
                    >
                      <Hash size={18} color={isActive ? 'var(--text-primary)' : 'var(--text-muted)'} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {channel.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. VOICE CHANNELS SECTION */}
            {voiceChannels.length > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px 6px 8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span>Voice Channels</span>
                  <button
                    onClick={onCreateChannelClick}
                    className="btn-icon btn-icon-rotate"
                    style={{ padding: '2px' }}
                    title="Create Voice Channel"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {voiceChannels.map((channel) => {
                    const isVoiceActive = activeVoiceChannelId === channel.id;
                    const isChannelSelected = activeChannelId === channel.id;

                    return (
                      <div key={channel.id}>
                        <div
                          className={`channel-item ${isChannelSelected || isVoiceActive ? 'channel-item-active' : ''}`}
                          onClick={() => {
                            onSelectChannel(channel);
                            if (onJoinVoiceChannel && activeVoiceChannelId !== channel.id) {
                              onJoinVoiceChannel(channel.id);
                            }
                          }}
                        >
                          <Volume2
                            size={18}
                            color={isVoiceActive ? 'var(--status-online)' : 'var(--text-muted)'}
                          />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {channel.name}
                          </span>
                          {isVoiceActive && (
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--status-online)',
                                boxShadow: '0 0 6px var(--status-online)'
                              }}
                            />
                          )}
                        </div>

                        {/* Connected participants list under voice channel */}
                        {isVoiceActive && (
                          <div style={{ paddingLeft: '28px', paddingBottom: '6px', paddingTop: '2px' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '3px 6px',
                                fontSize: '12px',
                                color: 'var(--text-secondary)'
                              }}
                            >
                              <div
                                className={!isAudioMuted ? "speaking-pulse" : ""}
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  border: `1.5px solid ${!isAudioMuted ? 'var(--status-online)' : 'var(--text-muted)'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: 'var(--bg-tertiary)',
                                  opacity: isAudioMuted ? 0.75 : 1
                                }}
                              >
                                <Avatar name={currentUser.displayName} size="sm" />
                              </div>
                              <span style={{ fontWeight: 600, color: isAudioMuted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                                {currentUser.displayName}
                              </span>
                              {isAudioMuted && (
                                <MicOff size={13} style={{ color: 'var(--status-dnd)', marginLeft: 'auto' }} />
                              )}
                            </div>

                            {/* Voice Channel Controls: [🎤] [📹] [🔊] [Leave] */}
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '4px',
                                padding: '2px 4px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                border: '1px solid var(--border-subtle)',
                                width: 'fit-content'
                              }}
                            >
                              <button
                                id="btn-voice-channel-mic"
                                onClick={onToggleAudio}
                                className="btn-icon btn-icon-scale"
                                style={{ color: isAudioMuted ? 'var(--status-dnd)' : 'var(--text-primary)', padding: '4px' }}
                                title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                                aria-label={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                              >
                                {isAudioMuted ? <MicOff size={14} /> : <Mic size={14} />}
                              </button>

                              <button
                                id="btn-voice-channel-camera"
                                onClick={onToggleVideo}
                                className="btn-icon btn-icon-scale"
                                style={{ color: isVideoMuted ? 'var(--status-dnd)' : 'var(--accent-primary)', padding: '4px' }}
                                title={isVideoMuted ? 'Enable Camera' : 'Turn Off Camera'}
                                aria-label={isVideoMuted ? 'Enable Camera' : 'Turn Off Camera'}
                              >
                                {isVideoMuted ? <VideoOff size={14} /> : <Video size={14} />}
                              </button>

                              <button
                                id="btn-voice-channel-deafen"
                                onClick={() => setIsDeafened(!isDeafened)}
                                className="btn-icon btn-icon-scale"
                                style={{ color: isDeafened ? 'var(--status-dnd)' : 'var(--text-muted)', padding: '4px' }}
                                title={isDeafened ? 'Undeafen' : 'Deafen'}
                                aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
                              >
                                {isDeafened ? <VolumeX size={14} /> : <Volume2 size={14} />}
                              </button>

                              <button
                                id="btn-voice-channel-leave"
                                onClick={activeCall ? onEndCall : onLeaveVoiceChannel}
                                className="btn-icon btn-icon-scale"
                                style={{ color: 'var(--status-dnd)', padding: '4px' }}
                                title="Disconnect & Leave Voice"
                                aria-label="Disconnect & Leave Voice"
                              >
                                <PhoneOff size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. WATCH TOGETHER CHANNELS SECTION */}
            {watchChannels.length > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px 6px 8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)'
                  }}
                >
                  <span>Watch Together</span>
                  <button
                    onClick={onCreateChannelClick}
                    className="btn-icon btn-icon-rotate"
                    style={{ padding: '2px' }}
                    title="Create Watch Room"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {watchChannels.map((channel) => {
                    const isActive = activeChannelId === channel.id;
                    return (
                      <div
                        key={channel.id}
                        className={`channel-item ${isActive ? 'channel-item-active' : ''}`}
                        onClick={() => onSelectChannel(channel)}
                      >
                        <Tv size={18} color={isActive ? 'var(--accent-vibe)' : 'var(--text-muted)'} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {channel.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 3. PERSISTENT VOICE STATUS BAR (When connected to voice or call) */}
      {isVoiceConnected && (
        <div
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            padding: '8px 12px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-online)',
                boxShadow: '0 0 8px var(--status-online)'
              }}
            />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--status-online)' }}>
                {activeCall?.isVideo ? 'VIDEO CONNECTED' : 'VOICE CONNECTED'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {activeCall ? `Call: ${activeCall.peerUser.displayName}` : 'General Voice'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <button
              id="btn-voice-status-mic"
              onClick={onToggleAudio}
              className="btn-icon btn-icon-scale"
              style={{ color: isAudioMuted ? 'var(--status-dnd)' : 'var(--text-primary)', padding: '5px' }}
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              aria-label={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isAudioMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            <button
              id="btn-voice-status-camera"
              onClick={onToggleVideo}
              className="btn-icon btn-icon-scale"
              style={{ color: isVideoMuted ? 'var(--status-dnd)' : 'var(--accent-primary)', padding: '5px' }}
              title={isVideoMuted ? 'Enable Camera' : 'Turn Off Camera'}
              aria-label={isVideoMuted ? 'Enable Camera' : 'Turn Off Camera'}
            >
              {isVideoMuted ? <VideoOff size={15} /> : <Video size={15} />}
            </button>

            <button
              id="btn-voice-status-deafen"
              onClick={() => setIsDeafened(!isDeafened)}
              className="btn-icon btn-icon-scale"
              style={{ color: isDeafened ? 'var(--status-dnd)' : 'var(--text-muted)', padding: '5px' }}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
              aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              {isDeafened ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <button
              id="btn-voice-status-leave"
              onClick={activeCall ? onEndCall : onLeaveVoiceChannel}
              className="btn-icon btn-icon-scale"
              style={{ color: 'var(--status-dnd)', padding: '5px' }}
              title="Disconnect Voice"
              aria-label="Disconnect Voice"
            >
              <PhoneOff size={15} />
            </button>
          </div>
        </div>
      )}

      {/* 4. USER PROFILE POPUP MENU */}
      {showUserMenu && (
        <div
          className="glass-popover"
          style={{
            position: 'absolute',
            bottom: '58px',
            left: '8px',
            right: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-online)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Online in Vibe Space</span>
          </div>
          <button
            onClick={() => {
              setShowUserMenu(false);
              onOpenSettings();
            }}
            className="channel-item"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
          >
            <Settings size={15} />
            <span>Settings & Preferences</span>
          </button>
          <button
            onClick={() => {
              setShowUserMenu(false);
              onOpenDiscover();
            }}
            className="channel-item"
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
          >
            <Users size={15} />
            <span>Discover Friends</span>
          </button>
        </div>
      )}

      {/* 5. BOTTOM USER PROFILE & QUICK AUDIO CONTROLS BAR */}
      <div
        style={{
          height: '52px',
          backgroundColor: 'var(--bg-tertiary)',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--border-subtle)',
          zIndex: 20
        }}
      >
        {/* User Info Tile (Clickable) */}
        <div
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 6px',
            borderRadius: 'var(--radius-xs)',
            cursor: 'pointer',
            flex: 1,
            minWidth: 0,
            transition: 'background-color var(--anim-fast) var(--ease-out)'
          }}
          className="channel-item"
          title="Click for Profile options"
        >
          <Avatar
            name={currentUser.displayName}
            src={currentUser.avatarUrl}
            size="sm"
            status="online"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.2'
              }}
            >
              {currentUser.displayName}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.2'
              }}
            >
              Online
            </div>
          </div>
        </div>

        {/* Media Controls: Mic, Headphones, Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            id="btn-sidebar-toggle-mic"
            onClick={onToggleAudio}
            className="btn-icon btn-icon-scale"
            style={{
              color: isAudioMuted ? 'var(--status-dnd)' : 'var(--text-muted)',
              padding: '6px'
            }}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            aria-label={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {activeCall && (
            <button
              id="btn-sidebar-toggle-camera"
              onClick={onToggleVideo}
              className="btn-icon btn-icon-scale"
              style={{
                color: isVideoMuted ? 'var(--status-dnd)' : 'var(--accent-primary)',
                padding: '6px'
              }}
              title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
              aria-label={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
            </button>
          )}

          <button
            onClick={() => setIsDeafened(!isDeafened)}
            className="btn-icon btn-icon-scale"
            style={{
              color: isDeafened ? 'var(--status-dnd)' : 'var(--text-muted)',
              padding: '6px'
            }}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            <Headphones size={18} />
          </button>

          <button
            onClick={onOpenSettings}
            className="btn-icon btn-icon-rotate"
            style={{ padding: '6px' }}
            title="User Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
