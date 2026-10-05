import { handleUpdateKey } from '../lib/authService.js';

export default async function handler(req, res) {
  return handleUpdateKey(req, res);
}
