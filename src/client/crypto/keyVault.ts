/**
 * KeyVault: Client-side cryptographic key persistence using browser IndexedDB for Vibe Space.
 * Private keys NEVER leave the user's device and are never transmitted over the network.
 * Built with full error tolerance to guarantee authentication never blocks.
 */

const DB_NAME = 'vibe_space_vault_db';
const LEGACY_DB_NAME = 'aetheria_vault_db';
const STORE_NAME = 'crypto_keys';
const DB_VERSION = 1;

// In-memory session fallback if IndexedDB is disabled or unavailable in private browsing
const memoryKeyStore = new Map<string, CryptoKey>();

function openVaultDB(dbName = DB_NAME): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const request = indexedDB.open(dbName, DB_VERSION);

      request.onupgradeneeded = () => {
        try {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        } catch {
          // ignore upgrade errors
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function storeLocalKeyPair(userId: string, keyPair: CryptoKeyPair): Promise<void> {
  // Always store in memory fallback
  memoryKeyStore.set(`${userId}_private_key`, keyPair.privateKey);
  memoryKeyStore.set(`${userId}_public_key`, keyPair.publicKey);

  try {
    const db = await openVaultDB(DB_NAME);
    if (!db) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(keyPair.privateKey, `${userId}_private_key`);
        store.put(keyPair.publicKey, `${userId}_public_key`);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch (err) {
    console.warn('[KeyVault] IndexedDB write skipped, saved in-memory:', err);
  }
}

export async function loadLocalKeyPair(userId: string): Promise<CryptoKeyPair | null> {
  // Check memory store first
  const memPrivate = memoryKeyStore.get(`${userId}_private_key`);
  const memPublic = memoryKeyStore.get(`${userId}_public_key`);
  if (memPrivate && memPublic) {
    return { privateKey: memPrivate, publicKey: memPublic };
  }

  try {
    const db = await openVaultDB(DB_NAME);
    if (db) {
      const primaryKeys = await new Promise<CryptoKeyPair | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const reqPrivate = store.get(`${userId}_private_key`);
          const reqPublic = store.get(`${userId}_public_key`);

          tx.oncomplete = () => {
            if (reqPrivate.result && reqPublic.result) {
              resolve({
                privateKey: reqPrivate.result as CryptoKey,
                publicKey: reqPublic.result as CryptoKey
              });
            } else {
              resolve(null);
            }
          };

          tx.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });

      if (primaryKeys) {
        memoryKeyStore.set(`${userId}_private_key`, primaryKeys.privateKey);
        memoryKeyStore.set(`${userId}_public_key`, primaryKeys.publicKey);
        return primaryKeys;
      }
    }
  } catch (e) {
    console.warn('[KeyVault] IndexedDB read error:', e);
  }

  return null;
}

export async function clearVault(): Promise<void> {
  memoryKeyStore.clear();
  try {
    const db = await openVaultDB(DB_NAME);
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore clear errors
  }
}
