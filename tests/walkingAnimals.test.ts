import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import atlases from '../src/lib/animalAtlases.json';
import { walkingAnatomy } from '../src/lib/walkingAnatomy';
import { animalPose, animalProfiles, walkingFootPitch } from '../src/lib/animalMotion';
import { characters, getCharacter } from '../src/lib/characters';
import { advanceSession } from '../src/lib/timer';
import type { TimerSession } from '../src/types/timer';

test('dog and cat paintings keep native proportions and bury limb and ear roots in fur', async () => {
  for (const id of ['dog', 'cat'] as const) {
    const anatomy = walkingAnatomy[id], atlas = atlases[id];
    const { data, info } = await sharp(`public/characters/raster-v1/${id}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alpha = (part: keyof typeof atlas.parts, x: number, y: number) => {
      const [left, top] = atlas.parts[part];
      return data[((top + Math.round(y)) * info.width + left + Math.round(x)) * 4 + 3];
    };
    for (const part of ['torso', 'head', 'earNear', 'earFar'] as const) {
      const bounds = anatomy[part], region = atlas.parts[part];
      assert.ok(Math.abs(bounds.width / bounds.height - region[2] / region[3]) < .001, `${id}/${part} stretched`);
    }
    for (const [paw, root] of Object.entries(anatomy.paws)) {
      const torso = anatomy.torso, [, , w, h] = atlas.parts.torso;
      for (const dx of [-3, 0, 3]) for (const dy of [-3, 0, 3]) {
        assert.ok(alpha('torso', (root.x + dx - torso.x) / torso.width * w, (root.y + dy - torso.y) / torso.height * h) >= 240, `${id}/${paw} socket outside torso`);
      }
    }
    for (const side of ['hind', 'fore'] as const) {
      const art = anatomy[side === 'hind' ? 'hindArtwork' : 'foreArtwork'];
      for (const [part, points] of [
        [`${side}Upper`, [art.upper.pivot, art.upper.tip]],
        [`${side}Lower`, [art.lower.pivot, art.lower.tip]],
        [`${side}Paw`, [art.paw.pivot, art.paw.sole]],
      ] as const) for (const point of points) for (const dx of [-2, 0, 2]) for (const dy of [-2, 0, 2]) {
        assert.ok(alpha(part, point.x + dx, point.y + dy) >= 160, `${id}/${part} landmark outside paint at ${point.x},${point.y}`);
      }
    }
    for (const part of ['earNear', 'earFar'] as const) {
      const ear = anatomy[part], head = anatomy.head, [, , w, h] = atlas.parts.head;
      for (const dx of [-2, 0, 2]) for (const dy of [-2, 0, 2]) {
        assert.ok(alpha(part, ear.sourceRoot.x + dx, ear.sourceRoot.y + dy) >= 240, `${id}/${part} source pivot outside ear`);
        assert.ok(alpha('head', (ear.anchorX + dx - head.x) / head.width * w, (ear.anchorY + dy - head.y) / head.height * h) >= 240, `${id}/${part} root outside head`);
      }
    }
  }
});

test('walking ankles roll at push-off without flipping knees or discontinuities', () => {
  for (const id of ['dog', 'cat'] as const) {
    const profile = animalProfiles[id];
    for (const hind of [true, false]) {
      assert.ok(walkingFootPitch(profile.support * .95, profile.support, hind) > 8);
      assert.ok(walkingFootPitch(profile.support + (1 - profile.support) * .35, profile.support, hind) < -12);
      for (const boundary of [0, profile.support, profile.support + (1 - profile.support) * .35, 1]) {
        assert.ok(Math.abs(walkingFootPitch(boundary - .000001, profile.support, hind) - walkingFootPitch(boundary + .000001, profile.support, hind)) < .001);
      }
    }
    for (let sample = 0; sample < 400; sample++) {
      const pose = animalPose(id, profile.cycleMs * sample / 400);
      for (const [paw, rig] of Object.entries(profile.paws)) {
        assert.ok(pose.joints[`${paw as keyof typeof profile.paws}Knee`] * rig.bend > 0);
      }
    }
  }
});

test('removed bear falls back to rabbit without resetting a running or paused journey', () => {
  assert.equal(characters.some((character) => character.id === 'bear'), false);
  assert.equal(getCharacter('bear').id, 'rabbit');
  for (const status of ['running', 'paused'] as const) {
    const session: TimerSession = { id: 'saved-bear', characterId: 'bear', status, durationMs: 600_000,
      startTimestamp: 100_000, targetTimestamp: 700_000, pausedRemainingMs: 400_000, arrivalTimestamp: null,
      promise: { id: 'bath', name: '씻기', icon: '🛁', activity: '목욕하러 가요' } };
    assert.deepEqual(advanceSession(session, 300_000), { ...session, characterId: 'rabbit' });
  }
});
