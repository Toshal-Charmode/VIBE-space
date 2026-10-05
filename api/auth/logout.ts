import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleLogout } from '../../src/server/authService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleLogout(req, res);
}
