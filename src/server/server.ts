import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { app } from './app.ts';
import { setupSocketIO } from './sockets.ts';

const server = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
setupSocketIO(io);

// Static file serving for standalone production mode
const DIST_PATH = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(DIST_PATH, 'index.html'));
    }
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Vibe Space Server] Running on http://localhost:${PORT}`);
});
