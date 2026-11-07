import { performance } from "node:perf_hooks";

export const delay = async (milliseconds: number): Promise<void> => {
  if (milliseconds > 0)
    await new Promise((resolve) => setTimeout(resolve, Math.max(1, Math.ceil(milliseconds))));
};
/** Node24 truncates fractional timer delays, and does not guarantee firing
 * exactly on time. Inspiration/authority:
 * https://nodejs.org/download/release/v24.13.0/docs/api/timers.html#settimeoutcallback-delay-args
 * The512stress-v1 oracle caught422 negative-latency rejection events. Recheck
 * the real clock; never clamp or manufacture an observed finish timestamp. */
export const waitUntil = async (
  deadline: number,
  clock: () => number = () => performance.now(),
  suspend = delay,
): Promise<void> => {
  while (clock() < deadline) await suspend(Math.max(1, Math.ceil(deadline - clock())));
};
type Waiting = { enter: () => void; timer?: ReturnType<typeof setTimeout> };
export class Dispatch {
  active = 0;
  maximumActive = 0;
  maximumQueued = 0;
  private queue: Waiting[] = [];
  readonly limit: number;
  readonly pendingLimit: number;
  constructor(limit: number, pendingLimit: number) {
    this.limit = limit;
    this.pendingLimit = pendingLimit;
  }
  async use<A>(work: (remainingMs: number) => Promise<A>, deadline: number): Promise<A> {
    if (performance.now() >= deadline) throw new Error("OFFER_DEADLINE_EXCEEDED");
    if (this.active >= this.limit) {
      if (this.queue.length >= this.pendingLimit) throw new Error("BOUNDED_DISPATCH_REJECTION");
      await new Promise<void>((resolve, reject) => {
        const entry: Waiting = {
          enter: () => {
            if (entry.timer) clearTimeout(entry.timer);
            resolve();
          },
        };
        const expire = () => {
          const remaining = deadline - performance.now();
          if (remaining > 0) {
            entry.timer = setTimeout(expire, Math.max(1, Math.ceil(remaining)));
            return;
          }
          const index = this.queue.indexOf(entry);
          if (index >= 0) {
            this.queue.splice(index, 1);
            reject(new Error("OFFER_DEADLINE_EXCEEDED"));
          }
        };
        entry.timer = setTimeout(expire, Math.max(1, Math.ceil(deadline - performance.now())));
        this.queue.push(entry);
        this.maximumQueued = Math.max(this.maximumQueued, this.queue.length);
      });
    } else this.active++;
    this.maximumActive = Math.max(this.maximumActive, this.active);
    try {
      const remaining = Math.floor(deadline - performance.now());
      if (remaining <= 0) throw new Error("OFFER_DEADLINE_EXCEEDED");
      // Callers pass this remaining scheduled-offer budget into real native
      // cancellation/Effect interruption. No early slot release via Promise.race.
      return await work(remaining);
    } finally {
      const next = this.queue.shift();
      if (next) next.enter();
      else this.active--;
    }
  }
}
