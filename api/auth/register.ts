import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleRegister } from '../../src/server/authService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleRegister(req, res);
}
