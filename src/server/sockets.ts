import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './auth.ts';
import { db } from './database.ts';
import { randomUUID } from 'node:crypto';

// Map of userId -> Set of socket IDs
const userSockets = new Map<string, Set<string>>();
// Map of socketId -> userId
const socketToUser = new Map<string, string>();
// Map of userId -> active call info for reliable disconnect cleanup
const activeCallsMap = new Map<string, { callId: string; peerUserId: string }>();

// In-memory active watch rooms state for sub-millisecond sync
interface RoomState {
  roomCode: string;
  videoId: string;
  playbackState: 'PLAYING' | 'PAUSED';
  currentTimeSec: number;
  lastSyncedAt: number;
  members: Map<string, { userId: string; username: string; displayName: string; avatarUrl: string }>;
}
const activeRooms = new Map<string, RoomState>();

export function setupSocketIO(io: SocketIOServer): void {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;
    const username = socket.data.username as string;

    // Track active connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);
    socketToUser.set(socket.id, userId);

    console.log(`[Socket] User connected: ${username} (${userId}) on socket ${socket.id}`);

    // Broadcast user online status
    socket.broadcast.emit('presence:update', { userId, status: 'online' });

    // Handle presence query
    socket.on('presence:check', (targetUserIds: string[], callback) => {
      const statuses: Record<string, string> = {};
      if (Array.isArray(targetUserIds)) {
        for (const tid of targetUserIds) {
          statuses[tid] = userSockets.has(tid) && userSockets.get(tid)!.size > 0 ? 'online' : 'offline';
        }
      }
      if (typeof callback === 'function') callback(statuses);
    });

    // ==========================================
    // 1. E2EE REAL-TIME MESSAGING
    // ==========================================
    socket.on('chat:send', (data: { recipientId: string; senderPublicKey: string; ciphertext: string; iv: string }) => {
      const { recipientId, senderPublicKey, ciphertext, iv } = data;
      if (!recipientId || !ciphertext || !iv) return;

      const messageId = randomUUID();
      const now = Date.now();

      // Store in SQLite DB (Zero-knowledge: server only stores ciphertext envelope)
      try {
        db.prepare(`
          INSERT INTO e2e_messages (id, sender_id, recipient_id, sender_public_key, ciphertext, iv, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(messageId, userId, recipientId, senderPublicKey, ciphertext, iv, now);
      } catch (err) {
        console.error('[DB Message Save Error]:', err);
      }

      const envelope = {
        id: messageId,
        senderId: userId,
        recipientId,
        senderPublicKey,
        ciphertext,
        iv,
        createdAt: now
      };

      // Deliver to recipient's active socket(s)
      const recipientSockets = userSockets.get(recipientId);
      if (recipientSockets && recipientSockets.size > 0) {
        recipientSockets.forEach((sId) => {
          io.to(sId).emit('chat:incoming', envelope);
        });
      }

      // Acknowledge back to sender's sockets
      const mySockets = userSockets.get(userId);
      if (mySockets) {
        mySockets.forEach((sId) => {
          io.to(sId).emit('chat:sent', envelope);
        });
      }
    });

    // ==========================================
    // 2. WEBRTC VOICE & VIDEO SIGNALING
    // ==========================================

    socket.on('call:initiate', (payload: { targetUserId: string; isVideo: boolean; callerInfo: any; callId: string }) => {
      const { targetUserId, isVideo, callerInfo, callId } = payload;
      const targetSockets = userSockets.get(targetUserId);

      if (!targetSockets || targetSockets.size === 0) {
        socket.emit('call:unavailable', { targetUserId, reason: 'offline' });
        return;
      }

      targetSockets.forEach((sId) => {
        io.to(sId).emit('call:incoming', {
          callId,
          fromUserId: userId,
          callerInfo,
          isVideo
        });
      });
    });

    socket.on('call:accept', (payload: { callId: string; targetUserId: string }) => {
      activeCallsMap.set(userId, { callId: payload.callId, peerUserId: payload.targetUserId });
      activeCallsMap.set(payload.targetUserId, { callId: payload.callId, peerUserId: userId });

      const targetSockets = userSockets.get(payload.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call:accepted', { callId: payload.callId, fromUserId: userId });
        });
      }
    });

    socket.on('call:reject', (payload: { callId: string; targetUserId: string; reason?: string }) => {
      activeCallsMap.delete(userId);
      activeCallsMap.delete(payload.targetUserId);

      const targetSockets = userSockets.get(payload.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call:rejected', { callId: payload.callId, fromUserId: userId, reason: payload.reason || 'declined' });
        });
      }
    });

    socket.on('call:offer', (payload: { targetUserId: string; sdp: any; callId: string }) => {
      const targetSockets = userSockets.get(payload.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call:offer', { fromUserId: userId, sdp: payload.sdp, callId: payload.callId });
        });
      }
    });

    socket.on('call:answer', (payload: { targetUserId: string; sdp: any; callId: string }) => {
      const targetSockets = userSockets.get(payload.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call:answer', { fromUserId: userId, sdp: payload.sdp, callId: payload.callId });
        });
      }
    });

    socket.on('call:ice_candidate', (payload: { targetUserId: string; candidate: any; callId: string }) => {
      const targetSockets = userSockets.get(payload.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call:ice_candidate', { fromUserId: userId, candidate: payload.candidate, callId: payload.callId });
        });
      }
    });

    // Real-time camera & microphone status synchronization (ON/OFF)
    socket.on('call:media_state', (payload: { targetUserId: string; callId: string; isVideoMuted?: boolean; isAudioMuted?: boolean; isScreenSharing?: boolean }) => {
      const targetSockets = userSockets.get(payload.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call:media_state', {
            fromUserId: userId,
            callId: payload.callId,
            isVideoMuted: payload.isVideoMuted,
            isAudioMuted: payload.isAudioMuted,
            isScreenSharing: payload.isScreenSharing
          });
        });
      }
    });

    socket.on('call:end', (payload: { targetUserId: string; callId: string }) => {
      activeCallsMap.delete(userId);
      activeCallsMap.delete(payload.targetUserId);

      const targetSockets = userSockets.get(payload.targetUserId);
      if (targetSockets) {
        targetSockets.forEach((sId) => {
          io.to(sId).emit('call:ended', { fromUserId: userId, callId: payload.callId });
        });
      }
    });

    // ==========================================
    // 3. WATCH TOGETHER SYNCHRONIZATION
    // ==========================================
    socket.on('watch:join_room', (payload: { roomCode: string; user: any }, callback) => {
      const roomCode = payload.roomCode?.toUpperCase();
      if (!roomCode) return;

      socket.join(`watch:${roomCode}`);

      // Initialize room state if not in memory
      if (!activeRooms.has(roomCode)) {
        const dbRoom: any = db.prepare('SELECT * FROM watch_rooms WHERE room_code = ?').get(roomCode);
        if (dbRoom) {
          activeRooms.set(roomCode, {
            roomCode,
            videoId: dbRoom.video_id,
            playbackState: dbRoom.playback_state,
            currentTimeSec: dbRoom.current_time_sec,
            lastSyncedAt: dbRoom.last_synced_at,
            members: new Map()
          });
        } else {
          activeRooms.set(roomCode, {
            roomCode,
            videoId: 'dQw4w9WgXcQ',
            playbackState: 'PAUSED',
            currentTimeSec: 0,
            lastSyncedAt: Date.now(),
            members: new Map()
          });
        }
      }

      const room = activeRooms.get(roomCode)!;
      room.members.set(userId, {
        userId,
        username: payload.user.username || username,
        displayName: payload.user.displayName || username,
        avatarUrl: payload.user.avatarUrl || ''
      });

      const memberList = Array.from(room.members.values());

      // Send initial room snapshot to the joining user
      if (typeof callback === 'function') {
        callback({
          roomCode,
          videoId: room.videoId,
          playbackState: room.playbackState,
          currentTimeSec: room.currentTimeSec,
          lastSyncedAt: room.lastSyncedAt,
          members: memberList
        });
      }

      // Notify others in room
      socket.to(`watch:${roomCode}`).emit('watch:user_joined', {
        user: room.members.get(userId),
        members: memberList
      });
    });

    socket.on('watch:sync_action', (payload: {
      roomCode: string;
      action: 'PLAY' | 'PAUSE' | 'SEEK' | 'CHANGE_VIDEO';
      currentTimeSec: number;
      videoId?: string;
    }) => {
      const roomCode = payload.roomCode?.toUpperCase();
      const room = activeRooms.get(roomCode);
      if (!room) return;

      const now = Date.now();
      if (payload.action === 'PLAY') {
        room.playbackState = 'PLAYING';
        room.currentTimeSec = payload.currentTimeSec;
        room.lastSyncedAt = now;
      } else if (payload.action === 'PAUSE') {
        room.playbackState = 'PAUSED';
        room.currentTimeSec = payload.currentTimeSec;
        room.lastSyncedAt = now;
      } else if (payload.action === 'SEEK') {
        room.currentTimeSec = payload.currentTimeSec;
        room.lastSyncedAt = now;
      } else if (payload.action === 'CHANGE_VIDEO' && payload.videoId) {
        room.videoId = payload.videoId;
        room.playbackState = 'PLAYING';
        room.currentTimeSec = 0;
        room.lastSyncedAt = now;
      }

      // Persist latest state to DB periodically
      try {
        db.prepare(`
          UPDATE watch_rooms
          SET video_id = ?, playback_state = ?, current_time_sec = ?, last_synced_at = ?
          WHERE room_code = ?
        `).run(room.videoId, room.playbackState, room.currentTimeSec, now, roomCode);
      } catch (err) {
        // Log silently
      }

      // Broadcast to other participants in the room
      socket.to(`watch:${roomCode}`).emit('watch:state_updated', {
        action: payload.action,
        videoId: room.videoId,
        playbackState: room.playbackState,
        currentTimeSec: room.currentTimeSec,
        lastSyncedAt: room.lastSyncedAt,
        triggeredBy: username
      });
    });

    socket.on('watch:chat', (payload: { roomCode: string; text: string; user: any }) => {
      const roomCode = payload.roomCode?.toUpperCase();
      if (!roomCode || !payload.text) return;

      const chatItem = {
        id: randomUUID(),
        roomCode,
        text: payload.text,
        user: payload.user,
        timestamp: Date.now()
      };

      io.to(`watch:${roomCode}`).emit('watch:chat_message', chatItem);
    });

    socket.on('watch:leave_room', (payload: { roomCode: string }) => {
      const roomCode = payload.roomCode?.toUpperCase();
      socket.leave(`watch:${roomCode}`);
      const room = activeRooms.get(roomCode);
      if (room) {
        room.members.delete(userId);
        io.to(`watch:${roomCode}`).emit('watch:user_left', {
          userId,
          members: Array.from(room.members.values())
        });
      }
    });

    // ==========================================
    // DISCONNECT
    // ==========================================
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${username} (${userId})`);
      socketToUser.delete(socket.id);
      const userSocketsSet = userSockets.get(userId);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
        if (userSocketsSet.size === 0) {
          userSockets.delete(userId);
          // Broadcast offline status
          socket.broadcast.emit('presence:update', { userId, status: 'offline' });

          // Auto-cleanup active call if user disconnected unexpectedly
          const activeCallInfo = activeCallsMap.get(userId);
          if (activeCallInfo) {
            activeCallsMap.delete(userId);
            activeCallsMap.delete(activeCallInfo.peerUserId);
            const peerSockets = userSockets.get(activeCallInfo.peerUserId);
            if (peerSockets) {
              peerSockets.forEach((sId) => {
                io.to(sId).emit('call:ended', { fromUserId: userId, callId: activeCallInfo.callId });
              });
            }
          }
        }
      }

      // Clean up watch room memberships
      activeRooms.forEach((room, roomCode) => {
        if (room.members.has(userId)) {
          room.members.delete(userId);
          io.to(`watch:${roomCode}`).emit('watch:user_left', {
            userId,
            members: Array.from(room.members.values())
          });
        }
      });
    });
  });
}
