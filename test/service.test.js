import test from 'node:test';
import assert from 'node:assert/strict';
import { createService } from '../lib/service.js';
import { createLimiter } from '../lib/ratelimit.js';
import { NotFoundError } from '../lib/airdata.js';

const validBody = { city: 'Delhi', commute: 'car', children: true };
const air = { place: 'Delhi, India', aqi: 220, pm25: 140 };

function setup(overrides = {}) {
  const calls = { air: 0, logs: [] };
  const handle = createService({
    getAir: async () => {
      calls.air += 1;
      return air;
    },
    summarize: async () => null,
    limiter: createLimiter(100),
    log: (...args) => calls.logs.push(args),
    ...overrides,
  });
  return { handle, calls };
}

test('rejects non-POST with an Allow header', async () => {
  const { handle } = setup();
  const res = await handle({ method: 'GET', ip: '1.1.1.1', body: undefined });
  assert.equal(res.status, 405);
  assert.equal(res.headers.Allow, 'POST');
});

test('rate limits per client', async () => {
  const { handle } = setup({ limiter: createLimiter(1) });
  assert.equal((await handle({ method: 'POST', ip: 'a', body: validBody })).status, 200);
  assert.equal((await handle({ method: 'POST', ip: 'a', body: validBody })).status, 429);
  assert.equal((await handle({ method: 'POST', ip: 'b', body: validBody })).status, 200);
});

test('invalid input returns 400 and never reaches upstream services', async () => {
  const { handle, calls } = setup();
  const res = await handle({ method: 'POST', ip: 'a', body: { city: '<script>' } });
  assert.equal(res.status, 400);
  assert.equal(calls.air, 0);
});

test('unknown city returns 404', async () => {
  const { handle } = setup({ getAir: async () => { throw new NotFoundError('City not found.'); } });
  assert.equal((await handle({ method: 'POST', ip: 'a', body: validBody })).status, 404);
});

test('unexpected failure returns a generic 502 and logs only the error name', async () => {
  const { handle, calls } = setup({ getAir: async () => { throw new TypeError('secret internal detail'); } });
  const res = await handle({ method: 'POST', ip: 'a', body: validBody });
  assert.equal(res.status, 502);
  assert.ok(!JSON.stringify(res.body).includes('secret'));
  assert.deepEqual(calls.logs, [['advice failed:', 'TypeError']]);
});

test('success returns the plan, place and optional AI summary', async () => {
  const { handle } = setup({ summarize: async ({ band }) => `Summary for ${band.id}` });
  const res = await handle({ method: 'POST', ip: 'a', body: validBody });
  assert.equal(res.status, 200);
  assert.equal(res.body.place, 'Delhi, India');
  assert.equal(res.body.aiSummary, 'Summary for very-unhealthy');
  assert.ok(res.body.actions.some((a) => a.id === 'mask'));
});
