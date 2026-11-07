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
export interface JobResult<J> {
  readonly job: J;
  readonly startedAt: number;
  readonly finishedAt: number;
  /** finishedAt - scheduledAt */
  readonly latencyMs: number;
  /** startedAt - scheduledAt */
  readonly waitMs: number;
  readonly expired: boolean;
}

export interface SchedulerOptions<J> {
  maxInFlight: number;
  deadlineMs: number;
  now: () => number;
  exec: (job: J) => Promise<void>;
  onDone: (result: JobResult<J>) => void;
  /** Stop offering jobs scheduled at or after this time. */
  until?: number;
}

export class OpenLoopScheduler<J extends Job> {
  private queues = new Map<number, J[]>();
  private busy = new Set<number>();
  private ready: number[] = [];
  private inFlight = 0;
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
  get notOffered(): number {
    return this.jobs.length - this.next;
  }
  setUntil(t: number): void {
    (this.opts as { until?: number }).until = t;
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
    const q = this.queues.get(job.key);
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
    if (startedAt - job.scheduledAt > this.opts.deadlineMs) {
      this.expired++;
      this.opts.onDone({ job, startedAt, finishedAt: startedAt, latencyMs: startedAt - job.scheduledAt, waitMs: startedAt - job.scheduledAt, expired: true });
      this.runNext(key);
      return;
    }
    this.inFlight++;
    this.maxInFlightSeen = Math.max(this.maxInFlightSeen, this.inFlight);
    this.opts
      .exec(job)
      .catch(() => {})
      .then(() => {
        const finishedAt = this.opts.now();
        this.inFlight--;
        this.completed++;
        this.opts.onDone({ job, startedAt, finishedAt, latencyMs: finishedAt - job.scheduledAt, waitMs: startedAt - job.scheduledAt, expired: false });
        if (q && q.length) this.ready.push(key);
        else {
          this.queues.delete(key);
          this.busy.delete(key);
        }
        this.pump();
      });
  }
}
