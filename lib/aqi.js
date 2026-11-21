/** US EPA AQI bands, ordered by severity. */
export const BANDS = [
  { max: 50, id: 'good', label: 'Good' },
  { max: 100, id: 'moderate', label: 'Moderate' },
  { max: 150, id: 'sensitive', label: 'Unhealthy for sensitive groups' },
  { max: 200, id: 'unhealthy', label: 'Unhealthy' },
  { max: 300, id: 'very-unhealthy', label: 'Very unhealthy' },
  { max: Infinity, id: 'hazardous', label: 'Hazardous' },
];

/** @param {number} aqi non-negative US AQI @returns {{max:number,id:string,label:string}} */
export function categorize(aqi) {
  if (!Number.isFinite(aqi) || aqi < 0) throw new RangeError('AQI must be a non-negative number');
  return BANDS.find((band) => aqi <= band.max);
}
