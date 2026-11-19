import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { bytes, sha, validate, type Source, type Group } from "./source.ts";
import type { Target } from "./native.ts";
export interface Pace {
  facts: number;
  maxFacts: number;
  maxBytes: number;
  duty: number;
}
export const pace = (facts: number, duty: number): Pace => ({
  facts,
  duty,
  maxFacts: 2048,
  maxBytes: 2 * 1024 * 1024,
});
export type Entry = {
  first: number;
  end: number;
  command: string;
  digest: string;
  txId: string;
  position: number;
  instant: number;
  facts: number;
  serviceMs: number;
  recovered: boolean;
  receiptSha256?: string;
};
type Job<T> = {
  scope: string;
  offered: number;
  work: () => Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
};
// [DX-ACT1] Why: with one non-preemptible bulk request globally, a live save can encounter at most its remaining service. Rejected: queuing the next native batch while live work is pending.
export class ImportLane {
  private queue: Job<any>[] = [];
  private active = false;
  private liveCount = 0;
  private next = 0;
  private timer?: ReturnType<typeof setTimeout>;
  readonly duty: number;
  constructor(duty: number) {
    this.duty = duty;
    assert(duty > 0 && duty <= 1);
  }
  async live<T>(send: () => Promise<T>) {
    this.observeLive(1);
    try {
      return await send();
    } finally {
      this.observeLive(-1);
    }
  }
  observeLive(delta: number) {
    this.liveCount += delta;
    assert(this.liveCount >= 0);
    if (!this.liveCount && this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.pump();
  }
  bulk<T>(scope: string, work: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ scope, offered: performance.now(), work, resolve, reject });
      this.pump();
    });
  }
  private pump() {
    if (this.active || !this.queue.length || this.timer) return;
    // [DX-ACT1] Why: a continuous stream of live offers cannot starve the oldest import indefinitely. Rejected: overriding an in-flight transaction or waking idle scopes.
    const now = performance.now();
    const wait = Math.max(this.next - now, this.liveCount ? this.queue[0]!.offered + 500 - now : 0);
    if (wait > 0) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        this.pump();
      }, Math.ceil(wait));
      return;
    }
    const j = this.queue.shift()!;
    this.active = true;
    const start = performance.now();
    void j
      .work()
      .then(j.resolve, j.reject)
      .finally(() => {
        const end = performance.now();
        this.next = end + (end - start) * (1 / this.duty - 1);
        this.active = false;
        this.pump();
      });
  }
}
export class ImportRun {
  private db: DatabaseSync;
  readonly key: string;
  readonly binding: string;
  readonly target: Target;
  readonly source: Source;
  readonly policy: Pace;
  readonly lane: ImportLane;
  private constructor(
    target: Target,
    source: Source,
    policy: Pace,
    file: string,
    lane: ImportLane,
  ) {
    this.target = target;
    this.source = source;
    this.policy = policy;
    this.lane = lane;
    assert(
      Number.isSafeInteger(policy.facts) &&
        policy.facts > 0 &&
        policy.facts <= policy.maxFacts &&
        policy.maxBytes > 0 &&
        policy.duty === lane.duty,
    );
    assert.equal(target.mode, source.header.mode);
    this.key =
      "import1-" + sha(bytes([target.scopeName, source.header.source, source.header.generation]));
    this.binding = sha(
      bytes([source.header, target.scopeName, policy.facts, policy.maxFacts, policy.maxBytes]),
    );
    this.db = new DatabaseSync(file);
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS session(binding TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS entries(first INTEGER PRIMARY KEY,end INTEGER UNIQUE,body TEXT); CREATE TABLE IF NOT EXISTS refs(ref TEXT PRIMARY KEY, change TEXT, retired INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS source_ids(id TEXT PRIMARY KEY)",
    );
  }
  static async open(
    target: Target,
    source: Source,
    policy: Pace,
    file: string,
    lane = new ImportLane(policy.duty),
  ) {
    const run = new ImportRun(target, source, policy, file, lane);
    try {
      const saved = run.db.prepare("SELECT binding FROM session").all();
      if (saved.length)
        assert.deepEqual(
          saved.map((r) => r.binding),
          [run.binding],
        );
      const id = run.key + "/manifest",
        meta = { actor: "bulk-import", commandId: id, correlationId: run.binding };
      const original = await run.claim(id, () =>
        target.write([], meta, source.header.mode === "history" ? 0 : undefined),
      );
      assert(original.record.correlationId === run.binding && original.record.changes.length === 0);
      run.db.prepare("INSERT OR IGNORE INTO session VALUES(?)").run(run.binding);
      const tail = run.last();
      if (tail) {
        const r = await run.lookup(tail.command);
        assert(
          r?.txId === tail.txId && r.position === tail.position && r.correlationId === tail.digest,
        );
      }
      return run;
    } catch (e) {
      run.close();
      throw e;
    }
  }
  close() {
    this.db.close();
  }
  last(): Entry | undefined {
    const r = this.db.prepare("SELECT body FROM entries ORDER BY first DESC LIMIT 1").get();
    return r ? JSON.parse(String(r.body)) : undefined;
  }
  *entries(): Generator<Entry> {
    for (const r of this.db.prepare("SELECT body FROM entries ORDER BY first").iterate())
      yield JSON.parse(String(r.body));
  }
  async importAt(first: number) {
    assert(Number.isSafeInteger(first) && first >= 0);
    const next = this.last()?.end ?? 0;
    if (first > next) throw Error("Gap before requested source ordinal");
    if (first === next) await this.step();
    const row = this.db.prepare("SELECT body FROM entries WHERE first=?").get(first);
    assert(row, "No source transaction starts at that ordinal");
    const e: Entry = JSON.parse(String(row.body));
    const groups = Array.from({ length: e.end - e.first }, (_, i) => this.source.group(first + i));
    const record = await this.lookup(e.command);
    assert(
      record &&
        record.txId === e.txId &&
        record.position === e.position &&
        record.instant === e.instant &&
        record.commandId === e.command,
    );
    assert.equal(record.correlationId, sha(bytes([this.binding, first, e.end, groups])));
    assert.equal(record.correlationId, e.digest);
    if (e.receiptSha256) assert.equal(sha(bytes(record)), e.receiptSha256);
    return record;
  }
  async lookup(id: string) {
    const r = await this.target.transactionByCommand(id);
    assert(r.ok);
    return r.value;
  }
  private async claim(
    command: string,
    send: () => Promise<{ txId: string; position: number; instant: number }>,
  ) {
    const prior = await this.lookup(command);
    if (prior) return { record: prior, recovered: true };
    let ack;
    try {
      ack = await send();
    } catch (error) {
      const committed = await this.lookup(command);
      if (!committed) throw error;
      return { record: committed, recovered: true };
    }
    const record = await this.lookup(command);
    assert(
      record &&
        record.txId === ack.txId &&
        record.position === ack.position &&
        record.instant === ack.instant,
    );
    return { record, recovered: false };
  }
  async step(
    hooks: {
      beforeWrite?: () => void;
      afterWrite?: () => void;
      beforeCheckpoint?: () => void;
    } = {},
  ): Promise<Entry | undefined> {
    const tail = this.last(),
      first = tail?.end ?? 0,
      h = this.source.header;
    if (first === h.groups) return;
    const groups: Group[] = [];
    let facts = 0,
      size = 0;
    for (let i = first; i < h.groups; i++) {
      const g = this.source.group(i);
      validate(g, h, i);
      const b = Buffer.byteLength(bytes(g));
      if (
        groups.length &&
        (h.mode === "history" ||
          facts + g.ops.length > this.policy.facts ||
          size + b > this.policy.maxBytes)
      )
        break;
      assert(
        g.ops.length <= this.policy.maxFacts && b <= this.policy.maxBytes,
        "Indivisible source group exceeds admitted limit",
      );
      groups.push(g);
      facts += g.ops.length;
      size += b;
      if (h.mode === "history" || facts >= this.policy.facts) break;
    }
    const end = first + groups.length,
      command = this.key + "/" + first,
      digest = sha(bytes([this.binding, first, end, groups]));
    const ops: any[] = [],
      assertions = new Set<string>(),
      retired = new Set<string>(),
      targets = new Map<string, any>();
    for (const g of groups) {
      if (h.mode === "history")
        assert(
          !this.db.prepare("SELECT 1 FROM source_ids WHERE id=?").get(g.id),
          "Duplicate source transaction",
        );
      for (const op of g.ops) {
        if (op.op === "assert") {
          assert(!assertions.has(op.ref));
          assertions.add(op.ref);
          if (h.mode === "history")
            assert(
              !this.db.prepare("SELECT 1 FROM refs WHERE ref=?").get(op.ref),
              "Duplicate assertion identity",
            );
          const { ref, ...native } = op;
          ops.push(native);
        } else {
          const mapped = this.db
            .prepare("SELECT change FROM refs WHERE ref=? AND retired=0")
            .get(op.target);
          assert(mapped && !retired.has(op.target), "Unknown or retired source assertion");
          retired.add(op.target);
          const c = JSON.parse(String(mapped.change));
          targets.set(op.target, c);
          ops.push({ op: "retract", id: c.tripleId });
        }
      }
    }
    const meta = {
      commandId: command,
      actor: "bulk-import",
      correlationId: digest,
      preconditions: ops
        .filter((op) => op.op === "retract")
        .map((op) => ({ _tag: "TripleLive", id: op.id })),
    };
    assert(
      Buffer.byteLength(bytes([ops, meta])) <= this.policy.maxBytes,
      "Native batch exceeds byte limit",
    );
    let serviceMs = 0;
    const { record: r, recovered } = await this.claim(command, () =>
      this.lane.bulk(this.target.scopeName, async () => {
        hooks.beforeWrite?.();
        const start = performance.now();
        const ack = await this.target.write(ops, meta, groups[0]!.instant);
        serviceMs = performance.now() - start;
        hooks.afterWrite?.();
        return ack;
      }),
    );
    assert(
      r.commandId === command &&
        r.actor === meta.actor &&
        r.correlationId === digest &&
        typeof r.txId === "string" &&
        Number.isSafeInteger(r.position) &&
        r.position > (tail?.position ?? 0),
    );
    if (h.mode === "history") assert.equal(r.instant, groups[0]!.instant);
    const logical = groups.flatMap((g) => g.ops);
    assert.equal(r.changes.length, logical.length);
    const ids = new Set<string>();
    for (const [i, o] of logical.entries()) {
      const c = r.changes[i];
      assert.equal(c.op, o.op);
      assert(typeof c.tripleId === "string" && !ids.has(c.tripleId));
      ids.add(c.tripleId);
      if (o.op === "assert") {
        assert.deepEqual(
          [c.entityId, c.attribute, c.value, c.validFrom, c.validTo, c.recordedAt, c.assertionTxId],
          [o.entityId, o.attribute, o.value, o.validFrom, o.validTo, r.instant, r.txId],
        );
      } else {
        const a = targets.get(o.target);
        assert.deepEqual(
          [
            c.tripleId,
            c.entityId,
            c.attribute,
            c.value,
            c.validFrom,
            c.validTo,
            c.recordedAt,
            c.assertionTxId,
            c.retractedAt,
            c.retractionTxId,
          ],
          [
            a.tripleId,
            a.entityId,
            a.attribute,
            a.value,
            a.validFrom,
            a.validTo,
            a.recordedAt,
            a.assertionTxId,
            r.instant,
            r.txId,
          ],
        );
      }
    }
    const entry: Entry = {
      first,
      end,
      command,
      digest,
      txId: r.txId,
      position: r.position,
      instant: r.instant,
      facts,
      serviceMs,
      recovered,
      receiptSha256: sha(bytes(r)),
    };
    hooks.beforeCheckpoint?.();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const old = this.db.prepare("SELECT body FROM entries WHERE first=?").get(first);
      if (old) {
        const saved: Entry = JSON.parse(String(old.body));
        assert(saved.txId === entry.txId && saved.digest === digest && saved.end === end);
        this.db.exec("COMMIT");
        return saved;
      }
      assert.equal(this.last()?.end ?? 0, first);
      if (h.mode === "history") {
        this.db.prepare("INSERT INTO source_ids VALUES(?)").run(groups[0]!.id);
        const put = this.db.prepare("INSERT INTO refs(ref,change) VALUES(?,?)");
        logical.forEach((o, i) => {
          if (o.op === "assert") put.run(o.ref, bytes(r.changes[i]));
          else this.db.prepare("UPDATE refs SET retired=1 WHERE ref=?").run(o.target);
        });
      }
      this.db.prepare("INSERT INTO entries VALUES(?,?,?)").run(first, end, bytes(entry));
      this.db.exec("COMMIT");
      return entry;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
}
