import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.ts';
import { generateUserKeyPair, exportPublicKey } from '../crypto/e2ee.ts';
import { storeLocalKeyPair, loadLocalKeyPair, clearVault } from '../crypto/keyVault.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  keyPair: CryptoKeyPair | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string) => Promise<void>;
  logout: () => void;
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
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` }
        });

        if (!res.ok) {
          throw new Error('Session expired');
        }

        const userData: User = await res.json();
        setUser(userData);
        setToken(savedToken);

        // Load or generate local crypto keypair
        let localKeys = await loadLocalKeyPair(userData.id);
        if (!localKeys) {
          console.log('[Crypto] Generating new identity keypair for session...');
          localKeys = await generateUserKeyPair();
          await storeLocalKeyPair(userData.id, localKeys);
          const pubKeySpki = await exportPublicKey(localKeys.publicKey);
          // Sync with server registry
          await fetch('/api/auth/update-key', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${savedToken}`
            },
            body: JSON.stringify({ publicKey: pubKeySpki })
          });
          userData.publicKey = pubKeySpki;
          setUser({ ...userData });
        }
        setKeyPair(localKeys);
      } catch (err) {
        console.warn('Auth initialization failed:', err);
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
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('vibe_space_token', data.token);
      setToken(data.token);
      setUser(data.user);

      // Restore or generate cryptographic keys
      let localKeys = await loadLocalKeyPair(data.user.id);
      if (!localKeys) {
        localKeys = await generateUserKeyPair();
        await storeLocalKeyPair(data.user.id, localKeys);
        const pubKeySpki = await exportPublicKey(localKeys.publicKey);
        await fetch('/api/auth/update-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`
          },
          body: JSON.stringify({ publicKey: pubKeySpki })
        });
        data.user.publicKey = pubKeySpki;
        setUser({ ...data.user });
      }
      setKeyPair(localKeys);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, displayName: string, password: string) => {
    setIsLoading(true);
    try {
      // 1. Generate local cryptographic keypair BEFORE registering
      const newKeyPair = await generateUserKeyPair();
      const publicKeySpki = await exportPublicKey(newKeyPair.publicKey);

      // 2. Transmit public key to server (Private key stays strictly on client!)
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          displayName,
          password,
          publicKey: publicKeySpki
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // 3. Securely store private key in client-side IndexedDB
      await storeLocalKeyPair(data.user.id, newKeyPair);

      localStorage.setItem('vibe_space_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setKeyPair(newKeyPair);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('vibe_space_token');
    localStorage.removeItem('aetheria_token');
    setToken(null);
    setUser(null);
    setKeyPair(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const u = await res.json();
        setUser(u);
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
