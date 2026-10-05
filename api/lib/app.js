import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes.js';
import {
  handleRegister,
  handleLogin,
  handleMe,
  handleLogout,
  handleUpdateKey
} from './authService.js';

export const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Direct Auth Routes (matches Express routing)
const authRouter = express.Router();
authRouter.post('/register', handleRegister);
authRouter.post('/login', handleLogin);
authRouter.get('/me', handleMe);
authRouter.post('/logout', handleLogout);
authRouter.post('/update-key', handleUpdateKey);

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Vibe Space API', timestamp: Date.now() });
});

export default app;
