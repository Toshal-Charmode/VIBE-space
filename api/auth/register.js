import { handleRegister } from '../lib/authService.js';

export default async function handler(req, res) {
  return handleRegister(req, res);
}
