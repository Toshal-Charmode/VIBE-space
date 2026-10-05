import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLogin } from '../../src/server/authService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleLogin(req, res);
}
