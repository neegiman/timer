export type SceneTheme = 'day' | 'night';
export type BackgroundMode = 'auto' | SceneTheme;
export interface SceneCoordinates { latitude: number; longitude: number }

export const isBackgroundMode = (value: unknown): value is BackgroundMode => value === 'auto' || value === 'day' || value === 'night';
export function isCoordinates(value: unknown): value is SceneCoordinates {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<SceneCoordinates>;
  return typeof point.latitude === 'number' && Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 90 &&
    typeof point.longitude === 'number' && Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}

/** NOAA's fractional-year solar position equations, evaluated in UTC.
 * https://gml.noaa.gov/grad/solcalc/solareqns.PDF
 * No timezone lookup, weather service, network request or stored GPS position is needed.
 */
export function solarElevation(timestamp: number, point: SceneCoordinates): number {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const daysInYear = (Date.UTC(year + 1, 0, 1) - start) / 86_400_000;
  const fractionalDay = (timestamp - start) / 86_400_000;
  const gamma = 2 * Math.PI / daysInYear * (fractionalDay - .5);
  const equationOfTime = 229.18 * (.000075 + .001868 * Math.cos(gamma) - .032077 * Math.sin(gamma)
    - .014615 * Math.cos(2 * gamma) - .040849 * Math.sin(2 * gamma));
  const declination = .006918 - .399912 * Math.cos(gamma) + .070257 * Math.sin(gamma)
    - .006758 * Math.cos(2 * gamma) + .000907 * Math.sin(2 * gamma)
    - .002697 * Math.cos(3 * gamma) + .00148 * Math.sin(3 * gamma);
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 60_000;
  const solarMinutes = ((utcMinutes + equationOfTime + 4 * point.longitude) % 1440 + 1440) % 1440;
  const hourAngle = (solarMinutes / 4 - 180) * Math.PI / 180;
  const latitude = point.latitude * Math.PI / 180;
  const sineAltitude = Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sineAltitude))) * 180 / Math.PI;
}

export function sceneTheme(mode: BackgroundMode, timestamp: number, coordinates: SceneCoordinates | null): SceneTheme {
  if (mode !== 'auto') return mode;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'day'; // Stable static-export hydration.
  if (isCoordinates(coordinates)) return solarElevation(timestamp, coordinates) >= -.833 ? 'day' : 'night';
  const hour = new Date(timestamp).getHours();
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}
