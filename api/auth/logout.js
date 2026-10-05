import { handleLogout } from '../lib/authService.js';

export default async function handler(req, res) {
  return handleLogout(req, res);
}
