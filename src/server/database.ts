import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import pg from 'pg';
import { createClient } from '@libsql/client';

const esmRequire = createRequire(import.meta.url);

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  email?: string | null;
  avatar_url?: string | null;
  public_key: string;
  created_at: number;
  updated_at: number;
  last_seen: number;
}

export interface ConnectionRow {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: string;
  created_at: number;
}

export interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_public_key: string;
  ciphertext: string;
  iv: string;
  created_at: number;
  read_at?: number | null;
}

export interface WatchRoomRow {
  id: string;
  room_code: string;
  title: string;
  host_id: string;
  video_id: string;
  playback_state: string;
  current_time_sec: number;
  last_synced_at: number;
  created_at: number;
}

// Initial seed users (all have password: password123)
const SEED_USERS: UserRow[] = [
  {
    id: '57279ffe-0a1c-494a-b45c-a0d259f545fe',
    username: 'toshal',
    display_name: 'TOSHAL',
    password_hash: '$2a$10$xne88FvJSnB7HEH2t7VxnujaV48gylzDbMozlUG0CTeWr0m8S2/kC',
    email: 'toshal@vibespace.local',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=toshal',
    public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAECYM0Qx3v9tVwANUDCkeCY++/QrOMrStoAVTrd2U3IW2o62JEv0G/xgHK4W29dTOQZSv2HQLmhPlJn50MKYacaQ==',
    created_at: 1791006646631,
    updated_at: 1791006646631,
    last_seen: 1791010616145
  },
  {
    id: '6a3bf29c-b5d2-450e-b81a-8686eee7243f',
    username: 'alice_cyber',
    display_name: 'Alice Cyber',
    password_hash: '$2a$10$96RKY.zUAwNsotBHnzcxF.RP0GGiw27E6mh2CGdRLHEaYnJm7HpC6',
    email: 'alice@vibespace.local',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=alice_cyber',
    public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEaliceFakePublicKeyForTestingPurposes12345==',
    created_at: 1791006586699,
    updated_at: 1791006586699,
    last_seen: 1791175060645
  },
  {
    id: '4fd16542-68a0-4cc9-bf40-d1acb1259fca',
    username: 'bob_runner',
    display_name: 'Bob Runner',
    password_hash: '$2a$10$96RKY.zUAwNsotBHnzcxF.RP0GGiw27E6mh2CGdRLHEaYnJm7HpC6',
    email: 'bob@vibespace.local',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob_runner',
    public_key: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEbobFakePublicKeyForTestingPurposes123456==',
    created_at: 1791006586759,
    updated_at: 1791006586759,
    last_seen: 1791175060847
  }
];

// Determine database mode
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DATABASE_URL;
const TURSO_URL = process.env.TURSO_DATABASE_URL;

let pgPool: pg.Pool | null = null;
let tursoClient: ReturnType<typeof createClient> | null = null;
let sqliteDb: any = null;

// Determine writable directory for SQLite
function getSqlitePath(): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isVercel) {
    const tmpPath = path.join('/tmp', 'vibe_space.db');
    if (!fs.existsSync(tmpPath)) {
      const bundledDb = path.resolve(process.cwd(), 'data', 'vibe_space.db');
      if (fs.existsSync(bundledDb)) {
        try {
          fs.copyFileSync(bundledDb, tmpPath);
        } catch (e) {
          console.warn('[Database] Could not copy bundled DB to /tmp:', e);
        }
      }
    }
    return tmpPath;
  }

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {}
  }
  return path.join(dataDir, 'vibe_space.db');
}

