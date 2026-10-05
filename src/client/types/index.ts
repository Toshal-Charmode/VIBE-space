export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  publicKey: string;
  lastSeen?: number;
}

export interface Connection {
  connectionId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  isOutgoing: boolean;
  user: User;
}

export interface EncryptedEnvelope {
  id: string;
  senderId: string;
  recipientId: string;
  senderPublicKey: string;
  ciphertext: string;
  iv: string;
  createdAt: number;
  readAt?: number;
}

export interface DecryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: number;
  isOutgoing: boolean;
  status: 'sent' | 'delivered' | 'read';
  isDecrypted: boolean;
}

export type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'reconnecting' | 'ended';

export interface ActiveCall {
  callId: string;
  peerUserId: string;
  peerUser: User;
  isVideo: boolean;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing?: boolean;
  status: CallStatus;
  startTime?: number;
  cameraDenied?: boolean;
  micDenied?: boolean;
  remoteIsVideoMuted?: boolean;
  remoteIsAudioMuted?: boolean;
  remoteIsScreenSharing?: boolean;
}

export interface WatchRoomMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface WatchRoomState {
  roomCode: string;
  title: string;
  hostId: string;
  hostUsername?: string;
  hostDisplayName?: string;
  videoId: string;
  playbackState: 'PLAYING' | 'PAUSED';
  currentTimeSec: number;
  lastSyncedAt: number;
  members: WatchRoomMember[];
}

export interface WatchChatMessage {
  id: string;
  roomCode: string;
  text: string;
  user: {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  timestamp: number;
}

export interface SpaceCommunity {
  id: string;
  name: string;
  iconText: string;
  iconBg: string;
  isDirectMessages?: boolean;
}

export interface ChannelItem {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'watch';
  spaceId: string;
  description?: string;
}
