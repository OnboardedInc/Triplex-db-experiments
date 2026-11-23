// [DX-DEMO1] The dashboard's live load: a small, bounded, open-loop mix of real saves and reads against the working copy,
// run in the local server process (never in the browser), sampled per second so a viewer can watch it.
// It is a demonstration, not a benchmark: one client process on the Mac, through the SSH tunnel, at rates capped far
// below the store's measured capacity. Every save is a durable synchronous commit through the write gateway.
// Why: show what the store does while it is being written to, with the gateway's own time beside the tunnel's.
// Rejected: a browser-side generator (the page would measure the browser) and unbounded or unattended runs.
import { createHash, randomUUID } from "node:crypto";
import type { Triple } from "@triplex-build/triplex";
import { Demo, DemoError } from "./store.ts";

export const LIMITS = { savesPerSecond: 20, readsPerSecond: 200, seconds: 60, subjects: 400, savesInFlight: 40, readsInFlight: 256 } as const;
export const DEFAULTS = { savesPerSecond: 20, readsPerSecond: 200, seconds: 60, subjects: 300 } as const;
export type LoadOptions = { savesPerSecond: number; readsPerSecond: number; seconds: number; subjects: number; pinBehind: number };
const LOAD_ATTRIBUTE = ":task/field-4";
const BUCKETS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, Infinity] as const;
const MAX_READ_RECORDS = 60_000;

/** The same canonical form for a read's facts, from the reach (Triples) or from SDK rows. */
export function canonicalFact(entity: string, attribute: string, type: string, value: unknown) {
  const v = type === "string" ? String(value)
    : type === "integer" || type === "number" || type === "datetime" ? String(Number(value))
    : `(${type})`;
  return `${entity}\u0000${attribute}\u0000${type}\u0000${v}`;
}
export const digest = (facts: string[]) => createHash("sha256").update([...facts].sort().join("\n")).digest("hex");
const tripleFacts = (triples: readonly Triple[]) =>
  triples.map((t) => canonicalFact(t.entityId, t.attribute, t.value.type, (t.value as { value: unknown }).value));

type Kind = "save" | "current" | "pinned";
type Second = {
  second: number; head: number | null;
  done: Record<Kind, number>; offered: Record<Kind, number>; skipped: Record<Kind, number>; errors: number;
  server: Record<Kind, number[]>; transact: number[]; roundTrip: Record<Kind, number[]>;
};
export type SaveRecord = { seq: number; account: string; subject: number; entity: string; attribute: string; value: string; position: number; txId: string };
export type ReadRecord = { kind: "current" | "pinned"; root: string; position: number; validAt: number; entities: string[]; facts: number; digest: string };

const quantile = (xs: number[], q: number) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]! * 100) / 100;
};

export class Load {
  private run?: {
    id: string; options: LoadOptions; startedAt: number; endsAt: number; stoppedAt?: number;
    stopReason?: string; timer: NodeJS.Timeout; headTimer: NodeJS.Timeout; head: number; startHead: number;
    pool: { account: string; subject: number }[]; next: number; busy: Set<string>;
    issued: Record<Kind, number>; inFlight: Record<Kind, number>; seconds: Second[];
    hist: Record<Kind, number[]>; errors: string[]; saves: SaveRecord[]; reads: ReadRecord[]; seq: number;
  };
  private readonly demo: Demo;
  constructor(demo: Demo) {
    this.demo = demo;
  }

