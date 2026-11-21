import test from 'node:test';
import assert from 'node:assert/strict';
import { categorize } from '../lib/aqi.js';
import { parseRequest, ValidationError } from '../lib/validate.js';
import { buildPlan } from '../lib/advice.js';
import { getAirQuality, NotFoundError } from '../lib/airdata.js';
import { narrate } from '../lib/gemini.js';
import { createLimiter } from '../lib/ratelimit.js';

const base = { children: false, elderly: false, respiratory: false, purifier: false, gasStove: false, commute: 'transit' };
const ids = (aqi, p = {}) => buildPlan({ aqi }, { ...base, ...p }).actions.map((a) => a.id);

test('categorize handles band boundaries and rejects bad input', () => {
  assert.equal(categorize(50).id, 'good');
  assert.equal(categorize(51).id, 'moderate');
  assert.equal(categorize(301).id, 'hazardous');
  for (const bad of [-1, NaN, Infinity]) assert.throws(() => categorize(bad), RangeError);
});

test('parseRequest accepts valid input and enforces booleans', () => {
  const { city, profile } = parseRequest({ city: ' New Delhi ', children: 'true', purifier: true });
  assert.equal(city, 'New Delhi');
  assert.equal(profile.children, false);
  assert.equal(profile.purifier, true);
  assert.equal(profile.commute, 'transit');
});

test('parseRequest rejects injection, bad commute and non-objects', () => {
  for (const body of [null, [], 'x', { city: '<script>alert(1)</script>' }, { city: 'A' }, { city: 'Delhi', commute: 'jetpack' }]) {
    assert.throws(() => parseRequest(body), ValidationError);
  }
});

test('good air: ventilate, no mask', () => {
  assert.ok(ids(30).includes('ventilate'));
  assert.ok(!ids(30).includes('mask'));
});

test('vulnerable households are treated one band worse', () => {
  assert.ok(!ids(120).includes('mask'));
  assert.ok(ids(120, { children: true }).includes('mask'));
});

test('severe smog: mask first, windows closed, profile-specific actions', () => {
  const plan = buildPlan({ aqi: 320 }, { ...base, commute: 'car', gasStove: true });
  assert.equal(plan.band.id, 'hazardous');
  const found = plan.actions.map((a) => a.id);
  for (const id of ['mask', 'windows', 'commute', 'cooking', 'purifier']) assert.ok(found.includes(id));
  assert.ok(plan.actions.every((a) => a.why && a.impact), 'every action explains why and impact');
});

const fakeFetch = (geo, air) => async (url) => ({ ok: true, json: async () => (url.includes('geocoding') ? geo : air) });

test('getAirQuality combines geocode and AQI', async () => {
  const f = fakeFetch({ results: [{ name: 'Delhi', country: 'India', latitude: 28.6, longitude: 77.2 }] }, { current: { us_aqi: 211.6, pm2_5: 150 } });
  assert.deepEqual(await getAirQuality('Delhi Testville', { fetchImpl: f }), { place: 'Delhi, India', aqi: 212, pm25: 150 });
});

test('getAirQuality maps unknown city and upstream failure', async () => {
  await assert.rejects(getAirQuality('Nowhere Land', { fetchImpl: fakeFetch({}, {}) }), NotFoundError);
  await assert.rejects(getAirQuality('Broken City', { fetchImpl: async () => ({ ok: false, status: 500 }) }), /Upstream/);
});

test('narrate is optional and fails closed', async () => {
  const input = { place: 'Delhi', aqi: 200, band: { label: 'Unhealthy' }, actions: [{ title: 'Wear N95' }] };
  assert.equal(await narrate(input, { key: '' }), null);
  assert.equal(await narrate(input, { key: 'k', fetchImpl: async () => { throw new Error('down'); } }), null);
  const ok = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: ' Stay in. ' }] } }] }) });
  assert.equal(await narrate(input, { key: 'k', fetchImpl: ok }), 'Stay in.');
});

test('rate limiter blocks bursts and resets after the window', () => {
  let t = 0;
  const limiter = createLimiter(2, 1000, () => t);
  assert.deepEqual([limiter.allow('a'), limiter.allow('a'), limiter.allow('a')], [true, true, false]);
  t = 1000;
  assert.equal(limiter.allow('a'), true);
});
