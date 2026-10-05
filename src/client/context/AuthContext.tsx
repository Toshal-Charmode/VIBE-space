import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { generateUserKeyPair, exportPublicKey } from '../crypto/e2ee.ts';
import { storeLocalKeyPair, loadLocalKeyPair } from '../crypto/keyVault.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  keyPair: CryptoKeyPair | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('vibe_space_token') || localStorage.getItem('aetheria_token'));
  const [keyPair, setKeyPair] = useState<CryptoKeyPair | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session
  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem('vibe_space_token') || localStorage.getItem('aetheria_token');
      const headers: Record<string, string> = {};
      if (savedToken) {
        headers['Authorization'] = `Bearer ${savedToken}`;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers,
          credentials: 'include'
        });

        if (!res.ok) {
          throw new Error('Session expired');
        }

        const data = await res.json();
        const userData: User = data.user || data;
        setUser(userData);
        if (data.token) {
          localStorage.setItem('vibe_space_token', data.token);
          setToken(data.token);
        } else if (savedToken) {
          setToken(savedToken);
        }

        // Load or generate local crypto keypair
        let localKeys = await loadLocalKeyPair(userData.id);
        if (!localKeys) {
          console.log('[Crypto] Generating new identity keypair for session...');
          localKeys = await generateUserKeyPair();
          await storeLocalKeyPair(userData.id, localKeys);
          const pubKeySpki = await exportPublicKey(localKeys.publicKey);
          // Sync with server registry
          const updateHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
          if (savedToken || data.token) {
            updateHeaders['Authorization'] = `Bearer ${data.token || savedToken}`;
          }
          await fetch('/api/auth/update-key', {
            method: 'POST',
            headers: updateHeaders,
            credentials: 'include',
            body: JSON.stringify({ publicKey: pubKeySpki })
          });
          userData.publicKey = pubKeySpki;
          setUser({ ...userData });
        }
        setKeyPair(localKeys);
      } catch (err) {
        // Unauthenticated or expired session
        localStorage.removeItem('vibe_space_token');
        localStorage.removeItem('aetheria_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Login failed');
      }

      const userData: User = data.user || data;
      if (data.token) {
        localStorage.setItem('vibe_space_token', data.token);
        setToken(data.token);
      }
      setUser(userData);

      // Restore or generate cryptographic keys
      let localKeys = await loadLocalKeyPair(userData.id);
      if (!localKeys) {
        localKeys = await generateUserKeyPair();
        await storeLocalKeyPair(userData.id, localKeys);
        const pubKeySpki = await exportPublicKey(localKeys.publicKey);
        const updateHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (data.token) {
          updateHeaders['Authorization'] = `Bearer ${data.token}`;
        }
        await fetch('/api/auth/update-key', {
          method: 'POST',
          headers: updateHeaders,
          credentials: 'include',
          body: JSON.stringify({ publicKey: pubKeySpki })
        });
        userData.publicKey = pubKeySpki;
        setUser({ ...userData });
      }
      setKeyPair(localKeys);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, displayName: string, password: string, email?: string) => {
    setIsLoading(true);
    try {
      // 1. Generate local cryptographic keypair BEFORE registering
      const newKeyPair = await generateUserKeyPair();
      const publicKeySpki = await exportPublicKey(newKeyPair.publicKey);

      // 2. Transmit public key to server
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
          displayName,
          password,
          email: email || undefined,
          publicKey: publicKeySpki
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Registration failed');
      }

      const userData: User = data.user || data;
      if (data.token) {
        localStorage.setItem('vibe_space_token', data.token);
        setToken(data.token);
      }

      // 3. Securely store private key in client-side IndexedDB
      await storeLocalKeyPair(userData.id, newKeyPair);

      setUser(userData);
      setKeyPair(newKeyPair);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.warn('Logout API call failed:', e);
    }
    localStorage.removeItem('vibe_space_token');
    localStorage.removeItem('aetheria_token');
    setToken(null);
    setUser(null);
    setKeyPair(null);
  };

  const refreshUser = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/auth/me', {
        headers,
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || data);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, keyPair, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
