import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ScreenWakeLockController, type ScreenWakeLockHandle } from '../src/lib/screenWakeLock';

class Lease extends EventTarget implements ScreenWakeLockHandle {
  released = false;
  releaseCount = 0;
  async release() {
    this.releaseCount++;
    this.released = true;
    this.dispatchEvent(new Event('release'));
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test('requests only for an active visible journey and reuses its one lease', async () => {
  const leases: Lease[] = [];
  const controller = new ScreenWakeLockController({ supported: () => true, request: async () => {
    const lease = new Lease(); leases.push(lease); return lease;
  } });
  controller.setActive(true);
  await controller.request();
  assert.equal(leases.length, 0);
  controller.setVisible(true);
  await controller.request();
  controller.setActive(true);
  await controller.request();
  assert.equal(leases.length, 1);
  assert.equal(controller.getSnapshot(), 'active');
  controller.setActive(false);
  assert.equal(leases[0].releaseCount, 1);
  assert.equal(controller.getSnapshot(), 'idle');
  controller.setActive(true);
  await controller.request();
  assert.equal(leases.length, 2);
});

test('duplicate foreground events share an unresolved request', async () => {
  const pending = deferred<Lease>();
  let calls = 0;
  const controller = new ScreenWakeLockController({ supported: () => true, request: () => { calls++; return pending.promise; } });
  controller.setVisible(true); controller.setActive(true);
  controller.setVisible(true); controller.setVisible(true);
  const request = controller.request();
  await flush();
  assert.equal(calls, 1);
  pending.resolve(new Lease()); await request;
  assert.equal(controller.getSnapshot(), 'active');
});

test('a late grant after pause, exit or page hide is immediately released', async () => {
  for (const stop of ['inactive', 'hidden'] as const) {
    const pending = deferred<Lease>();
    const controller = new ScreenWakeLockController({ supported: () => true, request: () => pending.promise });
    controller.setVisible(true); controller.setActive(true);
    const request = controller.request();
    if (stop === 'inactive') controller.setActive(false); else controller.setVisible(false);
    const lease = new Lease(); pending.resolve(lease); await request;
    assert.equal(lease.releaseCount, 1);
    assert.equal(controller.getSnapshot(), 'idle');
  }
});

test('rapid pause and resume waits out the stale grant and acquires a new one', async () => {
  const pending = deferred<Lease>();
  const stale = new Lease(), current = new Lease();
  let calls = 0;
  const controller = new ScreenWakeLockController({ supported: () => true, request: () => ++calls === 1 ? pending.promise : Promise.resolve(current) });
  controller.setVisible(true); controller.setActive(true);
  await flush();
  controller.setActive(false); controller.setActive(true);
  assert.equal(calls, 1);
  pending.resolve(stale); await flush();
  assert.equal(stale.releaseCount, 1);
  assert.equal(current.released, false);
  assert.equal(calls, 2);
  assert.equal(controller.getSnapshot(), 'active');
});

test('system release is visible and waits for foreground or explicit retry', async () => {
  const leases: Lease[] = [];
  const controller = new ScreenWakeLockController({ supported: () => true, request: async () => {
    const lease = new Lease(); leases.push(lease); return lease;
  } });
  controller.setVisible(true); controller.setActive(true); await controller.request();
  await leases[0].release(); await flush();
  assert.equal(controller.getSnapshot(), 'unavailable');
  assert.equal(leases.length, 1);
  await controller.request();
  assert.equal(leases.length, 2);
  controller.setVisible(false);
  assert.equal(leases[1].releaseCount, 1);
  controller.setVisible(true); await controller.request();
  assert.equal(leases.length, 3);
});

test('unsupported API and rejected or synchronously thrown requests do not block retry', async () => {
  let unsupportedCalls = 0;
  const unsupported = new ScreenWakeLockController({ supported: () => false, request: async () => { unsupportedCalls++; return new Lease(); } });
  unsupported.setVisible(true); unsupported.setActive(true); await unsupported.request();
  assert.equal(unsupported.getSnapshot(), 'unsupported');
  assert.equal(unsupportedCalls, 0);
  for (const synchronous of [false, true]) {
    let calls = 0;
    const controller = new ScreenWakeLockController({ supported: () => true, request: () => {
      if (++calls > 1) return Promise.resolve(new Lease());
      if (synchronous) throw new Error('Blocked');
      return Promise.reject(new Error('Low power'));
    } });
    controller.setVisible(true); controller.setActive(true); await controller.request();
    assert.equal(controller.getSnapshot(), 'unavailable');
    await controller.request();
    assert.equal(controller.getSnapshot(), 'active');
  }
});

test('an already released grant is never reported active', async () => {
  const lease = new Lease(); await lease.release();
  const controller = new ScreenWakeLockController({ supported: () => true, request: async () => lease });
  controller.setVisible(true); controller.setActive(true); await controller.request();
  assert.equal(controller.getSnapshot(), 'unavailable');
});
