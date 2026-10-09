import { test } from 'node:test';
import assert from 'node:assert/strict';
import { animalFoot, animalIds, animalPose, animalProfiles, PAW_BASELINE, rabbitFootPitch, type PawName } from '../src/lib/animalMotion';

test('rabbit hind paws push off together; four-legged walkers have a four-beat sequence', () => {
  const rabbit = animalProfiles.rabbit;
  assert.equal(rabbit.phases.nearHind, rabbit.phases.farHind);
  assert.notEqual(rabbit.phases.nearHind, rabbit.phases.nearFore);
  assert.equal(Object.keys(animalProfiles.chick.paws).length, 2);
  for (const id of ['bear', 'dog', 'cat'] as const) assert.equal(new Set(Object.values(animalProfiles[id].phases)).size, 4);
});

test('support paws move exactly with the ground and stay at the baseline', () => {
  for (const id of animalIds) {
    const profile = animalProfiles[id];
    const first = animalFoot(profile.support * .2, profile);
    const second = animalFoot(profile.support * .4, profile);
    assert.ok(first.planted && second.planted);
    assert.ok(Math.abs(second.x - first.x + profile.travel * profile.support * .2) < 1e-8);
    for (let sample = 0; sample < 200; sample++) {
      const pose = animalPose(id, profile.cycleMs * sample / 200);
      for (const [paw, foot] of Object.entries(pose.feet)) {
        const rig = profile.paws[paw as PawName]!;
        const hip = (pose.joints[`${paw as PawName}Hip`] + 90) * Math.PI / 180;
        const knee = pose.joints[`${paw as PawName}Knee`] * Math.PI / 180;
        const pitch = foot.pitch * Math.PI / 180;
        const x = rig.x + rig.upper * Math.cos(hip) + rig.lower * Math.cos(hip + knee) + foot.contactX * Math.cos(pitch) - foot.contactY * Math.sin(pitch);
        const y = rig.y + rig.upper * Math.sin(hip) + rig.lower * Math.sin(hip + knee) + foot.contactX * Math.sin(pitch) + foot.contactY * Math.cos(pitch) + pose.bob;
        assert.ok(Math.abs(x - foot.x) < .001, `${id} ${paw} misses target horizontally`);
        assert.ok(Math.abs(y - foot.y) < .001, `${id} ${paw} misses its vertical target`);
        if (foot.planted) assert.ok(Math.abs(y - PAW_BASELINE) < .001, `${id} ${paw} is not planted on the ground`);
      }
    }
  }
});

test('paws retain ground-relative velocity at lift-off and touchdown; rabbit hop is airborne', () => {
  const step = .000001;
  for (const id of animalIds) {
    const profile = animalProfiles[id];
    for (const boundary of [profile.support, 1]) {
      const before = (animalFoot(boundary, profile).x - animalFoot(boundary - step, profile).x) / step;
      const after = (animalFoot(boundary + step, profile).x - animalFoot(boundary, profile).x) / step;
      assert.ok(Math.abs(before + profile.travel) < .01);
      assert.ok(Math.abs(after + profile.travel) < .01);
    }
  }
  const rabbit = animalPose('rabbit', animalProfiles.rabbit.cycleMs * .89);
  assert.ok(rabbit.bob < -1.9 && rabbit.bob >= -2.4);
  assert.ok(Object.values(rabbit.feet).every((foot) => !foot.planted && foot.y < PAW_BASELINE));
});

test('rabbit paws roll over their toes, fold in swing and open smoothly for contact', () => {
  const profile = animalProfiles.rabbit;
  for (const hind of [true, false]) {
    assert.equal(rabbitFootPitch(0, profile.support, hind), 0);
    assert.ok(rabbitFootPitch(profile.support * .95, profile.support, hind) > (hind ? 20 : 10));
    assert.ok(rabbitFootPitch(profile.support + (1 - profile.support) * .35, profile.support, hind) < (hind ? -20 : -12));
    for (const boundary of [0, profile.support, profile.support + (1 - profile.support) * .35, 1]) {
      assert.ok(Math.abs(rabbitFootPitch(boundary - .000001, profile.support, hind) - rabbitFootPitch(boundary + .000001, profile.support, hind)) < .001);
    }
  }
  // The toe stays on the ground as the heel rises; the knee never flips its bend direction.
  for (let sample = 0; sample < 400; sample++) {
    const pose = animalPose('rabbit', profile.cycleMs * sample / 400);
    for (const paw of Object.keys(profile.paws) as PawName[]) {
      assert.ok(pose.joints[`${paw}Knee`] * profile.paws[paw]!.bend > 0);
      assert.ok(Math.abs(pose.joints[`${paw}Hip`]) < 85);
    }
  }
});

test('cat hind paw registers at the preceding forepaw ground location', () => {
  const profile = animalProfiles.cat;
  const fore = animalPose('cat', profile.cycleMs * .25);
  const hind = animalPose('cat', profile.cycleMs);
  assert.ok(Math.abs(fore.feet.nearFore!.x + fore.ground - hind.feet.nearHind!.x - hind.ground) < 1e-8);
});

test('animal cycles join continuously; idle and very long clocks remain deterministic', () => {
  for (const id of animalIds) {
    const profile = animalProfiles[id];
    const before = animalPose(id, profile.cycleMs - .00001);
    const after = animalPose(id, profile.cycleMs + .00001);
    for (const joint of Object.keys(after.joints) as (keyof typeof after.joints)[]) assert.ok(Math.abs(before.joints[joint] - after.joints[joint]) < .01);
    for (const time of [0, profile.cycleMs * .5, 7_200_000]) {
      const pose = animalPose(id, time);
      assert.deepEqual(pose, animalPose(id, time));
      assert.ok(Object.values(pose.joints).every(Number.isFinite));
    }
    assert.deepEqual(animalPose(id, 200, false), animalPose(id, 99_000, false));
  }
});
