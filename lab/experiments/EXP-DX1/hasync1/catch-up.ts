import { lsn } from "./supervisor.ts";

export type CatchUpOptions = { graceMs: number; capMs: number; pollMs: number; slackMs: number };
export const catchUpDefaults: CatchUpOptions = {
  graceMs: 20000,
  capMs: 20 * 60000,
  pollMs: 1000,
  slackMs: 30000,
};
export type CatchUp = {
  what: string;
  startLagBytes: number;
  appliedBytes: number;
  primaryBytes: number;
  ms: number;
  appliedMBps: number;
  primaryMBps: number;
  deadlineMs: number | null;
  samples: number;
};

const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
const mbps = (bytes: number, ms: number) => (ms > 0 ? bytes / 1e3 / ms : 0);

// [DX-HASYNC2] Why: on November 23 a standby that started 21 GB behind was given a fixed two minutes against 29 MB/s of new
// WAL. The deadline now comes from the lag and the closing rate measured over the first seconds, and the failure states both.
// Rejected: a larger fixed setup timeout, which hides a standby that can never catch up and wastes the case budget.
export async function catchUp(
  what: string,
  primaryFlush: () => Promise<string>,
  standbyReplay: () => Promise<string>,
  options: Partial<CatchUpOptions> = {},
): Promise<CatchUp> {
  const o = { ...catchUpDefaults, ...options };
  const sample = async () => {
    // Read the primary first: a standby position at or past it means no lag at that moment.
    const p = Number(lsn(await primaryFlush()));
    const s = Number(lsn(await standbyReplay()));
    return { t: performance.now(), p, s };
  };
  const first = await sample();
  const result = (last: typeof first, deadlineMs: number | null, samples: number): CatchUp => {
    const ms = last.t - first.t;
    return {
      what,
      startLagBytes: Math.max(0, first.p - first.s),
      appliedBytes: last.s - first.s,
      primaryBytes: last.p - first.p,
      ms,
      appliedMBps: mbps(last.s - first.s, ms),
      primaryMBps: mbps(last.p - first.p, ms),
      deadlineMs,
      samples,
    };
  };
  if (first.s >= first.p) return result(first, null, 1);
  let deadlineMs: number | null = null;
  let samples = 1;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, o.pollMs));
    const now = await sample();
    samples++;
    if (now.s >= now.p) return result(now, deadlineMs, samples);
    const elapsed = now.t - first.t;
    const lag = now.p - now.s;
    const applied = mbps(now.s - first.s, elapsed);
    const written = mbps(now.p - first.p, elapsed);
    const fail = (why: string) =>
      new Error(
        `${what}: ${why}. The standby is ${mb(lag)} MB behind after ${(elapsed / 1000).toFixed(0)} s ` +
          `(it started ${mb(first.p - first.s)} MB behind); it applied ${applied.toFixed(1)} MB/s while the primary ` +
          `wrote ${written.toFixed(1)} MB/s`,
      );
    if (deadlineMs === null && elapsed >= o.graceMs) {
      const closing = applied - written;
      if (closing <= 0) throw fail("Standby cannot catch up: it applies WAL no faster than the primary writes it");
      // Twice the projected time plus slack, from the lag and rate measured so far, within the case cap.
      deadlineMs = Math.min(o.capMs, elapsed + (2 * lag) / 1e3 / closing + o.slackMs);
    }
    if (deadlineMs !== null && elapsed > deadlineMs)
      throw fail(`Deadline of ${(deadlineMs / 1000).toFixed(0)} s, computed from the measured lag and rate, passed`);
    if (elapsed > o.capMs) throw fail(`Cap of ${(o.capMs / 1000).toFixed(0)} s passed`);
  }
}
