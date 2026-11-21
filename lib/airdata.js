export class NotFoundError extends Error {}

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const TTL_MS = 10 * 60 * 1000;
const cache = new Map(); // city -> {at, value}; keeps upstream calls and latency low

async function getJson(url, fetchImpl, timeoutMs) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Upstream error ${res.status}`);
  return res.json();
}

/** Geocode a city, then read current US AQI and PM2.5 (Open-Meteo: free, no API key). */
export async function getAirQuality(city, { fetchImpl = fetch, timeoutMs = 5000, now = Date.now } = {}) {
  const key = city.toLowerCase();
  const hit = cache.get(key);
  if (hit && now() - hit.at < TTL_MS) return hit.value;

  const geo = await getJson(`${GEO}?name=${encodeURIComponent(city)}&count=1&language=en`, fetchImpl, timeoutMs);
  const place = geo.results?.[0];
  if (!place) throw new NotFoundError('City not found. Try a nearby larger city.');
  const url = `${AIR}?latitude=${place.latitude}&longitude=${place.longitude}&current=us_aqi,pm2_5&timezone=auto`;
  const air = await getJson(url, fetchImpl, timeoutMs);
  const aqi = air.current?.us_aqi;
  if (!Number.isFinite(aqi)) throw new Error('No air quality reading available');

  const value = { place: [place.name, place.country].filter(Boolean).join(', '), aqi: Math.round(aqi), pm25: air.current.pm2_5 ?? null };
  cache.set(key, { at: now(), value });
  return value;
}
