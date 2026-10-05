// @ts-nocheck
// Re-export from api/lib/authService.js for local development
export {
  JWT_SECRET,
  createToken,
  verifyToken,
  serializeAuthCookie,
  serializeLogoutCookie,
  parseCookies,
  extractToken,
  setCorsHeaders,
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  updatePublicKey,
  handleRegister,
  handleLogin,
  handleMe,
  handleLogout,
  handleUpdateKey
} from '../../api/lib/authService.js';
