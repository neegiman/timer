import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBackgroundMode, isCoordinates, sceneTheme, solarElevation } from '../src/lib/dayNight';

const seoul = { latitude: 37.5665, longitude: 126.978 };
const sanFrancisco = { latitude: 37.7749, longitude: -122.4194 };
const at = (utc: string) => Date.parse(utc);

test('location determines sunlight independently of the device timezone', () => {
  assert.equal(sceneTheme('auto', at('2026-03-20T03:00:00Z'), seoul), 'day');
  assert.equal(sceneTheme('auto', at('2026-03-20T03:00:00Z'), sanFrancisco), 'night');
  assert.equal(sceneTheme('auto', at('2026-03-20T15:00:00Z'), seoul), 'night');
  assert.equal(sceneTheme('auto', at('2026-03-20T15:00:00Z'), sanFrancisco), 'day');
  assert.equal(sceneTheme('auto', at('2026-03-20T12:00:00Z'), { latitude: 51.5074, longitude: -.1278 }), 'day');
  assert.equal(sceneTheme('auto', at('2026-03-20T12:00:00Z'), { latitude: -33.8688, longitude: 151.2093 }), 'night');
});

test('seasonal daylight and polar day/night use solar position, not fixed clock hours', () => {
  // The same Seoul local time (19:00) is still daylight in June, dark in December.
  assert.equal(sceneTheme('auto', at('2026-06-21T10:00:00Z'), seoul), 'day');
  assert.equal(sceneTheme('auto', at('2026-12-21T10:00:00Z'), seoul), 'night');
  const arctic = { latitude: 78, longitude: 15 };
  assert.equal(sceneTheme('auto', at('2026-06-21T00:00:00Z'), arctic), 'day');
  assert.equal(sceneTheme('auto', at('2026-12-21T12:00:00Z'), arctic), 'night');
});

test('solar angle remains finite on leap day and date/longitude boundaries', () => {
  for (const timestamp of ['2028-02-29T12:00:00Z', '2026-12-31T23:59:59Z', '2027-01-01T00:00:00Z']) {
    for (const latitude of [-90, 0, 90]) for (const longitude of [-180, 0, 180]) {
      const elevation = solarElevation(at(timestamp), { latitude, longitude });
      assert.ok(Number.isFinite(elevation) && elevation >= -90 && elevation <= 90);
    }
  }
  assert.ok(solarElevation(at('2026-03-20T12:00:00Z'), { latitude: 0, longitude: 0 }) > 85);
});

test('without coordinates, local clock day is 06:00 through 17:59', () => {
  for (const [hour, minute, expected] of [[5, 59, 'night'], [6, 0, 'day'], [17, 59, 'day'], [18, 0, 'night'], [23, 59, 'night']] as const) {
    assert.equal(sceneTheme('auto', new Date(2026, 9, 9, hour, minute).getTime(), null), expected);
  }
  assert.equal(sceneTheme('auto', 0, null), 'day');
  assert.equal(sceneTheme('auto', NaN, seoul), 'day');
});

test('manual choice overrides both clock and location; persisted preferences are validated', () => {
  assert.equal(sceneTheme('day', at('2026-03-20T15:00:00Z'), seoul), 'day');
  assert.equal(sceneTheme('night', at('2026-03-20T03:00:00Z'), seoul), 'night');
  for (const mode of ['auto', 'day', 'night']) assert.equal(isBackgroundMode(mode), true);
  for (const mode of [null, 'moon', {}, 1]) assert.equal(isBackgroundMode(mode), false);
  assert.equal(isCoordinates(seoul), true);
  for (const point of [null, {}, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: 181 }, { latitude: NaN, longitude: 0 }, { latitude: 0, longitude: Infinity }]) assert.equal(isCoordinates(point), false);
});
