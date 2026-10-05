import express, { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  updatePublicKey,
  extractToken,
  verifyToken,
  JWT_SECRET
} from './authService.ts';

export const authRouter = express.Router();
export { JWT_SECRET };

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  req.userId = payload.userId;
  req.username = payload.username;
  next();
}

// Register
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await registerUser(req.body);
    if (result.cookie) {
      res.setHeader('Set-Cookie', result.cookie);
    }
    res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({ error: 'Registration failed', message: 'Registration failed' });
  }
});

// Login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await loginUser(req.body);
    if (result.cookie) {
      res.setHeader('Set-Cookie', result.cookie);
    }
    res.status(result.status).json(result.data);
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({ error: 'Login failed', message: 'Login failed' });
  }
});

// Get current profile
authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractToken(req);
    const result = await getMe(token);
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user', message: 'Failed to fetch user' });
  }
});

// Logout
authRouter.post('/logout', (req: Request, res: Response): void => {
  const result = logoutUser();
  if (result.cookie) {
    res.setHeader('Set-Cookie', result.cookie);
  }
  res.status(result.status).json(result.data);
});

// Update Public Key (e.g. if key rotated)
authRouter.post('/update-key', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = extractToken(req);
    const result = await updatePublicKey(token, req.body?.publicKey);
    res.status(result.status).json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update key', message: 'Failed to update key' });
  }
});
