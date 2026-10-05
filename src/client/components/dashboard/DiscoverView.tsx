import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Check, X, Clock, Users, Tv, Radio, Sparkles, MessageSquare, Phone, Heart, Zap, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../context/SocketContext.tsx';
import { useWatchRoom } from '../../context/WatchRoomContext.tsx';
import { useWebRTC } from '../../context/WebRTCContext.tsx';
import { User, Connection } from '../../types/index.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { AnimatedBadge } from '../ui/AnimatedBadge.tsx';

interface DiscoverViewProps {
  onSelectUserForChat: (user: User) => void;
  onOpenWatchRoom: (roomCode: string) => void;
  initialTab?: 'friends' | 'suggestions' | 'pending' | 'add' | 'watch';
}

interface SuggestedFriend {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  vibeTag: string;
  tagColor: string;
  mutualSpaces: string;
  isOnline: boolean;
}

const INITIAL_SUGGESTIONS: SuggestedFriend[] = [
  {
    id: 'sug-1',
    displayName: 'Aura Weaver',
    username: 'aura_weaver',
    vibeTag: 'Gaming & Lo-Fi',
    tagColor: '#5865F2',
    mutualSpaces: 'Gaming Haven, The Vibe Lounge',
    isOnline: true
  },
  {
    id: 'sug-2',
    displayName: 'Pixel Samurai',
    username: 'pixelsamurai',
    vibeTag: 'Retro Anime & Tech',
    tagColor: '#23A559',
    mutualSpaces: 'Anime Hangout, The Vibe Lounge',
    isOnline: true
  },
  {
    id: 'sug-3',
    displayName: 'Luna Beats',
    username: 'lunabeats',
    vibeTag: 'Synthwave & Beats',
    tagColor: '#7289DA',
    mutualSpaces: 'Study & Chill',
    isOnline: false
  },
  {
    id: 'sug-4',
    displayName: 'Kairo Fox',
    username: 'kairofox',
    vibeTag: 'Watch Party & Popcorn',
    tagColor: '#F0B232',
    mutualSpaces: 'The Vibe Lounge',
    isOnline: true
  }
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  onSelectUserForChat,
  onOpenWatchRoom,
  initialTab = 'friends'
}) => {
  const { token, user: currentUser } = useAuth();
  const { presenceMap, checkPresence } = useSocket();
  const { createRoom, joinRoom, parseYouTubeVideoId } = useWatchRoom();
  const { startCall } = useWebRTC();

  const [activeTab, setActiveTab] = useState<'friends' | 'suggestions' | 'pending' | 'add' | 'watch'>(initialTab);
  const [suggestions, setSuggestions] = useState<SuggestedFriend[]>(INITIAL_SUGGESTIONS);
  const [sentSuggestionIds, setSentSuggestionIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);

  // Watch Room creation state
  const [watchRoomTitle, setWatchRoomTitle] = useState('');
  const [watchRoomUrl, setWatchRoomUrl] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Load connections & pending requests
  const fetchConnections = async () => {
    if (!token) return;
    setIsLoadingConnections(true);
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
      console.error('Failed to fetch connections:', err);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [token]);

  // Search users
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !token) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
        checkPresence((data.users || []).map((u: User) => u.id));
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Send connection request
  const handleSendRequest = async (targetUserId: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId })
      });
      if (res.ok) {
        alert('Friend request sent!');
        fetchConnections();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send request');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Respond to request
  const handleRespond = async (connectionId: string, action: 'ACCEPT' | 'REJECT') => {
    if (!token) return;
    try {
      const res = await fetch('/api/connections/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ connectionId, action })
      });
      if (res.ok) {
        fetchConnections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Watch Room
  const handleCreateWatchRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError(null);

    const videoId = parseYouTubeVideoId(watchRoomUrl);
    if (!videoId) {
      setRoomError('Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)');
      return;
    }

    setIsCreatingRoom(true);
    try {
      const code = await createRoom(watchRoomTitle.trim() || 'Watch Party Lounge', watchRoomUrl.trim());
      onOpenWatchRoom(code);
    } catch (err: any) {
      setRoomError(err.message || 'Failed to create room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  // Join Room by Code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const success = await joinRoom(joinCodeInput.trim().toUpperCase());
    if (success) {
      onOpenWatchRoom(joinCodeInput.trim().toUpperCase());
    } else {
      alert('Could not find watch room with this code.');
    }
  };

  const incomingRequests = connections.filter((c) => c.status === 'PENDING' && !c.isOutgoing);
  const acceptedFriends = connections.filter((c) => c.status === 'ACCEPTED');

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-primary)',
        overflow: 'hidden'
      }}
    >
      {/* 1. TOP HEADER BAR WITH DISCORD-STYLE TABS */}
      <header
        style={{
          height: '48px',
          padding: '0 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: 'var(--bg-primary)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '15px' }}>
          <Users size={20} color="var(--text-secondary)" />
          <span>Friends</span>
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Tab Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('friends')}
            className={`channel-item nav-pill-btn-friends ${activeTab === 'friends' ? 'channel-item-active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Users size={16} />
            <span>All Friends ({acceptedFriends.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('suggestions')}
            className={`channel-item nav-pill-btn-suggestions ${activeTab === 'suggestions' ? 'channel-item-active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={16} color="var(--accent-secondary)" />
            <span>Suggestions</span>
            <AnimatedBadge count={suggestions.length - sentSuggestionIds.size} />
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`channel-item ${activeTab === 'pending' ? 'channel-item-active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={16} />
            <span>Pending</span>
            <AnimatedBadge count={incomingRequests.length} bgColor="var(--status-dnd)" />
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className="btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              backgroundColor: activeTab === 'add' ? 'var(--status-online)' : 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserPlus size={15} />
            <span>Add Friend</span>
          </button>

          <button
            onClick={() => setActiveTab('watch')}
            className={`channel-item nav-pill-btn-discover ${activeTab === 'watch' ? 'channel-item-active' : ''}`}
            style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Tv size={16} color="var(--accent-vibe)" />
            <span>Watch Together</span>
          </button>
        </div>
      </header>

      {/* 2. TAB CONTENT AREA */}
      <div
        key={activeTab}
        className="channel-content-enter"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 32px',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto'
        }}
      >
        {/* TAB 1: ALL FRIENDS */}
        {activeTab === 'friends' && (
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '16px'
              }}
            >
              All Friends — {acceptedFriends.length}
            </div>

            {acceptedFriends.length === 0 ? (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <Users size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  No friends added yet
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  Click "Add Friend" to search for users by username and connect.
                </p>
                <button onClick={() => setActiveTab('add')} className="btn-primary">
                  Find & Add Friends
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {acceptedFriends.map((conn, idx) => {
                  const friend = conn.user;
                  const isOnline = presenceMap[friend.id] === 'online';

                  return (
                    <div
                      key={friend.id}
                      className="channel-content-enter"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--border-subtle)',
                        transition: 'background-color var(--anim-fast) var(--ease-out)',
                        animationDelay: `${idx * 30}ms`
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Avatar
                          name={friend.displayName}
                          src={friend.avatarUrl}
                          size="md"
                          status={isOnline ? 'online' : 'offline'}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                            {friend.displayName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            @{friend.username} • {isOnline ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          id={`btn-friend-video-${friend.id}`}
                          onClick={() => startCall(friend, true)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          title={`Start Video Call with ${friend.displayName}`}
                        >
                          <Video size={15} color="var(--accent-primary)" />
                          <span>Video Call</span>
                        </button>
                        <button
                          onClick={() => onSelectUserForChat(friend)}
                          className="btn-primary"
                          style={{ padding: '6px 14px', fontSize: '13px' }}
                        >
                          <MessageSquare size={15} />
                          <span>Message</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: SUGGESTIONS */}
        {activeTab === 'suggestions' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: '4px'
                }}
              >
                Suggested Friends — {suggestions.length - sentSuggestionIds.size}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                People who share your communities, gaming lobbies, and music vibes.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
              {suggestions.map((sug, idx) => {
                const isSent = sentSuggestionIds.has(sug.id);

                return (
                  <div
                    key={sug.id}
                    className="channel-content-enter"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      padding: '16px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                      transition: 'background-color var(--anim-fast) var(--ease-out), transform var(--anim-fast) var(--ease-out)',
                      animationDelay: `${idx * 45}ms`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Avatar
                          name={sug.displayName}
                          src={sug.avatarUrl}
                          size="md"
                          status={sug.isOnline ? 'online' : 'offline'}
                        />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                            {sug.displayName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            @{sug.username}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: `${sug.tagColor}1A`,
                          color: sug.tagColor,
                          border: `1px solid ${sug.tagColor}40`
                        }}
                      >
                        {sug.vibeTag}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Mutual Spaces: <span style={{ color: 'var(--text-secondary)' }}>{sug.mutualSpaces}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => {
                          if (isSent) return;
                          setSentSuggestionIds((prev) => new Set([...prev, sug.id]));
                        }}
                        className={isSent ? 'btn-secondary' : 'btn-primary'}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        {isSent ? (
                          <>
                            <Check size={14} color="var(--status-online)" />
                            <span>Request Sent</span>
                          </>
                        ) : (
                          <>
                            <UserPlus size={14} />
                            <span>Add Friend</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => alert(`Sent a vibe wave to @${sug.username}!`)}
                        className="btn-secondary"
                        style={{ padding: '7px 12px', fontSize: '12px' }}
                        title="Send a wave"
                      >
                        👋 Wave
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PENDING REQUESTS */}
        {activeTab === 'pending' && (
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '16px'
              }}
            >
              Pending Requests — {incomingRequests.length}
            </div>

            {incomingRequests.length === 0 ? (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-muted)',
                  fontSize: '13px'
                }}
              >
                There are no pending friend requests.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incomingRequests.map((conn, idx) => (
                  <div
                    key={conn.connectionId}
                    className="channel-content-enter"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-subtle)',
                      animationDelay: `${idx * 40}ms`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar name={conn.user.displayName} src={conn.user.avatarUrl} size="md" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {conn.user.displayName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          @{conn.user.username} sent you a friend request
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleRespond(conn.connectionId, 'ACCEPT')}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '13px', backgroundColor: 'var(--status-online)' }}
                      >
                        <Check size={16} />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRespond(conn.connectionId, 'REJECT')}
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                      >
                        <X size={16} />
                        <span>Ignore</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADD FRIEND SEARCH */}
        {activeTab === 'add' && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Add Friend
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              You can add friends with their Vibe Space username.
            </p>

            <form
              onSubmit={handleSearch}
              style={{
                backgroundColor: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 6px 4px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
                boxShadow: isSearchFocused ? '0 0 0 2px rgba(88, 101, 242, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
                transition: 'box-shadow var(--anim-fast) var(--ease-out)'
              }}
            >
              <input
                type="text"
                placeholder="Search username..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  padding: '8px 0'
                }}
              />
              <button type="submit" disabled={isSearching} className="btn-primary" style={{ padding: '8px 16px' }}>
                <Search size={15} />
                <span>{isSearching ? 'Searching...' : 'Search'}</span>
              </button>
            </form>

            {/* Results */}
            {searchResults.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Search Results
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {searchResults.map((targetUser, idx) => {
                    const isSelf = targetUser.id === currentUser?.id;
                    const isAlreadyFriend = acceptedFriends.some((c) => c.user.id === targetUser.id);

                    return (
                      <div
                        key={targetUser.id}
                        className="channel-content-enter"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid var(--border-subtle)',
                          animationDelay: `${idx * 40}ms`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Avatar name={targetUser.displayName} src={targetUser.avatarUrl} size="md" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                              {targetUser.displayName}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              @{targetUser.username}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isSelf ? (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>It's You</span>
                          ) : isAlreadyFriend ? (
                            <button
                              onClick={() => onSelectUserForChat(targetUser)}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '12.5px' }}
                            >
                              Open Chat
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(targetUser.id)}
                              className="btn-primary"
                              style={{ padding: '6px 14px', fontSize: '12.5px' }}
                            >
                              <UserPlus size={15} />
                              <span>Add Friend</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WATCH TOGETHER QUICK LAUNCH */}
        {activeTab === 'watch' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {/* Launch New Room */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '24px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Tv size={22} color="var(--accent-vibe)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Launch Watch Room
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Start a synchronized YouTube cinema session. Share the 6-character room code with friends!
              </p>

              <form onSubmit={handleCreateWatchRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Room Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chill Music & Clips"
                    value={watchRoomTitle}
                    onChange={(e) => setWatchRoomTitle(e.target.value)}
                    className="app-input"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    YouTube Video URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={watchRoomUrl}
                    onChange={(e) => setWatchRoomUrl(e.target.value)}
                    className="app-input"
                    required
                  />
                </div>

                {roomError && (
                  <div style={{ color: 'var(--status-dnd)', fontSize: '12px' }}>{roomError}</div>
                )}

                <button
                  type="submit"
                  disabled={isCreatingRoom}
                  className="btn-primary"
                  style={{ marginTop: '8px', padding: '10px' }}
                >
                  {isCreatingRoom ? 'Launching Room...' : 'Start Watch Party'}
                </button>
              </form>
            </div>

            {/* Join Existing Room by Code */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                padding: '24px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Users size={22} color="var(--accent-secondary)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Join with Code
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Have a room code from a friend? Enter it below to instantly join their synchronized room.
              </p>

              <form onSubmit={handleJoinByCode} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Room Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VPW3Y8"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="app-input"
                    maxLength={10}
                    style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}
                    required
                  />
                </div>

                <button type="submit" className="btn-secondary" style={{ marginTop: '8px', padding: '10px' }}>
                  Join Room
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
