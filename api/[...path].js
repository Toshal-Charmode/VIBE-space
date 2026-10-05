import { app } from './lib/app.js';

export default async function handler(req, res) {
  return app(req, res);
}
