import express, { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { dbService } from './database.ts';
import { authMiddleware, AuthRequest } from './auth.ts';

export const apiRouter = express.Router();

// Search users
apiRouter.get('/users/search', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    if (!q) {
      res.json({ users: [] });
      return;
    }

    const rows = await dbService.searchUsers(q, req.userId!);

    res.json({
      users: rows.map(r => ({
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        publicKey: r.public_key,
        lastSeen: r.last_seen
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user public key
apiRouter.get('/users/:id/key', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await dbService.findUserById(req.params.id as string);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      publicKey: user.public_key
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

// List connections
apiRouter.get('/connections', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.userId!;
    const rows = await dbService.getConnectionsForUser(currentUserId);

    res.json({
      connections: rows.map(r => ({
        connectionId: r.connection_id,
        status: r.status,
        isOutgoing: r.user_id_1 === currentUserId,
        user: {
          id: r.user_id,
          username: r.username,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
          publicKey: r.public_key,
          lastSeen: r.last_seen
        }
      }))
    });
  } catch (err: any) {
    console.error('Connections error:', err);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Send connection request
apiRouter.post('/connections/request', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.userId!;

    if (!targetUserId || targetUserId === currentUserId) {
      res.status(400).json({ error: 'Invalid target user' });
      return;
    }

    const existing = await dbService.findConnection(currentUserId, targetUserId);

    if (existing) {
      res.status(409).json({ error: `Connection already exists with status: ${existing.status}` });
      return;
    }

    const id = randomUUID();
    await dbService.createConnection(id, currentUserId, targetUserId, 'PENDING', Date.now());

    res.status(201).json({ success: true, connectionId: id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

// Respond to connection request
apiRouter.post('/connections/respond', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { connectionId, action } = req.body; // action: 'ACCEPT' | 'REJECT'
    const currentUserId = req.userId!;

    const row = await dbService.getConnectionById(connectionId);
    if (!row) {
      res.status(404).json({ error: 'Connection request not found' });
      return;
    }

    if (row.user_id_2 !== currentUserId) {
      res.status(403).json({ error: 'Only the recipient can respond to this request' });
      return;
    }

    if (action === 'ACCEPT') {
      await dbService.updateConnectionStatus(connectionId, 'ACCEPTED');
      res.json({ success: true, status: 'ACCEPTED' });
    } else {
      await dbService.deleteConnection(connectionId);
      res.json({ success: true, status: 'REJECTED' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

// Get encrypted message history with another user
apiRouter.get('/messages/:otherUserId', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.userId!;
    const otherUserId = req.params.otherUserId as string;

    const rows = await dbService.getMessages(currentUserId, otherUserId, 100);

    res.json({
      messages: rows.map(r => ({
        id: r.id,
        senderId: r.sender_id,
        recipientId: r.recipient_id,
        senderPublicKey: r.sender_public_key,
        ciphertext: r.ciphertext,
        iv: r.iv,
        createdAt: r.created_at,
        readAt: r.read_at
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Save an encrypted message envelope
apiRouter.post('/messages', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const senderId = req.userId!;
    const { recipientId, senderPublicKey, ciphertext, iv } = req.body;

    if (!recipientId || !senderPublicKey || !ciphertext || !iv) {
      res.status(400).json({ error: 'Incomplete encrypted message envelope' });
      return;
    }

    const id = randomUUID();
    const now = Date.now();

    await dbService.createMessage({
      id,
      sender_id: senderId,
      recipient_id: recipientId,
      sender_public_key: senderPublicKey,
      ciphertext,
      iv,
      created_at: now
    });

    res.status(201).json({
      message: {
        id,
        senderId,
        recipientId,
        senderPublicKey,
        ciphertext,
        iv,
        createdAt: now
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save message envelope' });
  }
});

// Watch Room management
apiRouter.post('/rooms', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hostId = req.userId!;
    const { title, videoId } = req.body;
    const cleanVideoId = (videoId || 'dQw4w9WgXcQ').trim();
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = randomUUID();
    const now = Date.now();

    await dbService.createWatchRoom({
      id,
      room_code: roomCode,
      title: title || 'Cyber Lounge',
      host_id: hostId,
      video_id: cleanVideoId,
      playback_state: 'PAUSED',
      current_time_sec: 0,
      last_synced_at: now,
      created_at: now
    });

    res.status(201).json({
      room: {
        id,
        roomCode,
        title: title || 'Cyber Lounge',
        hostId,
        videoId: cleanVideoId,
        playbackState: 'PAUSED',
        currentTimeSec: 0,
        lastSyncedAt: now
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create watch room' });
  }
});

apiRouter.get('/rooms/:code', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const row = await dbService.getWatchRoomByCode(code);

    if (!row) {
      res.status(404).json({ error: 'Watch room not found' });
      return;
    }

    res.json({
      room: {
        id: row.id,
        roomCode: row.room_code,
        title: row.title,
        hostId: row.host_id,
        hostUsername: row.host_username,
        hostDisplayName: row.host_display_name,
        videoId: row.video_id,
        playbackState: row.playback_state,
        currentTimeSec: row.current_time_sec,
        lastSyncedAt: row.last_synced_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch watch room' });
  }
});
