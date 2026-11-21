import test from 'node:test';
import assert from 'node:assert/strict';
import { BANDS, categorize } from '../lib/aqi.js';
import { buildPlan, effectiveRisk } from '../lib/advice.js';
import { COMMUTES } from '../lib/validate.js';

const FLAGS = ['children', 'elderly', 'respiratory', 'purifier', 'gasStove'];
const AQI_SAMPLES = [0, 25, 50, 51, 100, 101, 150, 151, 200, 201, 300, 301, 500];

/** Every combination of AQI x commute x 5 boolean flags (2,080 profiles). */
function* allScenarios() {
  for (const aqi of AQI_SAMPLES) {
    for (const commute of COMMUTES) {
      for (let mask = 0; mask < 2 ** FLAGS.length; mask += 1) {
        const profile = { commute };
        FLAGS.forEach((flag, i) => { profile[flag] = Boolean(mask & (1 << i)); });
        yield { aqi, profile };
      }
    }
  }
}

test('effectiveRisk only bumps vulnerable households above "Good"', () => {
  assert.equal(effectiveRisk(0, true), 0);
  assert.equal(effectiveRisk(1, true), 2);
  assert.equal(effectiveRisk(1, false), 1);
});

test('every scenario yields a well-formed, ordered, explained plan', () => {
  for (const { aqi, profile } of allScenarios()) {
    const plan = buildPlan({ aqi }, profile);
    const where = JSON.stringify({ aqi, profile });
    assert.ok(plan.actions.length >= 1, `no actions: ${where}`);
    for (const a of plan.actions) {
      assert.ok(a.title && a.why && a.impact, `incomplete action ${a.id}: ${where}`);
    }
    const priorities = plan.actions.map((a) => a.priority);
    assert.deepEqual(priorities, [...priorities].sort((x, y) => x - y), `unsorted: ${where}`);
    const ids = plan.actions.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${where}`);
  }
});

test('mask and closed-window advice follow the risk thresholds exactly', () => {
  for (const { aqi, profile } of allScenarios()) {
    const vulnerable = profile.children || profile.elderly || profile.respiratory;
    const risk = effectiveRisk(BANDS.indexOf(categorize(aqi)), vulnerable);
    const ids = buildPlan({ aqi }, profile).actions.map((a) => a.id);
    assert.equal(ids.includes('mask'), risk >= 3);
    assert.equal(ids.includes('windows'), risk >= 2);
    assert.equal(ids.includes('ventilate'), risk <= 1);
  }
});

test('worsening air never removes protective advice', () => {
  const profile = { commute: 'transit', children: false, elderly: false, respiratory: false, purifier: false, gasStove: false };
  let hadMask = false;
  for (const aqi of AQI_SAMPLES) {
    const hasMask = buildPlan({ aqi }, profile).actions.some((a) => a.id === 'mask');
    assert.ok(hasMask || !hadMask, `mask disappeared at AQI ${aqi}`);
    hadMask = hasMask;
  }
});

test('profile changes wording, not just the list', () => {
  const base = { commute: 'car', children: false, elderly: false, respiratory: false, gasStove: false };
  const title = (purifier) =>
    buildPlan({ aqi: 160 }, { ...base, purifier }).actions.find((a) => a.id === 'purifier').title;
  assert.notEqual(title(true), title(false));
});
