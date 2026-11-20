import { performance } from "node:perf_hooks";
import { ExpectationCache } from "./expectation-cache.ts";
import { Model } from "./model.ts";
import {
  applyJournalEntry,
  ModelJournal,
  type JournalContext,
  type JournalEntry,
} from "./model-journal.ts";
import { R, type ReadRecord } from "./observe.ts";
import { judgeReadCode, VERDICTS, wasHot } from "./read-judgment.ts";
import { ReadWindow, type ReadWindowBounds } from "./read-window.ts";
import { Histogram } from "./hist.ts";
import { hopOf, worldFactsOf } from "./world.ts";
import { deepCells } from "./deep-world.ts";
import { SplitFold } from "./split-evidence.ts";

const MAX_DEFERRED = 524_288;
const clock = () => {
  const { user, system } = process.threadCpuUsage();
  return (user + system) / 1000;
};

export type ReadWindowPlan = { windows: ReadWindowBounds[]; recovery: ReadWindowBounds[] };
export type StreamReadConfig = {
  file: string;
  context: JournalContext;
  deep: boolean;
  progress: Int32Array;
};

export class StreamReads {
  readonly journal: ModelJournal;
  readonly splits = new SplitFold();
  private readonly model: Model;
  private readonly expected: ExpectationCache;
  private readonly buckets: string[];
  private readonly hops: string[];
  private readonly clocks = new Map<number, number>();
  private readonly windows = new Map<
    number,
    {
      levels: ReadWindow[];
      recovery: {
        bounds: ReadWindowBounds;
        read: Histogram;
        violations: number;
        errors: number;
        routes: Record<string, number>;
      }[];
    }
  >();
  private deferred: ReadRecord[] = [];
  private sealedClock = -Infinity;
  private publishedAt = -Infinity;
  private total = 0;
  private peakDeferred = 0;
  private readonly verdicts = Array.from({ length: VERDICTS.length }, () => 0);
  private readonly violationSample: unknown[] = [];
  private readonly trips: Record<string, number> = {};
  private judgeCpuMs = 0;
  private judgeWallMs = 0;
  private judgeChecked = 0;

  constructor(cfg: StreamReadConfig) {
    this.model = new Model(cfg.context.subjects, true);
    this.expected = new ExpectationCache(this.model);
    this.journal = new ModelJournal(cfg.file, cfg.context);
    const deep = cfg.deep ? deepCells(cfg.context.subjects) : undefined;
    this.buckets = Array.from({ length: cfg.context.subjects }, (_, i) => {
      const facts = deep ? deep.sizes[i]! : worldFactsOf(i, this.model.accounts);
      return facts <= 200 ? "bucket:small" : facts <= 800 ? "bucket:medium" : "bucket:large";
    });
    this.hops = this.buckets.map((_, i) => `hops:${hopOf(i)}`);
  }

  addModel(entry: JournalEntry) {
    const receipt = entry.kind === "receipt" ? entry.receipt : entry.commit;
    // [DX-RD1] Why: a model append inside an already judged cut invalidates this run before any result can qualify.
    // Rejected: overwriting previous verdicts or assuming ACK arrival order equals transaction order.
    if (!Number.isFinite(receipt.instant) || receipt.instant <= this.sealedClock)
      throw Error(`Model entry at ${receipt.position} crossed the sealed read clock`);
    this.journal.append(entry);
    applyJournalEntry(this.model, entry);
    if (entry.kind === "receipt") this.clocks.set(receipt.position, receipt.instant);
  }

  phase(phase: number, plan: ReadWindowPlan) {
    if (this.windows.has(phase)) throw Error("Duplicate checked read phase");
    this.windows.set(phase, {
      levels: plan.windows.map((w) => new ReadWindow(w)),
      recovery: plan.recovery.map((bounds) => ({
        bounds,
        read: new Histogram(),
        violations: 0,
        errors: 0,
        routes: {},
      })),
    });
  }

  private timed(work: () => void) {
    const cpu = clock(),
      start = performance.now();
    work();
    this.judgeCpuMs += clock() - cpu;
    this.judgeWallMs += performance.now() - start;
  }

