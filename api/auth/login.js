import { handleLogin } from '../lib/authService.js';

export default async function handler(req, res) {
  return handleLogin(req, res);
}