  start(input: Partial<Omit<LoadOptions, "pinBehind">>) {
    if (!this.demo.connection.workingCopy)
      throw new DemoError("NotAWorkingCopy", "The connection is not marked as a demo working copy; the load refuses to run");
    if (this.run && !this.run.stoppedAt) throw new DemoError("LoadRunning", "A load is already running; stop it first");
    const clamp = (v: unknown, d: number, max: number, min = 0) => {
      const n = v === undefined ? d : Number(v);
      if (!Number.isFinite(n) || n < min) throw new DemoError("InvalidInput", "Load settings must be numbers");
      return Math.min(Math.floor(n), max);
    };
    const options: LoadOptions = {
      savesPerSecond: clamp(input.savesPerSecond, DEFAULTS.savesPerSecond, LIMITS.savesPerSecond),
      readsPerSecond: clamp(input.readsPerSecond, DEFAULTS.readsPerSecond, LIMITS.readsPerSecond),
      seconds: clamp(input.seconds, DEFAULTS.seconds, LIMITS.seconds, 1),
      subjects: clamp(input.subjects, DEFAULTS.subjects, LIMITS.subjects, 1),
      pinBehind: 0,
    };
    // Subjects spread over every account, skipping numbers 0 and 1 (the inspector's long- and short-history examples).
    const roster = this.demo.connection.roster;
    const perAccount = Math.ceil(options.subjects / roster.length);
    const pool: { account: string; subject: number }[] = [];
    for (let k = 0; k < perAccount; k++)
      for (const r of roster) {
        const usable = r.people - 2;
        if (k >= usable || pool.length >= options.subjects) continue;
        pool.push({ account: r.account, subject: r.firstPerson + 2 + Math.floor((k * usable) / perAccount) });
      }
    options.subjects = pool.length;
    const kinds = () => ({ save: 0, current: 0, pinned: 0 });
    const run = {
      id: randomUUID().slice(0, 8), options, startedAt: Date.now(), endsAt: Date.now() + options.seconds * 1000,
      timer: undefined as unknown as NodeJS.Timeout, headTimer: undefined as unknown as NodeJS.Timeout, head: 0, startHead: 0,
      pool, next: 0, busy: new Set<string>(), issued: kinds(), inFlight: kinds(), seconds: [] as Second[],
      hist: { save: BUCKETS.map(() => 0), current: BUCKETS.map(() => 0), pinned: BUCKETS.map(() => 0) },
      errors: [] as string[], saves: [] as SaveRecord[], reads: [] as ReadRecord[], seq: 0,
    };
    this.run = run;
    const refreshHead = async () => {
      try {
        run.head = (await this.demo.head()).position;
        run.options.pinBehind = Math.min(1000, Math.floor(run.head / 2));
      } catch (e) { this.error(run, e); }
    };
    void refreshHead().then(() => {
      run.startHead = run.head;
      run.headTimer = setInterval(refreshHead, 250);
      run.timer = setInterval(() => this.tick(run), 10);
    });
    return { started: run.id, options, limits: LIMITS, note: "A demonstration load, not a benchmark: one client on the Mac through the SSH tunnel, capped rates." };
  }

  stop(reason = "stopped by the viewer") {
    const run = this.run;
    if (!run || run.stoppedAt) return { stopped: false };
    run.stoppedAt = Date.now();
    run.stopReason = reason;
    clearInterval(run.timer);
    clearInterval(run.headTimer);
    // One last head reading once in-flight saves have settled, so the page shows where the run left the head.
    setTimeout(() => { this.demo.head().then((h) => { run.head = h.position; }).catch(() => {}); }, 2000);
    return { stopped: true, runId: run.id, reason };
  }

  private error(run: NonNullable<Load["run"]>, e: unknown) {
    const message = e instanceof Error ? `${(e as { code?: string }).code ?? e.name}: ${e.message}` : String(e);
    run.errors.push(`${new Date().toISOString()} ${message}`);
    if (run.errors.length > 50) run.errors.shift();
    this.secondOf(run).errors++;
  }

  private secondOf(run: NonNullable<Load["run"]>) {
    const s = Math.floor((Date.now() - run.startedAt) / 1000);
    while (run.seconds.length <= s) {
      const kinds = () => ({ save: 0, current: 0, pinned: 0 });
      run.seconds.push({ second: run.seconds.length, head: null, done: kinds(), offered: kinds(), skipped: kinds(), errors: 0,
        server: { save: [], current: [], pinned: [] }, transact: [], roundTrip: { save: [], current: [], pinned: [] } });
    }
    return run.seconds[s]!;
  }

  private tick(run: NonNullable<Load["run"]>) {
    if (run.stoppedAt) return;
    const now = Date.now();
    if (now >= run.endsAt) { this.stop(`reached its ${run.options.seconds} s limit`); return; }
    const elapsed = (now - run.startedAt) / 1000;
    this.secondOf(run).head = run.head;
    const due = (rate: number) => Math.floor(elapsed * rate);
    while (run.issued.save < due(run.options.savesPerSecond)) { run.issued.save++; this.offerSave(run); }
    const reads = due(run.options.readsPerSecond);
    while (run.issued.current + run.issued.pinned < reads) {
      const kind = (run.issued.current + run.issued.pinned) % 2 === 0 ? "current" : "pinned";
      run.issued[kind]++;
      this.offerRead(run, kind);
    }
  }

  private record(run: NonNullable<Load["run"]>, kind: Kind, answer: { timing: { serverMs: number | null; roundTripMs: number; calls: { route: string; serverMs: number | null }[] } }) {
    const sec = this.secondOf(run);
    sec.done[kind]++;
    if (answer.timing.serverMs !== null) {
      sec.server[kind].push(answer.timing.serverMs);
      run.hist[kind][BUCKETS.findIndex((b) => answer.timing.serverMs! < b)]!++;
    }
    sec.roundTrip[kind].push(answer.timing.roundTripMs);
    if (kind === "save")
      for (const c of answer.timing.calls) if (c.route.endsWith("/transact") && c.serverMs !== null) sec.transact.push(c.serverMs);
  }

