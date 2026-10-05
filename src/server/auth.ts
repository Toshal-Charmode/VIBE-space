import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { db } from './database.ts';

export const authRouter = express.Router();
export const JWT_SECRET = process.env.JWT_SECRET || 'vibe_space_super_secret_cyber_jwt_key_2026';
const LEGACY_JWT_SECRET = 'aetheria_super_secret_cyber_mesh_jwt_key_2026';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    let payload: any;
    try {
      payload = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    } catch (e) {
      payload = jwt.verify(token, LEGACY_JWT_SECRET) as { userId: string; username: string };
    }
    req.userId = payload.userId;
    req.username = payload.username;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }
}

// Register
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, displayName, password, publicKey } = req.body;

    if (!username || !displayName || !password || !publicKey) {
      res.status(400).json({ error: 'All fields including public key are required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
      res.status(400).json({ error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check duplicate
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
    if (existing) {
      res.status(409).json({ error: 'Username is already taken' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = randomUUID();
    const now = Date.now();
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    db.prepare(`
      INSERT INTO users (id, username, display_name, password_hash, avatar_url, public_key, created_at, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, cleanUsername, displayName.trim(), passwordHash, avatarUrl, publicKey, now, now);

    const token = jwt.sign({ userId: id, username: cleanUsername }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id,
        username: cleanUsername,
        displayName: displayName.trim(),
        avatarUrl,
        publicKey
      }
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRow: any = db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername);

    if (!userRow) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Update last_seen
    db.prepare('UPDATE users SET last_seen = ? WHERE id = ?').run(Date.now(), userRow.id);

    const token = jwt.sign({ userId: userRow.id, username: userRow.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: userRow.id,
        username: userRow.username,
        displayName: userRow.display_name,
        avatarUrl: userRow.avatar_url,
        publicKey: userRow.public_key
      }
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current profile
authRouter.get('/me', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const userRow: any = db.prepare('SELECT id, username, display_name, avatar_url, public_key, created_at, last_seen FROM users WHERE id = ?').get(req.userId!);
    if (!userRow) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: userRow.id,
      username: userRow.username,
      displayName: userRow.display_name,
      avatarUrl: userRow.avatar_url,
      publicKey: userRow.public_key,
      lastSeen: userRow.last_seen
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update Public Key (e.g. if key rotated)
authRouter.post('/update-key', authMiddleware, (req: AuthRequest, res: Response): void => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) {
      res.status(400).json({ error: 'Public key required' });
      return;
    }
    db.prepare('UPDATE users SET public_key = ? WHERE id = ?').run(publicKey, req.userId!);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update key' });
  }
});
