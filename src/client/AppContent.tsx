import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.tsx';
import { useSocket } from './context/SocketContext.tsx';
import { useWebRTC } from './context/WebRTCContext.tsx';
import { useWatchRoom } from './context/WatchRoomContext.tsx';
import { User, Connection, SpaceCommunity, ChannelItem } from './types/index.ts';

// UI Components
import { CinematicIntro } from './components/animation/CinematicIntro.tsx';
import { AmbientBackground } from './components/animation/AmbientBackground.tsx';
import { AuthView } from './components/auth/AuthView.tsx';
import { LeftmostSpaceBar } from './components/layout/LeftmostSpaceBar.tsx';
import { ChannelSidebar } from './components/layout/ChannelSidebar.tsx';
import { ChatStage } from './components/chat/ChatStage.tsx';
import { RightMemberPanel } from './components/dashboard/RightMemberPanel.tsx';
import { DiscoverView } from './components/dashboard/DiscoverView.tsx';
import { WatchRoomView } from './components/watch/WatchRoomView.tsx';
import { SettingsModal } from './components/settings/SettingsModal.tsx';
import { CreateChannelModal } from './components/modals/CreateChannelModal.tsx';
import { IncomingCallDialog } from './components/calls/IncomingCallDialog.tsx';
import { CallHUD } from './components/calls/CallHUD.tsx';
import { MobileBottomNav } from './components/layout/MobileBottomNav.tsx';
import { VibeSpaceLogo } from './components/ui/VibeSpaceLogo.tsx';

// Default initial spaces and channels
const INITIAL_SPACES: SpaceCommunity[] = [
  { id: 'space-lounge', name: 'Vibe Space Lounge', iconText: 'VS', iconBg: '#5865F2' },
  { id: 'space-gaming', name: 'Gaming Hub', iconText: '🎮', iconBg: '#23A559' },
  { id: 'space-chill', name: 'Chill Beats & Clips', iconText: '🎧', iconBg: '#8B5CF6' }
];

const INITIAL_CHANNELS: ChannelItem[] = [
  { id: 'ch-general', name: 'general', type: 'text', spaceId: 'space-lounge', description: 'The main hangout for the Vibe Space community.' },
  { id: 'ch-gaming', name: 'gaming', type: 'text', spaceId: 'space-lounge', description: 'Discussions on games, setups, and streams.' },
  { id: 'ch-clips', name: 'clips', type: 'text', spaceId: 'space-lounge', description: 'Share your top gaming clips and highlights.' },
  { id: 'ch-memes', name: 'memes', type: 'text', spaceId: 'space-lounge', description: 'Fresh memes and laughs.' },
  { id: 'ch-music', name: 'music', type: 'text', spaceId: 'space-lounge', description: 'Song recommendations and playlists.' },
  { id: 'ch-v-general', name: 'General Voice', type: 'voice', spaceId: 'space-lounge' },
  { id: 'ch-v-gaming', name: 'Gaming Lounge', type: 'voice', spaceId: 'space-lounge' },
  { id: 'ch-v-chill', name: 'Chill Vibes', type: 'voice', spaceId: 'space-lounge' },
  { id: 'ch-w-cinema', name: 'YouTube Cinema', type: 'watch', spaceId: 'space-lounge' },
  { id: 'ch-w-party', name: 'Watch Party', type: 'watch', spaceId: 'space-lounge' }
];

