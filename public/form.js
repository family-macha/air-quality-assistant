export const FLAGS = ['children', 'elderly', 'respiratory', 'purifier', 'gasStove'];
export const CITY_MIN = 2;
export const CITY_MAX = 80;

/** Returns an error message for an invalid city, or '' when valid (mirrors server validation). */
export function cityError(city) {
  const length = city.trim().length;
  return length >= CITY_MIN && length <= CITY_MAX ? '' : `Enter a city name (${CITY_MIN}–${CITY_MAX} letters).`;
}

/** @param {{get: (name: string) => unknown}} data FormData or any object with get() */
export function buildRequest(data) {
  const body = { city: String(data.get('city') ?? '').trim(), commute: data.get('commute') };
  for (const flag of FLAGS) body[flag] = data.get(flag) === 'on';
  return body;
}
