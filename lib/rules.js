/**
 * Declarative advice rules. Each rule is data: when it applies, how important it is,
 * and the WHAT / WHY / IMPACT shown to the user. Add or tune advice here without touching logic.
 *
 * @typedef {Object} Profile
 * @property {'walk'|'cycle'|'two-wheeler'|'car'|'transit'} commute
 * @property {boolean} children
 * @property {boolean} elderly
 * @property {boolean} respiratory
 * @property {boolean} purifier
 * @property {boolean} gasStove
 *
 * @typedef {Object} Context
 * @property {number} risk     Effective risk level 0-5 (AQI band, plus one for vulnerable households).
 * @property {Profile} profile
 *
 * @typedef {string | ((ctx: Context) => string)} Text
 * @typedef {Object} Rule
 * @property {string} id
 * @property {number} priority  1 = most important.
 * @property {(ctx: Context) => boolean} when
 * @property {Text} title
 * @property {string} why
 * @property {Text} impact
 */

/** Approximate tailpipe emissions of an average petrol car (kg CO2 per km). */
const CO2_KG_PER_KM = 0.17;
const SAMPLE_TRIP_KM = 10;

/** Risk thresholds (see buildPlan): 1 moderate, 2 sensitive groups, 3 unhealthy. */
const RISK = Object.freeze({ MODERATE: 1, ELEVATED: 2, HIGH: 3 });

const isMotorised = ({ profile }) => profile.commute === 'car' || profile.commute === 'two-wheeler';
const isActiveTravel = ({ profile }) => profile.commute === 'walk' || profile.commute === 'cycle';
const isCar = ({ profile }) => profile.commute === 'car';

/** @type {readonly Rule[]} Order matters only as a tie-breaker between equal priorities. */
export const RULES = Object.freeze([
  {
    id: 'ventilate',
    priority: 1,
    when: ({ risk }) => risk <= RISK.MODERATE,
    title: 'Open windows for 10–15 minutes',
    why: 'Outdoor air is cleaner than stale indoor air, so airing out dilutes indoor pollutants.',
    impact: 'Lowers indoor CO₂ and cooking fumes.',
  },
  {
    id: 'commute',
    priority: 2,
    when: (ctx) => ctx.risk <= RISK.MODERATE && isMotorised(ctx),
    title: 'Walk, cycle or take transit for short trips',
    why: `Road traffic is a major urban PM2.5 and NOx source; a car emits roughly ${CO2_KG_PER_KM} kg CO₂ per km.`,
    impact: `A ${SAMPLE_TRIP_KM} km trip avoided saves about ${(CO2_KG_PER_KM * SAMPLE_TRIP_KM).toFixed(1)} kg CO₂.`,
  },
  {
    id: 'windows',
    priority: 1,
    when: ({ risk }) => risk >= RISK.ELEVATED,
    title: 'Keep windows closed; air out only when the hourly AQI dips',
    why: 'In winter smog, temperature inversions trap pollution near the ground, so open windows bring it indoors.',
    impact: 'Prevents indoor PM2.5 rising toward outdoor levels.',
  },
  {
    id: 'mask',
    priority: 1,
    when: ({ risk }) => risk >= RISK.HIGH,
    title: 'Wear a well-fitted N95/FFP2 mask outdoors',
    why: 'Certified N95 filters at least 95% of fine particles when sealed; cloth and loose surgical masks filter far less.',
    impact: 'Cuts inhaled PM2.5 by up to ~90% with a good fit.',
  },
  {
    id: 'exercise',
    priority: 2,
    when: ({ risk }) => risk >= RISK.ELEVATED,
    title: 'Move exercise and play indoors',
    why: 'Breathing faster during exercise draws in several times more polluted air per minute.',
    impact: 'Avoids the largest single dose of the day.',
  },
  {
    id: 'purifier',
    priority: 3,
    when: ({ risk }) => risk >= RISK.ELEVATED,
    title: ({ profile }) =>
      profile.purifier
        ? 'Run your purifier on auto in the room you use most, door closed'
        : 'Build a low-cost Corsi–Rosenthal box (box fan + 4 HVAC filters)',
    why: 'HEPA filtration removes fine particles; a smaller sealed room is cleaned faster.',
    impact: 'Studies report roughly 50–80% lower indoor PM2.5.',
  },
  {
    id: 'commute',
    priority: 2,
    when: (ctx) => ctx.risk >= RISK.ELEVATED && isMotorised(ctx),
    title: (ctx) => (isCar(ctx) ? 'Carpool or switch to transit this week' : 'Wear an N95 and avoid congested corridors'),
    why: 'Vehicle exhaust adds to smog, and exposure is highest inside traffic.',
    impact: (ctx) =>
      isCar(ctx)
        ? `Each car removed from the road avoids ~${CO2_KG_PER_KM} kg CO₂ per km.`
        : 'Lowers your exposure on the busiest roads.',
  },
  {
    id: 'route',
    priority: 2,
    when: (ctx) => ctx.risk >= RISK.ELEVATED && isActiveTravel(ctx),
    title: 'Take side streets or parks, and avoid rush hour',
    why: 'PM2.5 is highest next to heavy traffic; even one block away is lower.',
    impact: 'Often 20–40% lower exposure than main roads.',
  },
  {
    id: 'cooking',
    priority: 3,
    when: ({ risk, profile }) => risk >= RISK.MODERATE && profile.gasStove,
    title: 'Use the exhaust hood vented outside; consider induction cooking',
    why: 'Gas and biomass cooking release PM2.5 and NO₂ indoors, so ventilating at the source helps.',
    impact: 'Removes a major indoor source; induction produces no combustion fumes.',
  },
  {
    id: 'community',
    priority: 4,
    when: ({ risk }) => risk >= RISK.ELEVATED,
    title: 'Never burn leaves, waste or wood; report open burning',
    why: 'Open burning is a local source that adds to winter smog for the whole neighbourhood.',
    impact: 'Less local PM2.5 for your street and your children.',
  },
]);
