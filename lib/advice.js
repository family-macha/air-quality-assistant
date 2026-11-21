import { categorize, BANDS } from './aqi.js';

/**
 * Deterministic rule engine: turns air quality + household profile into ranked actions.
 * Each action says WHAT to do, WHY it works, and its expected IMPACT (approximate, literature-based).
 * @param {{aqi:number}} air
 * @param {{children:boolean,elderly:boolean,respiratory:boolean,purifier:boolean,gasStove:boolean,commute:string}} p
 */
export function buildPlan({ aqi }, p) {
  const band = categorize(aqi);
  const level = BANDS.indexOf(band);
  const vulnerable = p.children || p.elderly || p.respiratory;
  const risk = level + (vulnerable && level >= 1 ? 1 : 0); // children, elders, lung conditions feel one band worse
  const actions = [];
  const add = (priority, id, title, why, impact) => actions.push({ priority, id, title, why, impact });

  if (risk <= 1) {
    add(1, 'ventilate', 'Open windows for 10–15 minutes', 'Outdoor air is cleaner than stale indoor air, so airing out dilutes indoor pollutants.', 'Lowers indoor CO₂ and cooking fumes.');
    if (['car', 'two-wheeler'].includes(p.commute)) add(2, 'commute', 'Walk, cycle or take transit for short trips', 'Road traffic is a major urban PM2.5 and NOx source; a car emits roughly 0.17 kg CO₂ per km.', 'A 10 km trip avoided saves about 1.7 kg CO₂.');
  }
  if (risk >= 2) add(1, 'windows', 'Keep windows closed; air out only when the hourly AQI dips', 'In winter smog, temperature inversions trap pollution near the ground, so open windows bring it indoors.', 'Prevents indoor PM2.5 rising toward outdoor levels.');
  if (risk >= 3) add(1, 'mask', 'Wear a well-fitted N95/FFP2 mask outdoors', 'Certified N95 filters at least 95% of fine particles when sealed; cloth and loose surgical masks filter far less.', 'Cuts inhaled PM2.5 by up to ~90% with a good fit.');
  if (risk >= 2) add(2, 'exercise', 'Move exercise and play indoors', 'Breathing faster during exercise draws in several times more polluted air per minute.', 'Avoids the largest single dose of the day.');
  if (risk >= 2) add(3, 'purifier', p.purifier ? 'Run your purifier on auto in the room you use most, door closed' : 'Build a low-cost Corsi–Rosenthal box (box fan + 4 HVAC filters)', 'HEPA filtration removes fine particles; a smaller sealed room is cleaned faster.', 'Studies report roughly 50–80% lower indoor PM2.5.');
  if (risk >= 2 && ['car', 'two-wheeler'].includes(p.commute)) add(2, 'commute', p.commute === 'car' ? 'Carpool or switch to transit this week' : 'Wear an N95 and avoid congested corridors', 'Vehicle exhaust adds to smog, and exposure is highest inside traffic.', p.commute === 'car' ? 'Each car removed from the road avoids ~0.17 kg CO₂ per km.' : 'Lowers your exposure on the busiest roads.');
  if (risk >= 2 && ['walk', 'cycle'].includes(p.commute)) add(2, 'route', 'Take side streets or parks, and avoid rush hour', 'PM2.5 is highest next to heavy traffic; even one block away is lower.', 'Often 20–40% lower exposure than main roads.');
  if (risk >= 1 && p.gasStove) add(3, 'cooking', 'Use the exhaust hood vented outside; consider induction cooking', 'Gas and biomass cooking release PM2.5 and NO₂ indoors, so ventilating at the source helps.', 'Removes a major indoor source; induction produces no combustion fumes.');
  if (risk >= 2) add(4, 'community', 'Never burn leaves, waste or wood; report open burning', 'Open burning is a local source that adds to winter smog for the whole neighbourhood.', 'Less local PM2.5 for your street and your children.');

  actions.sort((a, b) => a.priority - b.priority);
  const headline = `${band.label} air (US AQI ${aqi}). ${risk >= 3 ? 'Limit time outdoors today.' : risk === 2 ? 'Sensitive people should reduce outdoor effort.' : 'Normal activity is fine; small habits still help.'}`;
  return { band: { id: band.id, label: band.label, aqi }, vulnerable, headline, actions };
}
