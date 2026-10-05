import express from 'express';
import cors from 'cors';
import { authRouter } from './auth.ts';
import { apiRouter } from './routes.ts';

export const app = express();

// CORS configuration (supports credentials and cookies)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

// Root/Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Vibe Space API', timestamp: Date.now() });
});

export default app;
