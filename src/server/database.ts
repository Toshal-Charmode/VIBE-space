// @ts-nocheck
// Re-export from api/lib/database.js for local development
export { db, dbService, SEED_USERS } from '../../api/lib/database.js';

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