// Initialize SQLite instance safely
async function getSqliteDb() {
  if (sqliteDb) return sqliteDb;
  const dbPath = getSqlitePath();
  try {
    const { DatabaseSync } = await import('node:sqlite');
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        avatar_url TEXT,
        public_key TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_seen INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        user_id_1 TEXT NOT NULL,
        user_id_2 TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id_1) REFERENCES users(id),
        FOREIGN KEY (user_id_2) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS e2e_messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        sender_public_key TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        read_at INTEGER,
        FOREIGN KEY (sender_id) REFERENCES users(id),
        FOREIGN KEY (recipient_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS watch_rooms (
        id TEXT PRIMARY KEY,
        room_code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        host_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        playback_state TEXT NOT NULL,
        current_time_sec REAL NOT NULL,
        last_synced_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (host_id) REFERENCES users(id)
      );
    `);

    // Add optional columns if upgrading an existing db
    try { sqliteDb.exec("ALTER TABLE users ADD COLUMN email TEXT;"); } catch (e) {}
    try { sqliteDb.exec("ALTER TABLE users ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;"); } catch (e) {}

    // Seed users if empty
    const countRow: any = sqliteDb.prepare("SELECT count(*) as count FROM users").get();
    if (countRow && countRow.count === 0) {
      console.log('[Database] Seeding initial users into SQLite...');
      const insertUser = sqliteDb.prepare(`
        INSERT INTO users (id, username, display_name, password_hash, email, avatar_url, public_key, created_at, updated_at, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const u of SEED_USERS) {
        insertUser.run(u.id, u.username, u.display_name, u.password_hash, u.email || null, u.avatar_url || null, u.public_key, u.created_at, u.updated_at, u.last_seen);
      }
    }
  } catch (err) {
    console.error('[Database] SQLite initialization error:', err);
  }
  return sqliteDb;
}

// Synchronous db export for backward compatibility with local server/sockets
export const db = (() => {
  try {
    const { DatabaseSync } = esmRequire('node:sqlite');
    const dbPath = getSqlitePath();
    const inst = new DatabaseSync(dbPath);
    try { inst.exec("ALTER TABLE users ADD COLUMN email TEXT;"); } catch (e) {}
    try { inst.exec("ALTER TABLE users ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;"); } catch (e) {}
    sqliteDb = inst;
    return inst;
  } catch (e) {
    return {
      prepare: (sql: string) => ({
        get: (...params: any[]) => null,
        all: (...params: any[]) => [],
        run: (...params: any[]) => ({ changes: 0, lastInsertRowid: 0 })
      }),
      exec: () => {}
    } as any;
  }
})();

// Initialize PostgreSQL pool if configured
function getPgPool(): pg.Pool {
  if (!pgPool) {
    const isLocal = DATABASE_URL?.includes('localhost') || DATABASE_URL?.includes('127.0.0.1');
    pgPool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
  }
  return pgPool;
}

