import {
  OpenLoopScheduler,
  type Job,
  type SchedulerOptions,
} from "../../../bench/lib/scheduler.ts";
import { accountOfSubject, type Account } from "./tenants.ts";
// [DX-SCALE1] Why: two customers maintain independent open-loop admission and subject queues even when their commits go to the same Datomic transactor. Rejected: giving a pooled account a smaller sender window or letting a hot queue gate offers to another.
export class TenantScheduler<J extends Job> {
  private readonly schedulers = new Map<number, OpenLoopScheduler<J>>();
  private readonly accounts: readonly Account[];
  private readonly now: () => number;
  private active = 0;
  maxInFlightSeen = 0;
  constructor(jobs: J[], opts: SchedulerOptions<J>, accounts: readonly Account[]) {
    this.accounts = accounts;
    this.now = opts.now;
    const groups = new Map<number, J[]>();
    for (const a of accounts) groups.set(a.index, []);
    for (const j of jobs) groups.get(accountOfSubject(accounts, j.key).index)!.push(j);
    for (const [idx, own] of groups)
      this.schedulers.set(
        idx,
        new OpenLoopScheduler(own, {
          ...opts,
          exec: async (j) => {
            this.active++;
            this.maxInFlightSeen = Math.max(this.maxInFlightSeen, this.active);
            try {
              return await opts.exec(j);
            } finally {
              this.active--;
            }
          },
        }),
      );
  }
  get pending() {
    return this.total("pending");
  }
  get inFlightCount() {
    return this.total("inFlightCount");
  }
  get offered() {
    return this.total("offered");
  }
  get expired() {
    return this.total("expired");
  }
  get completed() {
    return this.total("completed");
  }
  get notOffered() {
    return this.total("notOffered");
  }
  private total(
    key: "offered" | "expired" | "completed" | "notOffered" | "pending" | "inFlightCount",
  ) {
    let n = 0;
    for (const s of this.schedulers.values()) n += s[key];
    return n;
  }
  start() {
    for (const s of this.schedulers.values()) s.start();
  }
  stop() {
    for (const s of this.schedulers.values()) s.stop();
  }
  setUntil(t: number) {
    for (const s of this.schedulers.values()) s.setUntil(t);
  }
  inject(job: J) {
    this.schedulers.get(accountOfSubject(this.accounts, job.key).index)!.inject(job);
  }
  upcoming(ms: number) {
    return [...this.schedulers.values()]
      .flatMap((s) => s.upcoming(ms))
      .sort((a, b) => a.scheduledAt - b.scheduledAt);
  }
  snapshot() {
    const rows = [...this.schedulers.values()].map((s) => s.snapshot());
    return {
      at: this.now(),
      inFlight: this.inFlightCount,
      capacity: rows.reduce((a, s) => a + s.capacity, 0),
      active: rows.flatMap((s) => s.active),
      waiting: rows.flatMap((s) => s.waiting),
    };
  }
}
