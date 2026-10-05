import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useSocket } from './SocketContext.tsx';
import { useAuth } from './AuthContext.tsx';
import { WatchRoomState, WatchChatMessage } from '../types/index.ts';

interface WatchRoomContextType {
  activeRoom: WatchRoomState | null;
  chatMessages: WatchChatMessage[];
  createRoom: (title: string, youtubeUrl: string) => Promise<string>;
  joinRoom: (roomCode: string) => Promise<boolean>;
  leaveRoom: () => void;
  syncPlay: (currentTimeSec: number) => void;
  syncPause: (currentTimeSec: number) => void;
  syncSeek: (currentTimeSec: number) => void;
  changeVideo: (youtubeUrl: string) => void;
  sendWatchChat: (text: string) => void;
  parseYouTubeVideoId: (url: string) => string | null;
}

const WatchRoomContext = createContext<WatchRoomContextType | undefined>(undefined);

export function parseYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex covering standard watch, youtu.be, embed, and shorts
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }

  // Shorts format: youtube.com/shorts/{id}
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  return null;
}

export const WatchRoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [activeRoom, setActiveRoom] = useState<WatchRoomState | null>(null);
  const [chatMessages, setChatMessages] = useState<WatchChatMessage[]>([]);
  const roomCodeRef = useRef<string | null>(null);

  useEffect(() => {
    roomCodeRef.current = activeRoom ? activeRoom.roomCode : null;
  }, [activeRoom]);

  useEffect(() => {
    if (!socket) return;

    socket.on('watch:state_updated', (data: {
      action: 'PLAY' | 'PAUSE' | 'SEEK' | 'CHANGE_VIDEO';
      videoId: string;
      playbackState: 'PLAYING' | 'PAUSED';
      currentTimeSec: number;
      lastSyncedAt: number;
      triggeredBy: string;
    }) => {
      setActiveRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          videoId: data.videoId,
          playbackState: data.playbackState,
          currentTimeSec: data.currentTimeSec,
          lastSyncedAt: data.lastSyncedAt
        };
      });
    });

    socket.on('watch:user_joined', (data: { user: any; members: any[] }) => {
      setActiveRoom((prev) => prev ? { ...prev, members: data.members } : null);
    });

    socket.on('watch:user_left', (data: { userId: string; members: any[] }) => {
      setActiveRoom((prev) => prev ? { ...prev, members: data.members } : null);
    });

    socket.on('watch:chat_message', (msg: WatchChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('watch:state_updated');
      socket.off('watch:user_joined');
      socket.off('watch:user_left');
      socket.off('watch:chat_message');
    };
  }, [socket]);

  const createRoom = async (title: string, youtubeUrl: string): Promise<string> => {
    const videoId = parseYouTubeVideoId(youtubeUrl) || 'dQw4w9WgXcQ';
    const token = localStorage.getItem('vibe_space_token') || localStorage.getItem('aetheria_token');

    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ title, videoId })
    });

    if (!res.ok) throw new Error('Failed to create room');
    const data = await res.json();
    await joinRoom(data.room.roomCode);
    return data.room.roomCode;
  };

  const joinRoom = async (roomCode: string): Promise<boolean> => {
    if (!socket || !user) return false;
    const cleanCode = roomCode.trim().toUpperCase();

    return new Promise((resolve) => {
      socket.emit('watch:join_room', { roomCode: cleanCode, user }, (response: any) => {
        if (response) {
          setActiveRoom({
            roomCode: cleanCode,
            title: response.title || 'Cyber Lounge',
            hostId: response.hostId || user.id,
            videoId: response.videoId,
            playbackState: response.playbackState,
            currentTimeSec: response.currentTimeSec,
            lastSyncedAt: response.lastSyncedAt,
            members: response.members || []
          });
          setChatMessages([]);
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  };

  const leaveRoom = () => {
    if (activeRoom && socket) {
      socket.emit('watch:leave_room', { roomCode: activeRoom.roomCode });
    }
    setActiveRoom(null);
    setChatMessages([]);
  };

  const syncPlay = (currentTimeSec: number) => {
    if (!activeRoom || !socket) return;
    setActiveRoom((prev) => prev ? { ...prev, playbackState: 'PLAYING', currentTimeSec, lastSyncedAt: Date.now() } : null);
    socket.emit('watch:sync_action', {
      roomCode: activeRoom.roomCode,
      action: 'PLAY',
      currentTimeSec
    });
  };

  const syncPause = (currentTimeSec: number) => {
    if (!activeRoom || !socket) return;
    setActiveRoom((prev) => prev ? { ...prev, playbackState: 'PAUSED', currentTimeSec, lastSyncedAt: Date.now() } : null);
    socket.emit('watch:sync_action', {
      roomCode: activeRoom.roomCode,
      action: 'PAUSE',
      currentTimeSec
    });
  };

  const syncSeek = (currentTimeSec: number) => {
    if (!activeRoom || !socket) return;
    setActiveRoom((prev) => prev ? { ...prev, currentTimeSec, lastSyncedAt: Date.now() } : null);
    socket.emit('watch:sync_action', {
      roomCode: activeRoom.roomCode,
      action: 'SEEK',
      currentTimeSec
    });
  };

  const changeVideo = (youtubeUrl: string) => {
    const videoId = parseYouTubeVideoId(youtubeUrl);
    if (!videoId || !activeRoom || !socket) return;

    setActiveRoom((prev) => prev ? { ...prev, videoId, playbackState: 'PLAYING', currentTimeSec: 0, lastSyncedAt: Date.now() } : null);
    socket.emit('watch:sync_action', {
      roomCode: activeRoom.roomCode,
      action: 'CHANGE_VIDEO',
      currentTimeSec: 0,
      videoId
    });
  };

  const sendWatchChat = (text: string) => {
    if (!activeRoom || !socket || !user || !text.trim()) return;
    socket.emit('watch:chat', {
      roomCode: activeRoom.roomCode,
      text: text.trim(),
      user: {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl
      }
    });
  };

  return (
    <WatchRoomContext.Provider
      value={{
        activeRoom,
        chatMessages,
        createRoom,
        joinRoom,
        leaveRoom,
        syncPlay,
        syncPause,
        syncSeek,
        changeVideo,
        sendWatchChat,
        parseYouTubeVideoId
      }}
    >
      {children}
    </WatchRoomContext.Provider>
  );
};

export const useWatchRoom = () => {
  const context = useContext(WatchRoomContext);
  if (!context) throw new Error('useWatchRoom must be used within a WatchRoomProvider');
  return context;
};
