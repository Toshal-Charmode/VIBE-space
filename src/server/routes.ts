import express, { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from './database.ts';
import { authMiddleware, AuthRequest } from './auth.ts';

export const apiRouter = express.Router();

// Search users
apiRouter.get('/users/search', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const q = ((req.query.q as string) || '').trim().toLowerCase();
    if (!q) {
      res.json({ users: [] });
      return;
    }

    const rows: any[] = db.prepare(`
      SELECT id, username, display_name, avatar_url, public_key, last_seen
      FROM users
      WHERE (username LIKE ? OR display_name LIKE ?) AND id != ?
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`, req.userId!);

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
apiRouter.get('/users/:id/key', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const row: any = db.prepare('SELECT id, username, display_name, avatar_url, public_key FROM users WHERE id = ?').get(req.params.id as string);
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      publicKey: row.public_key
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

// List connections
apiRouter.get('/connections', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const currentUserId = req.userId!;
    const rows: any[] = db.prepare(`
      SELECT 
        c.id as connection_id,
        c.status,
        c.created_at,
        c.user_id_1,
        c.user_id_2,
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.public_key,
        u.last_seen
      FROM connections c
      JOIN users u ON (u.id = CASE WHEN c.user_id_1 = ? THEN c.user_id_2 ELSE c.user_id_1 END)
      WHERE c.user_id_1 = ? OR c.user_id_2 = ?
    `).all(currentUserId, currentUserId, currentUserId);

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
apiRouter.post('/connections/request', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.userId!;

    if (!targetUserId || targetUserId === currentUserId) {
      res.status(400).json({ error: 'Invalid target user' });
      return;
    }

    const existing: any = db.prepare(`
      SELECT id, status FROM connections
      WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
    `).get(currentUserId, targetUserId, targetUserId, currentUserId);

    if (existing) {
      res.status(409).json({ error: `Connection already exists with status: ${existing.status}` });
      return;
    }

    const id = randomUUID();
    db.prepare(`
      INSERT INTO connections (id, user_id_1, user_id_2, status, created_at)
      VALUES (?, ?, ?, 'PENDING', ?)
    `).run(id, currentUserId, targetUserId, Date.now());

    res.status(201).json({ success: true, connectionId: id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

// Respond to connection request
apiRouter.post('/connections/respond', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { connectionId, action } = req.body; // action: 'ACCEPT' | 'REJECT'
    const currentUserId = req.userId!;

    const row: any = db.prepare('SELECT * FROM connections WHERE id = ?').get(connectionId);
    if (!row) {
      res.status(404).json({ error: 'Connection request not found' });
      return;
    }

    if (row.user_id_2 !== currentUserId) {
      res.status(403).json({ error: 'Only the recipient can respond to this request' });
      return;
    }

    if (action === 'ACCEPT') {
      db.prepare("UPDATE connections SET status = 'ACCEPTED' WHERE id = ?").run(connectionId);
      res.json({ success: true, status: 'ACCEPTED' });
    } else {
      db.prepare('DELETE FROM connections WHERE id = ?').run(connectionId);
      res.json({ success: true, status: 'REJECTED' });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

// Get encrypted message history with another user
apiRouter.get('/messages/:otherUserId', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const currentUserId = req.userId!;
    const otherUserId = req.params.otherUserId as string;

    const rows: any[] = db.prepare(`
      SELECT id, sender_id, recipient_id, sender_public_key, ciphertext, iv, created_at, read_at
      FROM e2e_messages
      WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at ASC
      LIMIT 100
    `).all(currentUserId, otherUserId, otherUserId, currentUserId);

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
apiRouter.post('/messages', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const senderId = req.userId!;
    const { recipientId, senderPublicKey, ciphertext, iv } = req.body;

    if (!recipientId || !senderPublicKey || !ciphertext || !iv) {
      res.status(400).json({ error: 'Incomplete encrypted message envelope' });
      return;
    }

    const id = randomUUID();
    const now = Date.now();

    db.prepare(`
      INSERT INTO e2e_messages (id, sender_id, recipient_id, sender_public_key, ciphertext, iv, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, senderId, recipientId, senderPublicKey, ciphertext, iv, now);

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
apiRouter.post('/rooms', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const hostId = req.userId!;
    const { title, videoId } = req.body;
    const cleanVideoId = (videoId || 'dQw4w9WgXcQ').trim();
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const id = randomUUID();
    const now = Date.now();

    db.prepare(`
      INSERT INTO watch_rooms (id, room_code, title, host_id, video_id, playback_state, current_time_sec, last_synced_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'PAUSED', 0, ?, ?)
    `).run(id, roomCode, title || 'Cyber Lounge', hostId, cleanVideoId, now, now);

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

apiRouter.get('/rooms/:code', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const code = (req.params.code as string).toUpperCase();
    const row: any = db.prepare(`
      SELECT r.*, u.username as host_username, u.display_name as host_display_name
      FROM watch_rooms r
      JOIN users u ON u.id = r.host_id
      WHERE r.room_code = ?
    `).get(code);

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
