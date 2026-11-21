import { BANDS, categorize } from './aqi.js';
import { RULES } from './rules.js';

/** @typedef {import('./rules.js').Profile} Profile */

const resolve = (text, ctx) => (typeof text === 'function' ? text(ctx) : text);

/**
 * Children, older adults and people with lung conditions feel one AQI band worse,
 * but only once the air is no longer "Good".
 * @param {number} bandIndex index into BANDS
 * @param {boolean} vulnerable
 */
export function effectiveRisk(bandIndex, vulnerable) {
  return bandIndex + (vulnerable && bandIndex >= 1 ? 1 : 0);
}

function headlineFor(band, aqi, risk) {
  const guidance =
    risk >= 3
      ? 'Limit time outdoors today.'
      : risk === 2
        ? 'Sensitive people should reduce outdoor effort.'
        : 'Normal activity is fine; small habits still help.';
  return `${band.label} air (US AQI ${aqi}). ${guidance}`;
}

/**
 * Turns air quality plus a household profile into ranked, explained actions.
 * Pure and deterministic: the same inputs always give the same plan.
 * @param {{aqi: number}} air
 * @param {Profile} profile
 */
export function buildPlan({ aqi }, profile) {
  const band = categorize(aqi);
  const vulnerable = profile.children || profile.elderly || profile.respiratory;
  const risk = effectiveRisk(BANDS.indexOf(band), vulnerable);
  const ctx = { risk, profile };

  const actions = RULES.filter((rule) => rule.when(ctx))
    .map(({ id, priority, title, why, impact }) => ({
      id,
      priority,
      title: resolve(title, ctx),
      why,
      impact: resolve(impact, ctx),
    }))
    .sort((a, b) => a.priority - b.priority);

  return {
    band: { id: band.id, label: band.label, aqi },
    vulnerable,
    headline: headlineFor(band, aqi, risk),
    actions,
  };
}
