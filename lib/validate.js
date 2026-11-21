export class ValidationError extends Error {}

export const COMMUTES = ['walk', 'cycle', 'two-wheeler', 'car', 'transit'];
const FLAGS = ['children', 'elderly', 'respiratory', 'purifier', 'gasStove'];
const CITY = /^[\p{L}\p{M}\s.,'-]{2,80}$/u;

/** Allow-list validation: only known fields survive; flags must be real booleans. */
export function parseRequest(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object.');
  }
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  if (!CITY.test(city)) throw new ValidationError('Enter a city name (2–80 letters).');
  const commute = body.commute ?? 'transit';
  if (!COMMUTES.includes(commute)) throw new ValidationError('Unknown commute type.');
  const profile = { commute };
  for (const flag of FLAGS) profile[flag] = body[flag] === true;
  return { city, profile };
}
