import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { dbService } from './database.js';

export const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || 'vibe_space_super_secret_cyber_jwt_key_2026';
const LEGACY_JWT_SECRET = 'aetheria_super_secret_cyber_mesh_jwt_key_2026';

export function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    try {
      return jwt.verify(token, LEGACY_JWT_SECRET);
    } catch (err) {
      return null;
    }
  }
}

export function serializeAuthCookie(token, maxAgeSeconds = 7 * 24 * 60 * 60) {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const parts = [
    `vibe_space_token=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (isProd) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function serializeLogoutCookie() {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const parts = [
    'vibe_space_token=',
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (isProd) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const headerStr = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  headerStr.split(';').forEach(c => {
    const [name, ...val] = c.split('=');
    if (!name) return;
    cookies[name.trim()] = decodeURIComponent(val.join('=').trim());
  });
  return cookies;
}

export function extractToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  const cookieHeader = req.headers['cookie'] || req.headers['Cookie'];
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies['vibe_space_token']) {
      return cookies['vibe_space_token'];
    }
    if (cookies['aetheria_token']) {
      return cookies['aetheria_token'];
    }
  }

  return null;
}

export function setCorsHeaders(req, res) {
  const origin = req.headers['origin'] || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export async function registerUser(body) {
  const { username, displayName, email, password, publicKey } = body || {};

  if (!username || !password) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Username and password are required',
        message: 'Username and password are required'
      }
    };
  }

  const cleanUsername = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
        message: 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
      }
    };
  }

  if (password.length < 6) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Password must be at least 6 characters',
        message: 'Password must be at least 6 characters'
      }
    };
  }

  let cleanEmail = null;
  if (email && typeof email === 'string' && email.trim().length > 0) {
    cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return {
        status: 400,
        data: {
          success: false,
          error: 'Please provide a valid email address',
          message: 'Please provide a valid email address'
        }
      };
    }
  }

  const existingUser = await dbService.findUserByUsername(cleanUsername);
  if (existingUser) {
    return {
      status: 409,
      data: {
        success: false,
        error: 'Username is already taken',
        message: 'Username is already taken'
      }
    };
  }

  if (cleanEmail) {
    const existingEmail = await dbService.findUserByEmail(cleanEmail);
    if (existingEmail) {
      return {
        status: 409,
        data: {
          success: false,
          error: 'Email is already registered',
          message: 'Email is already registered'
        }
      };
    }
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const id = randomUUID();
  const now = Date.now();
  const cleanDisplayName = (displayName || username).trim();
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;
  const cleanPublicKey = publicKey || `dummy_key_${id}`;

  const newUser = {
    id,
    username: cleanUsername,
    display_name: cleanDisplayName,
    password_hash: passwordHash,
    email: cleanEmail,
    avatar_url: avatarUrl,
    public_key: cleanPublicKey,
    created_at: now,
    updated_at: now,
    last_seen: now
  };

  await dbService.createUser(newUser);

  const token = createToken({ userId: id, username: cleanUsername });
  const cookie = serializeAuthCookie(token);

  return {
    status: 201,
    cookie,
    data: {
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id,
        username: cleanUsername,
        displayName: cleanDisplayName,
        email: cleanEmail,
        avatarUrl,
        publicKey: cleanPublicKey
      }
    }
  };
}

export async function loginUser(body) {
  const { username, password } = body || {};

  if (!username || !password) {
    return {
      status: 400,
      data: {
        success: false,
        error: 'Username and password are required',
        message: 'Username and password are required'
      }
    };
  }

  const cleanIdentifier = username.trim().toLowerCase();
  let user = await dbService.findUserByUsername(cleanIdentifier);
  if (!user && cleanIdentifier.includes('@')) {
    user = await dbService.findUserByEmail(cleanIdentifier);
  }

  if (!user) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'Invalid username or password',
        message: 'Invalid username or password'
      }
    };
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'Invalid username or password',
        message: 'Invalid username or password'
      }
    };
  }

  const now = Date.now();
  await dbService.updateUserLastSeen(user.id, now);

  const token = createToken({ userId: user.id, username: user.username });
  const cookie = serializeAuthCookie(token);

  return {
    status: 200,
    cookie,
    data: {
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        email: user.email || null,
        avatarUrl: user.avatar_url,
        publicKey: user.public_key
      }
    }
  };
}

export async function getMe(token) {
  if (!token) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'Not authenticated',
        message: 'Not authenticated'
      }
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'Session expired',
        message: 'Session expired'
      }
    };
  }

  const user = await dbService.findUserById(payload.userId);
  if (!user) {
    return {
      status: 401,
      data: {
        success: false,
        error: 'User not found',
        message: 'User not found'
      }
    };
  }

  const userData = {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email || null,
    avatarUrl: user.avatar_url,
    publicKey: user.public_key,
    lastSeen: user.last_seen
  };

  return {
    status: 200,
    data: {
      success: true,
      user: userData,
      ...userData
    }
  };
}

export function logoutUser() {
  return {
    status: 200,
    cookie: serializeLogoutCookie(),
    data: {
      success: true,
      message: 'Logged out successfully'
    }
  };
}

export async function updatePublicKey(token, publicKey) {
  if (!token) {
    return {
      status: 401,
      data: { success: false, error: 'Unauthorized' }
    };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      status: 401,
      data: { success: false, error: 'Invalid or expired token' }
    };
  }

  if (!publicKey) {
    return {
      status: 400,
      data: { success: false, error: 'Public key required' }
    };
  }

  await dbService.updateUserPublicKey(payload.userId, publicKey);
  return {
    status: 200,
    data: { success: true, message: 'Key updated successfully' }
  };
}

export async function handleRegister(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const result = await registerUser(body);
  if (result.cookie) res.setHeader('Set-Cookie', result.cookie);
  return res.status(result.status).json(result.data);
}

export async function handleLogin(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const result = await loginUser(body);
  if (result.cookie) res.setHeader('Set-Cookie', result.cookie);
  return res.status(result.status).json(result.data);
}

export async function handleMe(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = extractToken(req);
  const result = await getMe(token);
  return res.status(result.status).json(result.data);
}

export async function handleLogout(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const result = logoutUser();
  if (result.cookie) res.setHeader('Set-Cookie', result.cookie);
  return res.status(result.status).json(result.data);
}

export async function handleUpdateKey(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = extractToken(req);
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const result = await updatePublicKey(token, body.publicKey);
  return res.status(result.status).json(result.data);
}
