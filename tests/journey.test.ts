import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journeyLayout, journeyRoute, type JourneyLayout } from '../src/lib/journey';

test('both roads stay continuous and leave a horizontal runway beyond the finish', () => {
  for (const layout of ['standard', 'compact'] as JourneyLayout[]) {
    const route = journeyRoute(layout);
    assert.deepEqual(route.point(0), route.start);
    assert.deepEqual(route.point(1), route.finish);
    let previous = route.point(0);
    for (let position = .001; position <= 1.08; position += .001) {
      const point = route.point(position);
      assert.ok(point.x >= previous.x - 1e-8, `${layout} doubles back at ${position}`);
      assert.ok(Math.hypot(point.x - previous.x, point.y - previous.y) < 1, `${layout} jumps at ${position}`);
      assert.ok(point.x < 720 && point.y >= 200 && point.y <= 460);
      previous = point;
    }
    const approach = route.point(.999);
    assert.ok(Math.abs(approach.y - route.finish.y) < .1, 'crossing direction remains level');
    const overshoot = route.point(1.07);
    assert.ok(overshoot.x > route.finish.x + 20);
    assert.equal(overshoot.y, route.finish.y);
  }
});

test('short and wide scenes choose a road with more headroom and horizontal space', () => {
  assert.equal(journeyLayout(288, 400), 'standard');
  assert.equal(journeyLayout(358, 456), 'standard');
  assert.equal(journeyLayout(566, 255), 'compact');
  assert.equal(journeyLayout(1200, 600), 'compact');
  assert.equal(journeyLayout(288, 320), 'compact');
  assert.ok(journeyRoute('compact').finish.y > journeyRoute('standard').finish.y);
});
