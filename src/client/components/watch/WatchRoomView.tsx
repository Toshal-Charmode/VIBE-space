import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Copy, Send, Users, Tv, Check, LogOut, Link2 } from 'lucide-react';
import { useWatchRoom } from '../../context/WatchRoomContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Avatar } from '../ui/Avatar.tsx';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const WatchRoomView: React.FC = () => {
  const { user } = useAuth();
  const {
    activeRoom,
    chatMessages,
    leaveRoom,
    syncPlay,
    syncPause,
    syncSeek,
    changeVideo,
    sendWatchChat,
    parseYouTubeVideoId
  } = useWatchRoom();

  const [chatInput, setChatInput] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const playerRef = useRef<any>(null);
  const isSyncingRef = useRef<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (!activeRoom) return;

    let isSubscribed = true;

    function initPlayer() {
      const currentRoom = activeRoom;
      if (!currentRoom) return;

      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }

      const player = new window.YT.Player('yt-player-target', {
        height: '100%',
        width: '100%',
        videoId: currentRoom.videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            if (!isSubscribed) return;
            setPlayerReady(true);
            playerRef.current = event.target;

            const now = Date.now();
            let targetTime = currentRoom.currentTimeSec;
            if (currentRoom.playbackState === 'PLAYING') {
              targetTime += (now - currentRoom.lastSyncedAt) / 1000;
              event.target.seekTo(targetTime, true);
              event.target.playVideo();
            } else {
              event.target.seekTo(targetTime, true);
              event.target.pauseVideo();
            }
          },
          onStateChange: (event: any) => {
            if (isSyncingRef.current) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              const currentSec = event.target.getCurrentTime();
              syncPlay(currentSec);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              const currentSec = event.target.getCurrentTime();
              syncPause(currentSec);
            }
          }
        }
      });
    }

    initPlayer();

    return () => {
      isSubscribed = false;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [activeRoom?.videoId]);

  useEffect(() => {
    if (!activeRoom || !playerRef.current || !playerReady) return;

    isSyncingRef.current = true;
    try {
      const now = Date.now();
      let targetTime = activeRoom.currentTimeSec;
      if (activeRoom.playbackState === 'PLAYING') {
        targetTime += (now - activeRoom.lastSyncedAt) / 1000;
      }

      const currentTime = playerRef.current.getCurrentTime?.() || 0;
      const drift = Math.abs(currentTime - targetTime);

      if (drift > 1.2) {
        playerRef.current.seekTo(targetTime, true);
      }

      if (activeRoom.playbackState === 'PLAYING') {
        playerRef.current.playVideo?.();
      } else {
        playerRef.current.pauseVideo?.();
      }
    } catch (e) {
      console.warn('Sync error:', e);
    } finally {
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 500);
    }
  }, [activeRoom?.playbackState, activeRoom?.currentTimeSec, activeRoom?.lastSyncedAt, playerReady]);

  if (!activeRoom) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendWatchChat(chatInput.trim());
    setChatInput('');
  };

  const handleChangeVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoUrl.trim()) return;
    changeVideo(newVideoUrl.trim());
    setNewVideoUrl('');
  };

  const isPlaying = activeRoom.playbackState === 'PLAYING';

  return (
    <div
      className="channel-content-enter"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-primary)',
        overflow: 'hidden'
      }}
    >
      {/* 1. TOP HEADER BAR */}
      <header
        style={{
          height: '48px',
          padding: '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-primary)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Tv size={20} color="var(--accent-vibe)" />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
              {activeRoom.title}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--status-online)',
                backgroundColor: 'rgba(35, 165, 89, 0.15)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-xs)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--status-online)' }} />
              Synced
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-secondary)',
                padding: '2px 6px',
                borderRadius: 'var(--radius-xs)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isPlaying ? <Play size={10} color="var(--accent-primary)" /> : <Pause size={10} color="var(--status-idle)" />}
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Header Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleCopyCode}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            {copied ? <Check size={14} color="var(--status-online)" /> : <Copy size={14} />}
            <span>{copied ? 'Code Copied' : `Room Code: ${activeRoom.roomCode}`}</span>
          </button>

          <button
            onClick={leaveRoom}
            className="btn-danger"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <LogOut size={14} />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SPLIT CONTENT (Video Stage + Right Chat) */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          height: 'calc(100% - 48px)',
          overflow: 'hidden'
        }}
      >
        {/* Left: Video Player & URL Switcher */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)',
            borderRight: '1px solid var(--border-subtle)'
          }}
        >
          {/* Video Container */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#000000',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div id="yt-player-target" style={{ width: '100%', height: '100%' }} />
          </div>

          {/* Change Video Bar */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            <form onSubmit={handleChangeVideoSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Paste YouTube link to change video (e.g. https://www.youtube.com/watch?v=...)"
                value={newVideoUrl}
                onChange={(e) => setNewVideoUrl(e.target.value)}
                className="app-input"
                style={{ height: '36px', fontSize: '13px' }}
              />
              <button
                type="submit"
                disabled={!newVideoUrl.trim()}
                className="btn-primary"
                style={{ whiteSpace: 'nowrap', height: '36px', padding: '0 16px' }}
              >
                Change Video
              </button>
            </form>
          </div>
        </div>

        {/* Right: Watch Participants & Synced Room Chat */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--bg-secondary)',
            overflow: 'hidden'
          }}
        >
          {/* Participants Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              <Users size={16} color="var(--text-secondary)" />
              <span>Watchers ({activeRoom.members.length})</span>
            </div>
            <div style={{ display: 'flex', gap: '-4px', overflow: 'hidden' }}>
              {activeRoom.members.slice(0, 4).map((m) => (
                <Avatar key={m.userId} name={m.displayName} src={m.avatarUrl} size="sm" />
              ))}
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {chatMessages.length === 0 ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                Watch room chat is live! Say hello to everyone watching.
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.user.userId === user?.id;
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '2px', padding: '0 4px' }}>
                      {msg.user.displayName} • {timeStr}
                    </div>
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        maxWidth: '85%',
                        fontSize: '13.5px',
                        backgroundColor: isMe ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: '#FFFFFF',
                        lineHeight: '1.4'
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatScrollRef} />
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={handleSendChat}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '8px',
              backgroundColor: 'var(--bg-secondary)'
            }}
          >
            <input
              type="text"
              placeholder="Chat in watch room..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="app-input"
              style={{ height: '36px', fontSize: '13px' }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="btn-primary btn-icon-forward"
              style={{ height: '36px', width: '36px', padding: 0, flexShrink: 0 }}
              title="Send"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