export const AppContent: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const { activeRoom, joinRoom, createRoom } = useWatchRoom();
  const {
    activeCall,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    isAudioMuted,
    isVideoMuted,
    ensureAudioStream,
    stopAudioStream
  } = useWebRTC();
  const { presenceMap, checkPresence } = useSocket();

  // Cinematic opening intro state
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    return sessionStorage.getItem('vibe_intro_completed') !== 'true';
  });

  // Navigation State
  const [spaces, setSpaces] = useState<SpaceCommunity[]>(INITIAL_SPACES);
  const [activeSpaceId, setActiveSpaceId] = useState<string>('home');
  const [channels, setChannels] = useState<ChannelItem[]>(INITIAL_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>('ch-general');
  const [selectedChatUser, setSelectedChatUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'discover' | 'watch'>('chat');
  const [discoverTab, setDiscoverTab] = useState<'friends' | 'suggestions' | 'pending' | 'add' | 'watch'>('friends');

  // Friends & connections state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null);

  // Modals & Panels State
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState<boolean>(false);

  // Fetch connections
  const fetchConnections = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/connections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
        const userIds = (data.connections || []).map((c: Connection) => c.user.id);
        checkPresence(userIds);
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConnections();
    }
  }, [token]);

  // Keep presence updated periodically
  useEffect(() => {
    if (!token || connections.length === 0) return;
    const interval = setInterval(() => {
      const userIds = connections.map((c) => c.user.id);
      checkPresence(userIds);
    }, 15000);
    return () => clearInterval(interval);
  }, [token, connections]);

  // Active space object (declared before returns for consistent hook execution)
  const activeSpace: SpaceCommunity =
    activeSpaceId === 'home'
      ? { id: 'home', name: 'Direct Messages', iconText: 'DM', iconBg: 'var(--bg-primary)', isDirectMessages: true }
      : spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // Active channel object
  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  // Context-aware atmospheric floating objects (Requirement 20 - Hook must be called unconditionally)
  const backgroundContext: 'general' | 'gaming' | 'music' | 'watch' | 'social' = React.useMemo(() => {
    if (currentView === 'watch') return 'watch';
    if (activeChannel) {
      const name = (activeChannel.name || '').toLowerCase();
      if (name.includes('game') || name.includes('gaming')) return 'gaming';
      if (name.includes('music') || name.includes('chill') || name.includes('audio')) return 'music';
      if (name.includes('food') || name.includes('social') || name.includes('lounge')) return 'social';
    }
    if (activeSpace) {
      const spaceName = (activeSpace.name || '').toLowerCase();
      if (spaceName.includes('game') || spaceName.includes('gaming')) return 'gaming';
      if (spaceName.includes('music')) return 'music';
      if (spaceName.includes('social')) return 'social';
    }
    return 'general';
  }, [currentView, activeChannel, activeSpace]);

  // If opening cinematic is active, display it (DO NOT REMOVE)
  if (showIntro) {
    return (
      <CinematicIntro
        onComplete={() => {
          sessionStorage.setItem('vibe_intro_completed', 'true');
          setShowIntro(false);
        }}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1E1F22',
          color: '#F2F3F5',
          gap: '16px'
        }}
      >
        <VibeSpaceLogo size={56} glow={false} />
        <div style={{ fontSize: '14px', color: '#949BA4', fontWeight: 600 }}>
          Connecting to Vibe Space...
        </div>
      </div>
    );
  }

  // Auth View if unauthenticated
  if (!user) {
    return <AuthView />;
  }

  const handleSelectSpace = (spaceId: string) => {
    setActiveSpaceId(spaceId);
    if (spaceId === 'home') {
      setCurrentView('chat');
    } else {
      setSelectedChatUser(null);
      setCurrentView('chat');
      // Set to first text channel of the space
      const spaceChannel = channels.find((c) => c.spaceId === spaceId && c.type === 'text');
      if (spaceChannel) {
        setActiveChannelId(spaceChannel.id);
      }
    }
  };

  const handleSelectChannel = (channel: ChannelItem) => {
    setActiveChannelId(channel.id);
    setSelectedChatUser(null);

    if (channel.type === 'watch') {
      setCurrentView('watch');
      // Auto join or create room for this channel if not already in room
      if (!activeRoom) {
        createRoom(channel.name, 'https://www.youtube.com/watch?v=jfKfPfyJRdk').catch(() => {});
      }
    } else {
      setCurrentView('chat');
    }
  };

  const handleSelectUserForChat = (targetUser: User) => {
    setSelectedChatUser(targetUser);
    setActiveSpaceId('home');
    setCurrentView('chat');
  };

  const handleOpenWatchRoom = (code: string) => {
    setCurrentView('watch');
  };

  const handleOpenDiscover = (tab: 'friends' | 'suggestions' | 'pending' | 'add' | 'watch' = 'friends') => {
    setSelectedChatUser(null);
    setDiscoverTab(tab);
    setCurrentView('discover');
  };

  const handleCreateChannel = (newChannel: ChannelItem) => {
    setChannels((prev) => [...prev, newChannel]);
    handleSelectChannel(newChannel);
  };

  const pendingRequestsCount = connections.filter((c) => c.status === 'PENDING' && !c.isOutgoing).length;

  return (
    <div className="app-container">
      {/* Signature Vibe Space Ambient Floating Object & Particle System */}
      <AmbientBackground density="normal" interactive={true} contextType={backgroundContext} />

      {/* Incoming Call Ringing Dialog */}
      <IncomingCallDialog />

      {/* WebRTC Active Call HUD */}
      <CallHUD />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onReplayIntro={() => setShowIntro(true)}
      />

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        spaceId={activeSpaceId}
        onCreateChannel={handleCreateChannel}
      />

      {/* =========================================================================
          TIER 1: LEFTMOST SPACE / COMMUNITY NAVIGATION BAR (72px)
          ========================================================================= */}
      <LeftmostSpaceBar
        spaces={spaces}
        activeSpaceId={activeSpaceId}
        onSelectSpace={handleSelectSpace}
        onOpenDiscover={() => handleOpenDiscover('friends')}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* =========================================================================
          TIER 2: SECOND SIDEBAR - CHANNELS / DMs / VOICE ROOMS / USER BAR (240px)
          ========================================================================= */}
      <ChannelSidebar
        activeSpace={activeSpace}
        channels={channels.filter((c) => c.spaceId === activeSpaceId)}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        connections={connections}
        selectedChatUser={selectedChatUser}
        onSelectUser={handleSelectUserForChat}
        activeCall={activeCall}
        onEndCall={endCall}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        onCreateChannelClick={() => setIsCreateChannelOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDiscover={handleOpenDiscover}
        activeDiscoverTab={discoverTab}
        suggestionsCount={4}
        currentUser={user}
        presenceMap={presenceMap}
        activeVoiceChannelId={activeVoiceChannelId}
        onJoinVoiceChannel={async (channelId) => {
          setActiveVoiceChannelId(channelId);
          await ensureAudioStream();
        }}
        onLeaveVoiceChannel={() => {
          setActiveVoiceChannelId(null);
          stopAudioStream();
        }}
      />

      {/* =========================================================================
          TIER 3: MAIN CENTER STAGE (CHAT / WATCH / DISCOVER)
          ========================================================================= */}
      <main
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary)',
          position: 'relative'
        }}
      >
        {/* Watch Room Stage */}
        {currentView === 'watch' && activeRoom && <WatchRoomView />}

        {/* Discover / Friends Stage */}
        {currentView === 'discover' && (
          <DiscoverView
            initialTab={discoverTab}
            onSelectUserForChat={handleSelectUserForChat}
            onOpenWatchRoom={handleOpenWatchRoom}
          />
        )}

        {/* Chat Stage (DM or Channel) */}
        {currentView === 'chat' && (
          <ChatStage
            recipientUser={selectedChatUser}
            channel={selectedChatUser || activeSpaceId === 'home' ? null : activeChannel}
            onToggleRightPanel={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
            isRightPanelOpen={!isRightPanelCollapsed}
            onOpenDiscover={handleOpenDiscover}
          />
        )}
      </main>

      {/* =========================================================================
          TIER 4: RIGHT PANEL (ONLINE MEMBERS / PARTICIPANTS / ACTIVITY)
          ========================================================================= */}
      <RightMemberPanel
        selectedChatUser={selectedChatUser}
        connections={connections}
        presenceMap={presenceMap}
        activeCall={activeCall}
        onStartCall={(targetUser, isVideo) => startCall(targetUser, isVideo)}
        onSelectUserForChat={handleSelectUserForChat}
        isCollapsed={isRightPanelCollapsed}
        onToggleCollapse={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
        activeRoomMembers={activeRoom?.members}
      />

      {/* Mobile Bottom Navigation Dock (Visible only on small viewports) */}
      <MobileBottomNav
        currentTab={currentView}
        onSelectTab={(tab) => {
          setCurrentView(tab);
          if (tab !== 'chat') setSelectedChatUser(null);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        pendingRequestsCount={pendingRequestsCount}
      />
    </div>
  );
};
