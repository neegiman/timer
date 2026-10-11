export type ScreenWakeLockStatus = 'idle' | 'requesting' | 'active' | 'unsupported' | 'unavailable';

export interface ScreenWakeLockHandle extends EventTarget {
  readonly released: boolean;
  release(): Promise<void>;
}

interface WakeLockEnvironment {
  supported(): boolean;
  request(): Promise<ScreenWakeLockHandle>;
}

/** Own one browser lease; late requests must never keep a stopped journey awake. */
export class ScreenWakeLockController {
  private wanted = false;
  private visible = false;
  private revision = 0;
  private lease: ScreenWakeLockHandle | null = null;
  private pending: Promise<void> | null = null;
  private status: ScreenWakeLockStatus = 'idle';
  private listeners = new Set<() => void>();

  constructor(private environment: WakeLockEnvironment) {}

  getSnapshot = () => this.status;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(status: ScreenWakeLockStatus) {
    if (status === this.status) return;
    this.status = status;
    for (const listener of this.listeners) listener();
  }

  private onRelease = () => {
    this.lease?.removeEventListener('release', this.onRelease);
    this.lease = null;
    this.publish(this.wanted && this.visible ? 'unavailable' : 'idle');
    // Do not repeatedly fight a system release (low power, battery or user policy).
    // A foreground event or the parent's retry button can request a new lease.
  };

  private release() {
    const lease = this.lease;
    this.lease = null;
    lease?.removeEventListener('release', this.onRelease);
    if (lease) this.releaseHandle(lease);
    this.publish('idle');
  }

  private releaseHandle(lease: ScreenWakeLockHandle) {
    try { void Promise.resolve(lease.release()).catch(() => {}); }
    catch { /* Browser cleanup must not interrupt timer controls. */ }
  }

  setActive(active: boolean) {
    if (this.wanted !== active) {
      this.wanted = active;
      this.revision++;
    }
    if (!active) this.release();
    else void this.request();
  }

  setVisible(visible: boolean) {
    if (this.visible !== visible) {
      this.visible = visible;
      this.revision++;
    }
    if (!visible) this.release();
    else void this.request();
  }

  request = (): Promise<void> => {
    if (!this.wanted || !this.visible) return Promise.resolve();
    if (!this.environment.supported()) { this.publish('unsupported'); return Promise.resolve(); }
    if (this.lease && !this.lease.released) { this.publish('active'); return Promise.resolve(); }
    if (this.pending) return this.pending;
    this.publish('requesting');
    this.pending = this.acquire(this.revision);
    return this.pending;
  };

  private async acquire(revision: number) {
    try {
      const lease = await Promise.resolve().then(() => this.environment.request());
      if (revision !== this.revision || !this.wanted || !this.visible) {
        this.releaseHandle(lease);
      } else if (lease.released) {
        this.publish('unavailable');
      } else {
        this.lease = lease;
        lease.addEventListener('release', this.onRelease);
        this.publish('active');
      }
    } catch {
      if (revision === this.revision) this.publish(this.wanted && this.visible ? 'unavailable' : 'idle');
    } finally {
      this.pending = null;
      if (revision !== this.revision && this.wanted && this.visible) void this.request();
    }
  }
}
