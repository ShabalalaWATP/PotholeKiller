export type IdentityStamp = { epoch: number; revision: number };
export type CollectorRequest = { epoch: number; id: number; intent: number; kind: "read" | "write" | "auth" };

/** Keeps asynchronous UI work inside the SDK identity that started it. */
export class CollectorSession {
  private userId: string | null = null;
  private epoch = 0;
  private revision = 0;
  private latestIntent = 0;
  private latestAuthIntent = 0;
  private requestId = 0;
  private requested = false;
  private verified = false;
  private active = new Set<number>();
  private listeners = new Set<() => void>();
  private queue: Promise<void> = Promise.resolve();

  get currentUserId() { return this.userId; }
  get sessionVersion() { return this.epoch; }
  get snapshotLoaded() { return this.verified; }
  get hasRequestedSnapshot() { return this.requested; }
  getPendingCount = () => this.active.size;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private notify() { this.listeners.forEach(listener => listener()); }

  identityStamp(): IdentityStamp { return { epoch: this.epoch, revision: this.revision }; }
  acceptsIdentity(stamp: IdentityStamp) { return stamp.epoch === this.epoch && stamp.revision === this.revision; }

  observeIdentity(userId: string | null, force = false) {
    this.revision++;
    if (!force && userId === this.userId) return false;
    this.userId = userId;
    this.epoch++;
    this.latestIntent++;
    this.requested = false;
    this.verified = false;
    this.active.clear();
    this.queue = Promise.resolve();
    this.notify();
    return true;
  }

  begin(kind: CollectorRequest["kind"]): CollectorRequest {
    if (kind !== "auth") { this.latestIntent++; this.requested = true; }
    else this.latestAuthIntent++;
    const ticket = { epoch: this.epoch, id: ++this.requestId, intent: kind === "auth" ? this.latestAuthIntent : this.latestIntent, kind };
    this.active.add(ticket.id);
    this.notify();
    return ticket;
  }

  sameSession(ticket: Pick<CollectorRequest, "epoch">) { return ticket.epoch === this.epoch; }
  canCommit(ticket: CollectorRequest) { return this.sameSession(ticket) && ticket.intent === (ticket.kind === "auth" ? this.latestAuthIntent : this.latestIntent); }
  finish(ticket: CollectorRequest) {
    if (this.sameSession(ticket) && this.active.delete(ticket.id)) this.notify();
  }
  verifySnapshot(ticket: CollectorRequest, authenticated: boolean) {
    if (this.canCommit(ticket)) this.verified = this.userId !== null && authenticated;
    return this.verified;
  }

  /** Serialise community reads and writes, but let a new identity start immediately. */
  async run<T>(kind: "read" | "write", operation: () => Promise<T>, accept: (value: T, ticket: CollectorRequest) => void, reject: (cause: unknown, ticket: CollectorRequest) => void) {
    const ticket = this.begin(kind);
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>(resolve => { release = resolve; });
    try {
      await previous;
      if (!this.sameSession(ticket)) return false;
      const value = await operation();
      if (!this.canCommit(ticket)) return false;
      accept(value, ticket);
      return true;
    } catch (cause) {
      if (this.canCommit(ticket)) reject(cause, ticket);
      return false;
    } finally { release(); this.finish(ticket); }
  }
}
