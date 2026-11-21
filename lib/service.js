import { buildPlan } from './advice.js';
import { getAirQuality, NotFoundError } from './airdata.js';
import { narrate } from './gemini.js';
import { createLimiter } from './ratelimit.js';
import { parseRequest, ValidationError } from './validate.js';

/**
 * @typedef {Object} ServiceResponse
 * @property {number} status
 * @property {object} body
 * @property {Record<string, string>} [headers]
 */

/**
 * Builds the request handler with every dependency injectable, so the full
 * request flow is testable without HTTP, network, or API keys.
 */
export function createService({
  getAir = getAirQuality,
  summarize = narrate,
  limiter = createLimiter(),
  log = console.error,
} = {}) {
  /** @param {{method?: string, ip: string, body: unknown}} request @returns {Promise<ServiceResponse>} */
  return async function handle({ method, ip, body }) {
    if (method !== 'POST') {
      return { status: 405, headers: { Allow: 'POST' }, body: { error: 'Use POST.' } };
    }
    if (!limiter.allow(ip)) {
      return { status: 429, body: { error: 'Too many requests. Try again in a minute.' } };
    }
    try {
      const { city, profile } = parseRequest(body);
      const air = await getAir(city);
      const plan = buildPlan(air, profile);
      const aiSummary = await summarize({ place: air.place, aqi: air.aqi, band: plan.band, actions: plan.actions });
      return { status: 200, body: { place: air.place, pm25: air.pm25, ...plan, aiSummary } };
    } catch (err) {
      if (err instanceof ValidationError) return { status: 400, body: { error: err.message } };
      if (err instanceof NotFoundError) return { status: 404, body: { error: err.message } };
      log('advice failed:', err?.name); // name only: no user data or stack in logs or responses
      return { status: 502, body: { error: 'Air quality data is unavailable right now. Please retry shortly.' } };
    }
  };
}
