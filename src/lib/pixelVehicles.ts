import type { CharacterAction } from '../types/animation';
import { groundDistance } from './journey';

export const PIXEL_VEHICLES = ['car', 'train', 'rocket'] as const;
export type PixelVehicleId = typeof PIXEL_VEHICLES[number];
export const VEHICLE_SHEET = { columns: 7, rows: 2, frameWidth: 160, frameHeight: 210, frames: 14, movingFrames: 8 };
export const vehicleMotion = {
  car: { cycleMs: 900, groundY: 197, name: '자동차' },
  train: { cycleMs: 1000, groundY: 197, name: '기차' },
  rocket: { cycleMs: 1200, groundY: 210, name: '로켓' },
} as const;
export function isPixelVehicle(id: string): id is PixelVehicleId { return PIXEL_VEHICLES.some((vehicle) => vehicle === id); }
export function vehicleAsset(id: PixelVehicleId) { return `/characters/pixel-v1/${id}.svg`; }

/** Wheel circumference and scenery share one elapsed clock; rocket exhaust uses its flight cycle. */
export function vehicleFrame(id: PixelVehicleId, action: CharacterAction, elapsed: number, reduced = false) {
  if (reduced) return 0;
  const time = Math.max(0, elapsed), profile = vehicleMotion[id];
  if (['walk', 'fastWalk', 'run', 'sprint'].includes(action)) {
    const cycle = id === 'rocket' ? time / profile.cycleMs : groundDistance(time, profile.cycleMs) / (2 * Math.PI * 16);
    return 1 + Math.floor(cycle * VEHICLE_SHEET.movingFrames) % VEHICLE_SHEET.movingFrames;
  }
  if (action === 'jump' || action === 'hop') return 9;
  if (action === 'land') return 10;
  if (action === 'celebrate') return 11 + Math.floor(time / 300) % 3;
  return 0;
}
export function vehicleViewBox(frame: number) {
  const index = Math.max(0, Math.min(VEHICLE_SHEET.frames - 1, Math.floor(frame)));
  return `${index % VEHICLE_SHEET.columns * VEHICLE_SHEET.frameWidth} ${Math.floor(index / VEHICLE_SHEET.columns) * VEHICLE_SHEET.frameHeight} ${VEHICLE_SHEET.frameWidth} ${VEHICLE_SHEET.frameHeight}`;
}
