import { parseRequest, ValidationError } from '../lib/validate.js';
import { getAirQuality, NotFoundError } from '../lib/airdata.js';
import { buildPlan } from '../lib/advice.js';
import { narrate } from '../lib/gemini.js';
import { createLimiter } from '../lib/ratelimit.js';

const limiter = createLimiter();
const send = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';
  if (!limiter.allow(ip)) return send(res, 429, { error: 'Too many requests. Try again in a minute.' });
  try {
    const { city, profile } = parseRequest(req.body);
    const air = await getAirQuality(city);
    const plan = buildPlan(air, profile);
    const aiSummary = await narrate({ place: air.place, aqi: air.aqi, band: plan.band, actions: plan.actions });
    return send(res, 200, { place: air.place, pm25: air.pm25, ...plan, aiSummary });
  } catch (err) {
    if (err instanceof ValidationError) return send(res, 400, { error: err.message });
    if (err instanceof NotFoundError) return send(res, 404, { error: err.message });
    console.error('advice failed:', err.name); // no user data or stack in logs/responses
    return send(res, 502, { error: 'Air quality data is unavailable right now. Please retry shortly.' });
  }
}
