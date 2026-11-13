/**
 * Open-loop scheduler with per-subject serial queues.
 *
 * [EXP-N01] Why: no coordinated omission. Each job carries its scheduled offer time; the scheduler
 * offers it at that time whatever the store is doing, and every latency is measured from the
 * scheduled time (queue wait behind the same subject, the in-flight cap, retries, all included).
 * Jobs for one subject run strictly in offer order (TARGETS section 2: serial per subject, parallel
 * across subjects). A job that cannot start within `deadlineMs` of its scheduled time is never sent
 * and is reported as expired.
 * Timer wakeups re-read the clock before offering, so a late timer offers everything already due and
 * never produces a negative latency.
 */
export interface Job {
  readonly key: number;
  readonly scheduledAt: number;
}
export interface QueueInterval<J> {
  cause: "scheduler-late" | "subject" | "slot" | "scheduler-dispatch";
  start: number;
  end: number;
  inFlight: number;
  behind?: J;
}
export interface JobResult<J> {
  readonly job: J;
  readonly startedAt: number;
  readonly finishedAt: number;
  /** finishedAt - scheduledAt */
  readonly latencyMs: number;
  /** startedAt - scheduledAt */
  readonly waitMs: number;
  readonly expired: boolean;
  readonly queue?: QueueInterval<J>[];
}

export interface SchedulerOptions<J> {
  maxInFlight: number;
  deadlineMs: number;
  now: () => number;
  exec: (job: J) => Promise<void>;
  onDone: (result: JobResult<J>) => void;
  /** Called when a job is offered (enters its subject's queue). */
  onOffer?: (job: J) => void;
  /** Stop offering jobs scheduled at or after this time. */
  until?: number;
  /** [DX-T1-2] Why: observe queue transitions without changing dispatch or deadlines. Rejected: infer waiting from total latency. */
  observeQueue?: boolean;
}

export class OpenLoopScheduler<J extends Job> {
  private queues = new Map<number, J[]>();
  private busy = new Set<number>();
  private ready: number[] = [];
  private inFlight = 0;
  private active = new Map<number, J>();
  private queueInfo = new Map<J, { offeredAt: number; readyAt?: number; behind?: J }>();
  private flightChanges: { at: number; count: number }[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private next = 0;
  private stopped = false;
  offered = 0;
  completed = 0;
  expired = 0;
  maxInFlightSeen = 0;

  private readonly jobs: readonly J[];
  private readonly opts: SchedulerOptions<J>;
  constructor(jobs: readonly J[], opts: SchedulerOptions<J>) {
    this.jobs = jobs;
    this.opts = opts;
  }
  start(): void {
    this.tick();
  }
  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }
  get pending(): number {
    let n = 0;
    for (const q of this.queues.values()) n += q.length;
    return n + this.inFlight;
  }
  /** Jobs handed to exec and not yet finished (they may sit in an engine-side admission queue). */
  get inFlightCount(): number {
    return this.inFlight;
  }
  get notOffered(): number {
    return this.jobs.length - this.next;
  }
  /** Jobs not yet offered whose scheduled time is within `horizonMs` of now, in order (at most `max`). */
  upcoming(horizonMs: number, max = 64): J[] {
    const limit = this.opts.now() + horizonMs;
    const out: J[] = [];
    for (
      let k = this.next;
      k < this.jobs.length && out.length < max && this.jobs[k]!.scheduledAt <= limit;
      k++
    )
      out.push(this.jobs[k]!);
    return out;
  }
  /** Offer an overlay job now (its scheduledAt is its own offer time); it joins its subject's serial queue. */
  inject(job: J): void {
    if (this.stopped) return;
    this.offer(job);
  }
  setUntil(t: number): void {
    (this.opts as { until?: number }).until = t;
  }

