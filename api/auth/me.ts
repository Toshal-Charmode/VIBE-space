import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleMe } from '../../src/server/authService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return handleMe(req, res);
}
