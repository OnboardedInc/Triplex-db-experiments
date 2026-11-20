import assert from "node:assert/strict";
import { Worker } from "node:worker_threads";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { projection, type Difference } from "../../actv-delta/rules.ts";
import { pack, unpack } from "../../notify1/store.ts";
import type { Point } from "../decision.ts";

export type Stored = { subject: string; rows: Difference[]; json?: string };
export type Work = {
  worlds: W0.World[];
  basis: Point;
};
export type Evaluated = { rows: Stored[]; evaluateMs: number };
export function evaluateRows(
  { worlds, basis }: Work,
  old: W0.CompiledRelease | undefined,
  next: W0.CompiledRelease,
  envelopes = false,
): Evaluated {
  const start = performance.now(),
    rows: Stored[] = [];
  for (const world of worlds) {
    // [DX-ACT1] Why: both documents use the same pinned dependency rows. Rejected: rebuilding the W0 world index for each side of the comparison.
    const index = W0.indexWorld(world, basis.tx);
    if (typeof index === "string") throw Error(index);
    const output = W0.evaluateIndexed(index, next, basis);
    const a = old ? projection(W0.evaluateIndexed(index, old, basis)) : new Map<string, string>();
    const b = projection(output);
    const changes: Difference[] = [];
    for (const k of [...new Set([...a.keys(), ...b.keys()])].sort())
      if (a.get(k) !== b.get(k)) changes.push([k, a.get(k) ?? null, b.get(k) ?? null]);
    if (changes.length || envelopes)
      rows.push({
        subject: world.subject,
        rows: changes,
        ...(envelopes ? { json: W0.outputJson(output) } : {}),
      });
  }
  return { rows, evaluateMs: performance.now() - start };
}

type CompactRow = [unknown[], unknown];
export function compact(row: Stored): [string, CompactRow[]] {
  assert(row.json === undefined);
  return [
    row.subject,
    row.rows.map(([key, , after]) => {
      const [s, ...rest] = JSON.parse(key);
      assert(s === row.subject);
      return [rest, after === null ? null : JSON.parse(after)];
    }),
  ];
}
export function encode(rows: Stored[], small: boolean) {
  return pack(small ? rows.map(compact) : rows);
}
export function decode(data: string, small: boolean): Stored[] {
  if (!small) return unpack<Stored[]>(data);
  return unpack<[string, CompactRow[]][]>(data).map(([subject, rows]) => ({
    subject,
    rows: rows.map(([rest, after]) => [
      canonical([subject, ...rest]),
      null,
      after === null ? null : canonical(after),
    ]),
  }));
}
export const encodedHash = (parts: string[]) => sha256(canonical(parts.map(sha256)));

export type MaterialClock = {
  selectionMs: number;
  readMs: number;
  evaluateMs: number;
  encodeMs: number;
  materialMs: number;
  stageWriteMs: number;
  stages: number;
  prepMs: number;
};
export const emptyMaterial = (): MaterialClock => ({
  selectionMs: 0,
  readMs: 0,
  evaluateMs: 0,
  encodeMs: 0,
  materialMs: 0,
  stageWriteMs: 0,
  stages: 0,
  prepMs: 0,
});

// [DX-ACT1] Why: each Publish owns its workers, consumes ordered pinned pages and terminates the pool before returning. Rejected: keeping a warm evaluator or creating one process for every page.
export class Evaluation {
  private readonly workers: Worker[] = [];
  private readonly running = new Map<
    Worker,
    { resolve: (r: Evaluated) => void; reject: (e: Error) => void }
  >();
  private failure?: Error;
  private readonly count: number;
  private readonly old?: W0.CompiledRelease;
  private readonly next: W0.CompiledRelease;
  private readonly envelopes: boolean;
  constructor(
    count: number,
    old: W0.CompiledRelease | undefined,
    next: W0.CompiledRelease,
    envelopes: boolean,
  ) {
    this.count = count;
    this.old = old;
    this.next = next;
    this.envelopes = envelopes;
  }
  private worker(i: number) {
    if (this.workers[i]) return this.workers[i];
    const w = new Worker(new URL("./evaluator.ts", import.meta.url), {
      workerData: { old: this.old?.doc, next: this.next.doc, envelopes: this.envelopes },
    });
    const fail = (e: Error) => {
      this.failure = e;
      for (const p of this.running.values()) p.reject(e);
      this.running.clear();
    };
    w.on("message", (r: Evaluated) => {
      const p = this.running.get(w);
      if (!p) return fail(Error("Unexpected evaluation response"));
      this.running.delete(w);
      p.resolve(r);
    });
    w.on("error", fail);
    w.on("exit", (code) => {
      if (this.running.has(w)) fail(Error("Evaluation worker exited at " + code));
    });
    this.workers[i] = w;
    return w;
  }
  async page(n: number, work: Work): Promise<Evaluated> {
    if (this.failure) throw this.failure;
    if (this.count === 1) return evaluateRows(work, this.old, this.next, this.envelopes);
    const w = this.worker(n);
    assert(!this.running.has(w));
    return new Promise((resolve, reject) => {
      this.running.set(w, { resolve, reject });
      w.postMessage(work);
    });
  }
  async close() {
    await Promise.all(this.workers.map((w) => w.terminate()));
  }
}
