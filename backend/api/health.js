import { app } from '../server.js';

export default function handler(req, res) {
  if (req.url.startsWith('/api/health')) {
    req.url = req.url.replace('/api/health', '/health') || '/health';
  }
  return app(req, res);
}