  capture(row: ReadRecord): boolean {
    if (!this.windows.has(row[R.phase])) return false;
    this.total++;
    if (this.ready(row)) this.check(row);
    else {
      if (this.deferred.length === MAX_DEFERRED)
        throw Error("Exact reader exceeded the bounded unverified backlog");
      this.deferred.push(row);
      this.peakDeferred = Math.max(this.peakDeferred, this.deferred.length);
    }
    return true;
  }

  private ready(row: ReadRecord) {
    return row[R.recordedAt] <= this.sealedClock && row[R.start] <= this.publishedAt;
  }

  advance(through: number, at: number) {
    if (
      through < this.sealedClock ||
      at < this.publishedAt ||
      !Number.isFinite(through) ||
      !Number.isFinite(at)
    )
      throw Error("Reader verifier frontier regressed");
    this.sealedClock = through;
    this.publishedAt = at;
    this.timed(() => {
      let retained = 0;
      for (const row of this.deferred) {
        if (this.ready(row)) this.check(row);
        else this.deferred[retained++] = row;
      }
      this.deferred.length = retained;
    });
  }

  private check(row: ReadRecord) {
    if (
      this.clocks.get(row[R.basisPosition]) !== row[R.recordedAt] ||
      !this.buckets[row[R.subject]]
    )
      throw Error("Read observation is missing its exact requested receipt or subject");
    const code = judgeReadCode(row, this.expected);
    this.judgeChecked++;
    this.verdicts[code]!++;
    if (code > 1 && this.violationSample.length < 10)
      this.violationSample.push({
        kind: VERDICTS[code]!.kind,
        phase: row[R.phase],
        subject: row[R.subject],
        basis: {
          recordedAt: row[R.recordedAt],
          validAt: row[R.validAt],
          position: row[R.basisPosition],
          kind: row[R.basisKind],
        },
        split: row[R.split],
        observed: { stamp: row[R.stamp], digest: row[R.digest] },
        expected: this.expected.expected(row[R.subject], row[R.recordedAt], row[R.validAt]),
      });
    if (row[R.error] === null)
      this.trips[row[R.roundTrips]] = (this.trips[row[R.roundTrips]] ?? 0) + 1;
    const phase = this.windows.get(row[R.phase])!;
    const hot = phase.levels.length > 0 && wasHot(row, this.expected);
    for (const window of phase.levels)
      window.add(row, code, hot, this.buckets[row[R.subject]]!, this.hops[row[R.subject]]!);
    for (const s of phase.recovery) {
      if (row[R.start] < s.bounds.from || row[R.start] + row[R.latency] > s.bounds.to) continue;
      s.routes[row[R.route]] = (s.routes[row[R.route]] ?? 0) + 1;
      if (code === 0) s.read.recordMs(row[R.latency]);
      else if (code === 1) s.errors++;
      else s.violations++;
    }
  }

  measureCapture(work: () => void) {
    this.timed(work);
  }

  get progress() {
    return {
      captured: this.total,
      compared: this.judgeChecked,
      pending: this.deferred.length,
      peakPending: this.peakDeferred,
      pendingLimit: MAX_DEFERRED,
      sealedClock: this.sealedClock,
    };
  }

  seal(through: number, at: number, frames: number) {
    this.advance(through, at);
    const journal = this.journal.seal();
    if (journal.frames !== frames || this.deferred.length || this.judgeChecked !== this.total)
      throw Error("Streaming model and observation terminal counts differ");
    return {
      ...this.progress,
      journal,
      verdicts: this.verdicts,
      violationSample: this.violationSample,
      windows: Object.fromEntries(
        [...this.windows.values()].flatMap((s) => s.levels.map((w) => [w.bounds.name, w])),
      ),
      recovery: Object.fromEntries([...this.windows].map(([phase, s]) => [phase, s.recovery])),
      trips: this.trips,
      splits: this.splits.finish(),
      comparisonAndFold: {
        reads: this.judgeChecked,
        cpuMs: this.judgeCpuMs,
        wallMs: this.judgeWallMs,
      },
      expectationCache: this.expected.diagnostics,
    };
  }
}

export type StreamReadSummary = ReturnType<StreamReads["seal"]>;