let pgInitialized = false;
async function initPgTables(pool: pg.Pool) {
  if (pgInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(64) UNIQUE NOT NULL,
        display_name VARCHAR(128) NOT NULL,
        password_hash VARCHAR(256) NOT NULL,
        email VARCHAR(256),
        avatar_url TEXT,
        public_key TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        last_seen BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS connections (
        id VARCHAR(64) PRIMARY KEY,
        user_id_1 VARCHAR(64) NOT NULL,
        user_id_2 VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS e2e_messages (
        id VARCHAR(64) PRIMARY KEY,
        sender_id VARCHAR(64) NOT NULL,
        recipient_id VARCHAR(64) NOT NULL,
        sender_public_key TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        read_at BIGINT
      );

      CREATE TABLE IF NOT EXISTS watch_rooms (
        id VARCHAR(64) PRIMARY KEY,
        room_code VARCHAR(32) UNIQUE NOT NULL,
        title VARCHAR(256) NOT NULL,
        host_id VARCHAR(64) NOT NULL,
        video_id VARCHAR(128) NOT NULL,
        playback_state VARCHAR(32) NOT NULL,
        current_time_sec REAL NOT NULL,
        last_synced_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `);

    // Check if empty and seed
    const res = await pool.query('SELECT count(*) as count FROM users');
    if (parseInt(res.rows[0].count, 10) === 0) {
      console.log('[Database] Seeding initial users into PostgreSQL...');
      for (const u of SEED_USERS) {
        await pool.query(`
          INSERT INTO users (id, username, display_name, password_hash, email, avatar_url, public_key, created_at, updated_at, last_seen)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
        `, [u.id, u.username, u.display_name, u.password_hash, u.email || null, u.avatar_url || null, u.public_key, u.created_at, u.updated_at, u.last_seen]);
      }
    }
    pgInitialized = true;
  } catch (err) {
    console.error('[Database] Failed to initialize PostgreSQL tables:', err);
  }
}

// Initialize Turso if configured
function getTursoClient() {
  if (!tursoClient && TURSO_URL) {
    tursoClient = createClient({
      url: TURSO_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return tursoClient;
}

// Unified Database Service
export const dbService = {
  async findUserByUsername(username: string): Promise<UserRow | null> {
    const cleanUsername = username.trim().toLowerCase();
    if (DATABASE_URL) {
      const pool = getPgPool();
      await initPgTables(pool);
      const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [cleanUsername]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        password_hash: r.password_hash,
        email: r.email,
        avatar_url: r.avatar_url,
        public_key: r.public_key,
        created_at: Number(r.created_at),
        updated_at: Number(r.updated_at),
        last_seen: Number(r.last_seen)
      };
    }

    if (TURSO_URL) {
      const client = getTursoClient();
      if (client) {
        const res = await client.execute({ sql: 'SELECT * FROM users WHERE LOWER(username) = ?', args: [cleanUsername] });
        if (res.rows.length === 0) return null;
        const r: any = res.rows[0];
        return {
          id: r.id,
          username: r.username,
          display_name: r.display_name,
          password_hash: r.password_hash,
          email: r.email,
          avatar_url: r.avatar_url,
          public_key: r.public_key,
          created_at: Number(r.created_at),
          updated_at: Number(r.updated_at),
          last_seen: Number(r.last_seen)
        };
      }
    }

    const sDb = await getSqliteDb();
    if (!sDb) return null;
    const r: any = sDb.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (!r) return null;
    return {
      id: r.id,
      username: r.username,
      display_name: r.display_name,
      password_hash: r.password_hash,
      email: r.email,
      avatar_url: r.avatar_url,
      public_key: r.public_key,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at || r.created_at),
      last_seen: Number(r.last_seen)
    };
  },

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (DATABASE_URL) {
      const pool = getPgPool();
      await initPgTables(pool);
      const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        password_hash: r.password_hash,
        email: r.email,
        avatar_url: r.avatar_url,
        public_key: r.public_key,
        created_at: Number(r.created_at),
        updated_at: Number(r.updated_at),
        last_seen: Number(r.last_seen)
      };
    }

    if (TURSO_URL) {
      const client = getTursoClient();
      if (client) {
        const res = await client.execute({ sql: 'SELECT * FROM users WHERE LOWER(email) = ?', args: [cleanEmail] });
        if (res.rows.length === 0) return null;
        const r: any = res.rows[0];
        return {
          id: r.id,
          username: r.username,
          display_name: r.display_name,
          password_hash: r.password_hash,
          email: r.email,
          avatar_url: r.avatar_url,
          public_key: r.public_key,
          created_at: Number(r.created_at),
          updated_at: Number(r.updated_at),
          last_seen: Number(r.last_seen)
        };
      }
    }

    const sDb = await getSqliteDb();
    if (!sDb) return null;
    const r: any = sDb.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (!r) return null;
    return {
      id: r.id,
      username: r.username,
      display_name: r.display_name,
      password_hash: r.password_hash,
      email: r.email,
      avatar_url: r.avatar_url,
      public_key: r.public_key,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at || r.created_at),
      last_seen: Number(r.last_seen)
    };
  },

  async findUserById(id: string): Promise<UserRow | null> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await initPgTables(pool);
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        password_hash: r.password_hash,
        email: r.email,
        avatar_url: r.avatar_url,
        public_key: r.public_key,
        created_at: Number(r.created_at),
        updated_at: Number(r.updated_at),
        last_seen: Number(r.last_seen)
      };
    }

    if (TURSO_URL) {
      const client = getTursoClient();
      if (client) {
        const res = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
        if (res.rows.length === 0) return null;
        const r: any = res.rows[0];
        return {
          id: r.id,
          username: r.username,
          display_name: r.display_name,
          password_hash: r.password_hash,
          email: r.email,
          avatar_url: r.avatar_url,
          public_key: r.public_key,
          created_at: Number(r.created_at),
          updated_at: Number(r.updated_at),
          last_seen: Number(r.last_seen)
        };
      }
    }

    const sDb = await getSqliteDb();
    if (!sDb) return null;
    const r: any = sDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!r) return null;
    return {
      id: r.id,
      username: r.username,
      display_name: r.display_name,
      password_hash: r.password_hash,
      email: r.email,
      avatar_url: r.avatar_url,
      public_key: r.public_key,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at || r.created_at),
      last_seen: Number(r.last_seen)
    };
  },

  async createUser(user: UserRow): Promise<void> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await initPgTables(pool);
      await pool.query(`
        INSERT INTO users (id, username, display_name, password_hash, email, avatar_url, public_key, created_at, updated_at, last_seen)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [user.id, user.username, user.display_name, user.password_hash, user.email || null, user.avatar_url || null, user.public_key, user.created_at, user.updated_at, user.last_seen]);
      return;
    }

    if (TURSO_URL) {
      const client = getTursoClient();
      if (client) {
        await client.execute({
          sql: `INSERT INTO users (id, username, display_name, password_hash, email, avatar_url, public_key, created_at, updated_at, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [user.id, user.username, user.display_name, user.password_hash, user.email || null, user.avatar_url || null, user.public_key, user.created_at, user.updated_at, user.last_seen]
        });
        return;
      }
    }

    const sDb = await getSqliteDb();
    if (sDb) {
      sDb.prepare(`
        INSERT INTO users (id, username, display_name, password_hash, email, avatar_url, public_key, created_at, updated_at, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(user.id, user.username, user.display_name, user.password_hash, user.email || null, user.avatar_url || null, user.public_key, user.created_at, user.updated_at, user.last_seen);
    }
  },

  async updateUserLastSeen(id: string, timestamp: number): Promise<void> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await pool.query('UPDATE users SET last_seen = $1, updated_at = $1 WHERE id = $2', [timestamp, id]);
      return;
    }
    if (TURSO_URL) {
      const client = getTursoClient();
      if (client) {
        await client.execute({ sql: 'UPDATE users SET last_seen = ?, updated_at = ? WHERE id = ?', args: [timestamp, timestamp, id] });
        return;
      }
    }
    const sDb = await getSqliteDb();
    if (sDb) {
      sDb.prepare('UPDATE users SET last_seen = ?, updated_at = ? WHERE id = ?').run(timestamp, timestamp, id);
    }
  },

  async updateUserPublicKey(id: string, publicKey: string): Promise<void> {
    const now = Date.now();
    if (DATABASE_URL) {
      const pool = getPgPool();
      await pool.query('UPDATE users SET public_key = $1, updated_at = $2 WHERE id = $3', [publicKey, now, id]);
      return;
    }
    if (TURSO_URL) {
      const client = getTursoClient();
      if (client) {
        await client.execute({ sql: 'UPDATE users SET public_key = ?, updated_at = ? WHERE id = ?', args: [publicKey, now, id] });
        return;
      }
    }
    const sDb = await getSqliteDb();
    if (sDb) {
      sDb.prepare('UPDATE users SET public_key = ?, updated_at = ? WHERE id = ?').run(publicKey, now, id);
    }
  },

  async searchUsers(q: string, excludeId: string): Promise<UserRow[]> {
    const term = `%${q.toLowerCase()}%`;
    if (DATABASE_URL) {
      const pool = getPgPool();
      await initPgTables(pool);
      const res = await pool.query(`
        SELECT * FROM users
        WHERE (LOWER(username) LIKE $1 OR LOWER(display_name) LIKE $1) AND id != $2
        LIMIT 20
      `, [term, excludeId]);
      return res.rows.map(r => ({
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        password_hash: r.password_hash,
        email: r.email,
        avatar_url: r.avatar_url,
        public_key: r.public_key,
        created_at: Number(r.created_at),
        updated_at: Number(r.updated_at),
        last_seen: Number(r.last_seen)
      }));
    }

    if (TURSO_URL) {
      const client = getTursoClient();
      if (client) {
        const res = await client.execute({
          sql: `SELECT * FROM users WHERE (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?) AND id != ? LIMIT 20`,
          args: [term, term, excludeId]
        });
        return res.rows.map((r: any) => ({
          id: r.id,
          username: r.username,
          display_name: r.display_name,
          password_hash: r.password_hash,
          email: r.email,
          avatar_url: r.avatar_url,
          public_key: r.public_key,
          created_at: Number(r.created_at),
          updated_at: Number(r.updated_at),
          last_seen: Number(r.last_seen)
        }));
      }
    }

    const sDb = await getSqliteDb();
    if (!sDb) return [];
    const rows: any[] = sDb.prepare(`
      SELECT * FROM users
      WHERE (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?) AND id != ?
      LIMIT 20
    `).all(term, term, excludeId);
    return rows.map(r => ({
      id: r.id,
      username: r.username,
      display_name: r.display_name,
      password_hash: r.password_hash,
      email: r.email,
      avatar_url: r.avatar_url,
      public_key: r.public_key,
      created_at: Number(r.created_at),
      updated_at: Number(r.updated_at || r.created_at),
      last_seen: Number(r.last_seen)
    }));
  },

  async getConnectionsForUser(userId: string): Promise<any[]> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await initPgTables(pool);
      const res = await pool.query(`
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
        JOIN users u ON (u.id = CASE WHEN c.user_id_1 = $1 THEN c.user_id_2 ELSE c.user_id_1 END)
        WHERE c.user_id_1 = $1 OR c.user_id_2 = $1
      `, [userId]);
      return res.rows;
    }

    const sDb = await getSqliteDb();
    if (!sDb) return [];
    return sDb.prepare(`
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
    `).all(userId, userId, userId);
  },

  async findConnection(userId1: string, userId2: string): Promise<any> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      const res = await pool.query(`
        SELECT id, status FROM connections
        WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)
      `, [userId1, userId2]);
      return res.rows[0] || null;
    }
    const sDb = await getSqliteDb();
    if (!sDb) return null;
    return sDb.prepare(`
      SELECT id, status FROM connections
      WHERE (user_id_1 = ? AND user_id_2 = ?) OR (user_id_1 = ? AND user_id_2 = ?)
    `).get(userId1, userId2, userId2, userId1) || null;
  },

  async createConnection(id: string, userId1: string, userId2: string, status: string, createdAt: number): Promise<void> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await pool.query(`
        INSERT INTO connections (id, user_id_1, user_id_2, status, created_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, userId1, userId2, status, createdAt]);
      return;
    }
    const sDb = await getSqliteDb();
    if (sDb) {
      sDb.prepare(`
        INSERT INTO connections (id, user_id_1, user_id_2, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, userId1, userId2, status, createdAt);
    }
  },

  async getConnectionById(id: string): Promise<any> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      const res = await pool.query('SELECT * FROM connections WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    const sDb = await getSqliteDb();
    if (!sDb) return null;
    return sDb.prepare('SELECT * FROM connections WHERE id = ?').get(id) || null;
  },

  async updateConnectionStatus(id: string, status: string): Promise<void> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await pool.query('UPDATE connections SET status = $1 WHERE id = $2', [status, id]);
      return;
    }
    const sDb = await getSqliteDb();
    if (sDb) {
      sDb.prepare('UPDATE connections SET status = ? WHERE id = ?').run(status, id);
    }
  },

  async deleteConnection(id: string): Promise<void> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await pool.query('DELETE FROM connections WHERE id = $1', [id]);
      return;
    }
    const sDb = await getSqliteDb();
    if (sDb) {
      sDb.prepare('DELETE FROM connections WHERE id = ?').run(id);
    }
  },

  async getMessages(userId1: string, userId2: string, limit = 100): Promise<MessageRow[]> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      const res = await pool.query(`
        SELECT id, sender_id, recipient_id, sender_public_key, ciphertext, iv, created_at, read_at
        FROM e2e_messages
        WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
        ORDER BY created_at ASC
        LIMIT $3
      `, [userId1, userId2, limit]);
      return res.rows.map(r => ({
        id: r.id,
        sender_id: r.sender_id,
        recipient_id: r.recipient_id,
        sender_public_key: r.sender_public_key,
        ciphertext: r.ciphertext,
        iv: r.iv,
        created_at: Number(r.created_at),
        read_at: r.read_at ? Number(r.read_at) : null
      }));
    }
    const sDb = await getSqliteDb();
    if (!sDb) return [];
    const rows: any[] = sDb.prepare(`
      SELECT id, sender_id, recipient_id, sender_public_key, ciphertext, iv, created_at, read_at
      FROM e2e_messages
      WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at ASC
      LIMIT ?
    `).all(userId1, userId2, userId2, userId1, limit);
    return rows.map(r => ({
      id: r.id,
      sender_id: r.sender_id,
      recipient_id: r.recipient_id,
      sender_public_key: r.sender_public_key,
      ciphertext: r.ciphertext,
      iv: r.iv,
      created_at: Number(r.created_at),
      read_at: r.read_at ? Number(r.read_at) : null
    }));
  },

  async createMessage(msg: MessageRow): Promise<void> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await pool.query(`
        INSERT INTO e2e_messages (id, sender_id, recipient_id, sender_public_key, ciphertext, iv, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [msg.id, msg.sender_id, msg.recipient_id, msg.sender_public_key, msg.ciphertext, msg.iv, msg.created_at]);
      return;
    }
    const sDb = await getSqliteDb();
    if (sDb) {
      sDb.prepare(`
        INSERT INTO e2e_messages (id, sender_id, recipient_id, sender_public_key, ciphertext, iv, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(msg.id, msg.sender_id, msg.recipient_id, msg.sender_public_key, msg.ciphertext, msg.iv, msg.created_at);
    }
  },

  async createWatchRoom(room: WatchRoomRow): Promise<void> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      await pool.query(`
        INSERT INTO watch_rooms (id, room_code, title, host_id, video_id, playback_state, current_time_sec, last_synced_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [room.id, room.room_code, room.title, room.host_id, room.video_id, room.playback_state, room.current_time_sec, room.last_synced_at, room.created_at]);
      return;
    }
    const sDb = await getSqliteDb();
    if (sDb) {
      sDb.prepare(`
        INSERT INTO watch_rooms (id, room_code, title, host_id, video_id, playback_state, current_time_sec, last_synced_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(room.id, room.room_code, room.title, room.host_id, room.video_id, room.playback_state, room.current_time_sec, room.last_synced_at, room.created_at);
    }
  },

  async getWatchRoomByCode(code: string): Promise<any> {
    if (DATABASE_URL) {
      const pool = getPgPool();
      const res = await pool.query(`
        SELECT r.*, u.username as host_username, u.display_name as host_display_name
        FROM watch_rooms r
        JOIN users u ON u.id = r.host_id
        WHERE r.room_code = $1
      `, [code]);
      return res.rows[0] || null;
    }
    const sDb = await getSqliteDb();
    if (!sDb) return null;
    return sDb.prepare(`
      SELECT r.*, u.username as host_username, u.display_name as host_display_name
      FROM watch_rooms r
      JOIN users u ON u.id = r.host_id
      WHERE r.room_code = ?
    `).get(code) || null;
  }
};