  private offerSave(run: NonNullable<Load["run"]>) {
    const sec = this.secondOf(run);
    sec.offered.save++;
    let pick: { account: string; subject: number } | undefined;
    for (let i = 0; i < run.pool.length && !pick; i++) {
      const c = run.pool[run.next++ % run.pool.length]!;
      if (!run.busy.has(c.account + c.subject)) pick = c;
    }
    if (!pick || run.inFlight.save >= LIMITS.savesInFlight) { sec.skipped.save++; return; }
    const key = pick.account + pick.subject;
    const seq = ++run.seq;
    const value = `load-${run.id}-${seq}`;
    run.busy.add(key);
    run.inFlight.save++;
    this.demo.saveFacts(pick.account, pick.subject, "task", { [LOAD_ATTRIBUTE]: value })
      .then((a) => {
        if (!a.readbackMatches) throw new DemoError("ReadbackDiffers", `save ${seq} read back a different value`);
        this.record(run, "save", a);
        run.saves.push({ seq, account: pick.account, subject: pick.subject, entity: a.entity, attribute: LOAD_ATTRIBUTE, value,
          position: a.receipt.position, txId: a.receipt.txId });
      })
      .catch((e) => this.error(run, e))
      .finally(() => { run.busy.delete(key); run.inFlight.save--; });
  }

  private offerRead(run: NonNullable<Load["run"]>, kind: "current" | "pinned") {
    const sec = this.secondOf(run);
    sec.offered[kind]++;
    if (run.inFlight.current + run.inFlight.pinned >= LIMITS.readsInFlight || run.head < 1) { sec.skipped[kind]++; return; }
    const c = run.pool[(run.issued.current + run.issued.pinned) % run.pool.length]!;
    const root = this.demo.subjectIds(c.account, c.subject).root;
    const position = kind === "current" ? run.head : Math.max(1, run.head - run.options.pinBehind);
    const validAt = Date.now();
    run.inFlight[kind]++;
    this.demo.measure(async () => {
      const world = await this.demo.reader.readDemandWorld(this.demo.scope, root, { recordedPosition: position, validAt });
      if (!world) throw new DemoError("ReadDeclined", "the read gateway declined a read");
      return { world, position };
    })
      .then((a) => {
        this.record(run, kind, a);
        if (run.reads.length < MAX_READ_RECORDS)
          run.reads.push({ kind, root, position, validAt, facts: a.world.triples.length,
            entities: [...new Set(a.world.triples.map((t) => t.entityId as string))].sort(), digest: digest(tripleFacts(a.world.triples)) });
      })
      .catch((e) => this.error(run, e))
      .finally(() => { run.inFlight[kind]--; });
  }

  status(since = 0) {
    const run = this.run;
    if (!run) return { running: false, limits: LIMITS, defaults: DEFAULTS };
    const all = (k: Kind) => run.seconds.flatMap((s) => s.server[k]);
    const summary = (s: Second) => ({
      second: s.second, head: s.head, errors: s.errors,
      done: s.done, offered: s.offered, skipped: s.skipped,
      gateway: Object.fromEntries((["save", "current", "pinned"] as Kind[]).map((k) => [k, { p50: quantile(s.server[k], 0.5), p99: quantile(s.server[k], 0.99) }])),
      transact: { p50: quantile(s.transact, 0.5), p99: quantile(s.transact, 0.99) },
      roundTrip: Object.fromEntries((["save", "current", "pinned"] as Kind[]).map((k) => [k, { p50: quantile(s.roundTrip[k], 0.5), p99: quantile(s.roundTrip[k], 0.99) }])),
    });
    // The second in progress is reported but marked partial.
    const current = Math.floor(((run.stoppedAt ?? Date.now()) - run.startedAt) / 1000);
    return {
      running: !run.stoppedAt, runId: run.id, options: run.options, limits: LIMITS,
      startedAt: new Date(run.startedAt).toISOString(), stoppedAt: run.stoppedAt ? new Date(run.stoppedAt).toISOString() : null,
      stopReason: run.stopReason ?? null, startHead: run.startHead, head: run.head,
      inFlight: run.inFlight, issued: run.issued,
      totals: {
        saves: run.saves.length, reads: run.reads.length, errors: run.seconds.reduce((n, s) => n + s.errors, 0),
        gateway: Object.fromEntries((["save", "current", "pinned"] as Kind[]).map((k) => [k, { p50: quantile(all(k), 0.5), p99: quantile(all(k), 0.99), n: all(k).length }])),
        transact: { p50: quantile(run.seconds.flatMap((s) => s.transact), 0.5), p99: quantile(run.seconds.flatMap((s) => s.transact), 0.99) },
      },
      histogram: { bucketsMsBelow: BUCKETS.map((b) => (b === Infinity ? "more" : b)), ...run.hist },
      seconds: run.seconds.filter((s) => s.second >= since).map((s) => ({ ...summary(s), partial: s.second >= current && !run.stoppedAt })),
      errors: run.errors.slice(-20),
      note: "A demonstration load, not a benchmark: one client on the Mac through the SSH tunnel, capped at 20 saves/s and 200 reads/s for at most 60 s.",
    };
  }

  records() {
    const run = this.run;
    return run ? { runId: run.id, running: !run.stoppedAt, saves: run.saves, reads: run.reads } : { runId: null, running: false, saves: [], reads: [] };
  }
}
