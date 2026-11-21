import { createService } from '../lib/service.js';

const handle = createService();

/** First hop of x-forwarded-for, set by Vercel's edge; falls back to a shared bucket. */
const clientIp = (headers) => String(headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';

/** Thin Vercel adapter: all behaviour lives in lib/service.js. */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { status, headers = {}, body } = await handle({ method: req.method, ip: clientIp(req.headers), body: req.body });
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.status(status).json(body);
}
