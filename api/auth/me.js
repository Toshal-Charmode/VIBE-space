import { handleMe } from '../lib/authService.js';

export default async function handler(req, res) {
  return handleMe(req, res);
}
