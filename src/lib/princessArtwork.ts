import original from './princessAtlas.json';
import revised from './princessUpperAtlas.json';

export type PrincessPart = keyof typeof original.parts | keyof typeof revised.parts;

/** Keep the proven dress/leg painting; use revised head, long hair and complete shoulder pieces. */
export function princessPart(part: PrincessPart) {
  const region = revised.parts[part as keyof typeof revised.parts];
  return region ? { region, width: revised.width, height: revised.height, source: '/characters/raster-v1/princess-upper-v2.webp' }
    : { region: original.parts[part as keyof typeof original.parts], width: original.width, height: original.height, source: '/characters/raster-v1/princess.webp' };
}
