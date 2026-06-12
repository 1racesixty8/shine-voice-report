import { app } from '../server.js';

export default function handler(req, res) {
  if (req.url.startsWith('/api/vapi-webhook')) {
    req.url = req.url.replace('/api/vapi-webhook', '/vapi-webhook') || '/vapi-webhook';
  }
  return app(req, res);
}
