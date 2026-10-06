export const BASE_PATH = '/timer';
export const PRODUCTION_URL = 'https://neegiman.github.io/timer/';

/** All public assets are resolved beneath the fixed GitHub Pages repository path. */
export function assetPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}