  snapshot() {
    const now = this.opts.now();
    return {
      at: now,
      inFlight: this.inFlight,
      capacity: this.opts.maxInFlight,
      active: [...this.active.values()],
      waiting: [...this.queues.values()].flat().filter((j) => now - j.scheduledAt >= 20),
    };
  }
  private queueOf(job: J, startedAt: number): QueueInterval<J>[] | undefined {
    if (!this.opts.observeQueue) return;
    const info = this.queueInfo.get(job);
    this.queueInfo.delete(job);
    if (!info) return;
    const readyAt = info.readyAt ?? startedAt,
      result: QueueInterval<J>[] = [];
    const add = (
      cause: QueueInterval<J>["cause"],
      start: number,
      end: number,
      inFlight: number,
      behind?: J,
    ) => {
      if (end > start) result.push({ cause, start, end, inFlight, ...(behind ? { behind } : {}) });
    };
    const countAt = (at: number) => {
      let low = 0,
        high = this.flightChanges.length;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (this.flightChanges[mid]!.at <= at) low = mid + 1;
        else high = mid;
      }
      return this.flightChanges[low - 1]?.count ?? 0;
    };
    add("scheduler-late", job.scheduledAt, info.offeredAt, countAt(info.offeredAt));
    add("subject", info.offeredAt, readyAt, countAt(info.offeredAt), info.behind);
    let lo = 0,
      hi = this.flightChanges.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.flightChanges[mid]!.at <= readyAt) lo = mid + 1;
      else hi = mid;
    }
    let at = readyAt,
      count = this.flightChanges[lo - 1]?.count ?? 0;
    for (let i = lo; i < this.flightChanges.length; i++) {
      const change = this.flightChanges[i]!;
      if (change.at >= startedAt) break;
      add(count >= this.opts.maxInFlight ? "slot" : "scheduler-dispatch", at, change.at, count);
      at = change.at;
      count = change.count;
    }
    add(count >= this.opts.maxInFlight ? "slot" : "scheduler-dispatch", at, startedAt, count);
    return result;
  }
  private tick = () => {
    this.timer = null;
    if (this.stopped) return;
    const now = this.opts.now();
    while (this.next < this.jobs.length && this.jobs[this.next]!.scheduledAt <= now) {
      const job = this.jobs[this.next]!;
      if (this.opts.until !== undefined && job.scheduledAt >= this.opts.until) break;
      this.next++;
      this.offer(job);
    }
    const upcoming = this.jobs[this.next];
    if (upcoming && !(this.opts.until !== undefined && upcoming.scheduledAt >= this.opts.until))
      this.timer = setTimeout(this.tick, Math.max(0, upcoming.scheduledAt - this.opts.now()));
  };

  private offer(job: J) {
    this.offered++;
    const offeredAt = this.opts.now();
    this.opts.onOffer?.(job);
    const q = this.queues.get(job.key);
    if (this.opts.observeQueue) {
      const behind = q?.at(-1) ?? this.active.get(job.key);
      this.queueInfo.set(job, { offeredAt, ...(behind ? { behind } : { readyAt: offeredAt }) });
    }
    if (q) q.push(job);
    else this.queues.set(job.key, [job]);
    if (!this.busy.has(job.key)) {
      this.busy.add(job.key);
      this.ready.push(job.key);
    }
    this.pump();
  }

  private pump() {
    while (this.inFlight < this.opts.maxInFlight && this.ready.length) {
      const key = this.ready.shift()!;
      this.runNext(key);
    }
  }

  private runNext(key: number) {
    const q = this.queues.get(key);
    const job = q?.shift();
    if (!job) {
      this.queues.delete(key);
      this.busy.delete(key);
      return;
    }
    const startedAt = this.opts.now();
    const queue = this.queueOf(job, startedAt);
    if (startedAt - job.scheduledAt > this.opts.deadlineMs) {
      this.expired++;
      this.opts.onDone({
        job,
        startedAt,
        finishedAt: startedAt,
        latencyMs: startedAt - job.scheduledAt,
        waitMs: startedAt - job.scheduledAt,
        expired: true,
        queue,
      });
      this.runNext(key);
      return;
    }
    this.inFlight++;
    this.active.set(key, job);
    if (this.opts.observeQueue) this.flightChanges.push({ at: startedAt, count: this.inFlight });
    this.maxInFlightSeen = Math.max(this.maxInFlightSeen, this.inFlight);
    this.opts
      .exec(job)
      .catch(() => {})
      .then(() => {
        const finishedAt = this.opts.now();
        this.inFlight--;
        this.active.delete(key);
        if (this.opts.observeQueue) {
          this.flightChanges.push({ at: finishedAt, count: this.inFlight });
          const next = q?.[0],
            info = next && this.queueInfo.get(next);
          if (info) info.readyAt = finishedAt;
        }
        this.completed++;
        this.opts.onDone({
          job,
          startedAt,
          finishedAt,
          latencyMs: finishedAt - job.scheduledAt,
          waitMs: startedAt - job.scheduledAt,
          expired: false,
          queue,
        });
        if (q && q.length) this.ready.push(key);
        else {
          this.queues.delete(key);
          this.busy.delete(key);
        }
        this.pump();
      });
  }
}
