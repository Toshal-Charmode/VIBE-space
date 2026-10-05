import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// Resolve database file path
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const LEGACY_DB_PATH = path.join(DATA_DIR, 'aetheria.db');
const DB_PATH = path.join(DATA_DIR, 'vibe_space.db');
if (!fs.existsSync(DB_PATH) && fs.existsSync(LEGACY_DB_PATH)) {
  try {
    fs.copyFileSync(LEGACY_DB_PATH, DB_PATH);
  } catch (e) {}
}

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency & performance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    public_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    user_id_1 TEXT NOT NULL,
    user_id_2 TEXT NOT NULL,
    status TEXT NOT NULL, /* 'PENDING', 'ACCEPTED', 'BLOCKED' */
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
    playback_state TEXT NOT NULL, /* 'PLAYING', 'PAUSED' */
    current_time_sec REAL NOT NULL,
    last_synced_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (host_id) REFERENCES users(id)
  );
`);

console.log('[Database] SQLite initialized with WAL mode at:', DB_PATH);
