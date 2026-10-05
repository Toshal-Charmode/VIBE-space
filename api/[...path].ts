import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/server/app.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return (app as any)(req, res);
}
