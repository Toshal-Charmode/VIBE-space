import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpdateKey } from '../../src/server/authService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleUpdateKey(req, res);
}
