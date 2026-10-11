export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonMode = 'auto' | Season;
export const isSeasonMode = (value: unknown): value is SeasonMode => value === 'auto' || value === 'spring' || value === 'summer' || value === 'autumn' || value === 'winter';
export const SEASONS: Record<Season, { name: string; icon: string; months: string }> = {
  spring: { name: '봄', icon: '🌸', months: '3~5월' },
  summer: { name: '여름', icon: '🌿', months: '6~8월' },
  autumn: { name: '가을', icon: '🍁', months: '9~11월' },
  winter: { name: '겨울', icon: '❄️', months: '12~2월' },
};

/** Korea's three-month seasons use KST, even when the device is in another timezone. */
export function koreanSeason(timestamp: number): Season {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'spring';
  const month = new Date(timestamp + 9 * 60 * 60_000).getUTCMonth() + 1;
  return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter';
}
