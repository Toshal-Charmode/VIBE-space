import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.tsx';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  presenceMap: Record<string, 'online' | 'offline'>;
  checkPresence: (userIds: string[]) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, 'online' | 'offline'>>({});

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setIsConnected(false);
      return;
    }

    const newSocket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected as', user.username);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('presence:update', (data: { userId: string; status: 'online' | 'offline' }) => {
      setPresenceMap((prev) => ({
        ...prev,
        [data.userId]: data.status
      }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id]);

  const checkPresence = (userIds: string[]) => {
    if (!socket || !isConnected || userIds.length === 0) return;
    socket.emit('presence:check', userIds, (statuses: Record<string, 'online' | 'offline'>) => {
      setPresenceMap((prev) => ({ ...prev, ...statuses }));
    });
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, presenceMap, checkPresence }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
