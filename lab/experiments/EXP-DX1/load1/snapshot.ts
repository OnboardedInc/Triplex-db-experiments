import { bytes } from "./export.ts";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { windowed } from "../../../bench/lib/load-window.ts";
import {
  frames,
  identity,
  sourceId,
  sha,
  type Shape,
  type SnapshotData,
  type Frame,
} from "./source.ts";
import { ack, lookup, record, type Seen } from "./oracle.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";

interface Entry extends Seen {
  first: number;
  end: number;
  command: string;
  digest: string;
  facts: number;
}
type Hooks = {
  afterWrite?: (first: number) => void;
  beforeCheckpoint?: (first: number) => void;
  beforeSend?: (first: number) => Promise<void>;
};
export class Snapshot {
  private readonly ledger: DatabaseSync;
  readonly binding: string;
  readonly source: string;
  readonly scope: string;
  private constructor(
    readonly comp: CompositionHandle,
    readonly shape: Shape | SnapshotData,
    readonly subjects: number,
    readonly width: number,
    file: string,
    readonly adaptive?: { budgetMs: number },
    readonly orderedStride?: number,
  ) {
    assert(comp.scopeName && comp.backend.name === "datomic");
    this.scope = comp.scopeName;
    if (typeof shape !== "string") assert.equal(subjects, shape.groups);
    this.source = typeof shape === "string" ? sourceId(shape, subjects) : shape.seal;
    assert(!adaptive || shape === "thin", "Time-budgeted packing requires the thin source fixture");
    this.binding = sha(
      JSON.stringify(
        adaptive
          ? [this.scope, this.source, width, "serial-budget-v1", adaptive.budgetMs]
          : orderedStride
            ? [this.scope, this.source, width, "ordered-pipeline-v1", orderedStride]
            : [this.scope, this.source, width],
      ),
    );
    this.ledger = new DatabaseSync(file);
    this.ledger.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS session(id INTEGER PRIMARY KEY CHECK(id=1), binding TEXT NOT NULL, marker TEXT NOT NULL, cursor INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS frames(first INTEGER PRIMARY KEY, end INTEGER UNIQUE NOT NULL, position INTEGER UNIQUE NOT NULL, body TEXT NOT NULL)",
    );
    if (adaptive)
      this.ledger.exec(
        "CREATE TABLE IF NOT EXISTS packing(first INTEGER PRIMARY KEY, end INTEGER UNIQUE CHECK(end>first))",
      );
  }
  get namespace() {
    return typeof this.shape === "string" ? "acct/import/" : this.shape.namespace;
  }
  get manifest() {
    return this.namespace === "acct/import/"
      ? "load1/manifest/import"
      : "load1/manifest/" + sha(this.namespace);
  }
  frameIdentity(f: Frame) {
    const meta = identity(this.scope, this.source, this.width, f);
    if (!this.orderedStride) return meta;
    const sequence = f.first / this.orderedStride;
    assert(Number.isSafeInteger(sequence) && sequence >= 0);
    assert.equal(f.end - f.first, this.orderedStride);
    const commandId = `load1/pipeline-${this.binding}/${sequence}`;
    return {
      ...meta,
      commandId,
      correlationId: sha(JSON.stringify([commandId, meta.correlationId])),
    };
  }
  private sourceFrames(first = 0, end = this.subjects) {
    if (typeof this.shape === "string") return frames(this.shape, end, this.width, first);
    assert.equal(end, this.subjects);
    return this.shape.batches(first);
  }
  private regenerate(first: number, end: number) {
    assert(
      Number.isSafeInteger(first) &&
        Number.isSafeInteger(end) &&
        0 <= first &&
        first < end &&
        end <= this.subjects,
    );
    const source = this.sourceFrames(first, end);
    const frame = source.next().value;
    assert(frame && frame.first === first && frame.end === end && source.next().done);
    return frame;
  }
  private *batches(first = 0) {
    if (!this.adaptive) {
      yield* this.sourceFrames(first);
      return;
    }
    for (const row of this.ledger
      .prepare("SELECT first,end FROM packing WHERE first>=? ORDER BY first")
      .iterate(first)) {
      yield this.regenerate(Number(row["first"]), Number(row["end"]));
    }
  }
  nextFrame(target: number): Frame | undefined {
    assert(this.adaptive && Number.isSafeInteger(target) && target > 0 && target <= this.width);
    const first = this.cursor();
    const existing = this.ledger.prepare("SELECT end FROM packing WHERE first=?").get(first);
    if (existing) return this.regenerate(first, Number(existing["end"]));
    if (first === this.subjects) return;
    const selected = this.regenerate(first, first + 1);
    let end = first + 1;
    while (selected.operations.length < target && end < this.subjects) {
      const next = this.regenerate(end, end + 1);
      if (selected.operations.length + next.operations.length > target) break;
      selected.operations.push(...next.operations);
      selected.end = ++end;
    }
    return this.regenerate(first, selected.end);
  }
  static async open(
    comp: CompositionHandle,
    shape: Shape | SnapshotData,
    subjects: number,
    width: number,
    file: string,
    adaptive?: { budgetMs: number },
    orderedStride?: number,
  ) {
    assert(
      !orderedStride ||
        (!adaptive && typeof shape !== "string" && shape.namespace === "acct/import/"),
    );
    const run = new Snapshot(comp, shape, subjects, width, file, adaptive, orderedStride);
    try {
      const key = run.manifest;
      const meta = { actor: "bulk-import", commandId: key, correlationId: run.binding };
      const marker = async () => {
        const r = await comp.transactionByCommand(key);
        if (!r.ok) throw Error(r.tag);
        return r.value;
      };
      const checkpoint = run.ledger.prepare("SELECT binding FROM session WHERE id=1").get();
      if (checkpoint)
        assert.equal(
          checkpoint["binding"],
          run.binding,
          "Checkpoint belongs to different source or storage",
        );
      let m = await marker();
      if (!m) {
        assert(!checkpoint, "Original destination manifest is missing");
        const out = await comp.transact([], meta);
        m = await marker();
        if (!m) throw Error("Missing manifest after " + (out.ok ? "acknowledgement" : out.tag));
        if (out.ok)
          assert.deepEqual(
            [out.value.txId, out.value.position, out.value.instant],
            [m.txId, m.position, m.instant],
          );
      }
      const bound = record({ first: 0, end: 0, operations: [] }, meta, m);
      run.ledger
        .prepare("INSERT OR IGNORE INTO session VALUES (1,?,?,0)")
        .run(run.binding, JSON.stringify(bound));
      const saved = run.ledger.prepare("SELECT binding,marker FROM session WHERE id=1").get()!;
      assert.deepEqual(
        [saved["binding"], JSON.parse(String(saved["marker"]))],
        [run.binding, bound],
        "Checkpoint belongs to different source or storage",
      );
      run.ledger.exec("BEGIN");
      // [DX-LOAD1] Why: a restored destination can have the right manifest and an old prefix. Rejected: trusting a local high-water integer after reopening a scope.
      let cursor = 0;
      if (run.ledger.prepare("SELECT 1 FROM frames LIMIT 1").get()) {
        const stored = run.ledger.prepare("SELECT * FROM frames ORDER BY first").iterate();
        let next = stored.next();
        for (const f of run.batches()) {
          if (next.done) break;
          assert(Number(next.value["first"]) >= f.first);
          if (Number(next.value["first"]) !== f.first) continue;
          const saved = run.entry(f)!;
          const original = await lookup(comp, f, run.frameIdentity(f));
          assert.deepEqual(original, run.summary(saved));
          if (cursor === f.first) cursor = f.end;
          next = stored.next();
        }
        assert(next.done);
      }
      assert.equal(run.cursor(), cursor);
      if (adaptive) {
        const unsettled = run.ledger
          .prepare("SELECT first,end FROM packing WHERE first>=? ORDER BY first")
          .all(cursor);
        assert(
          unsettled.length === 0 || (unsettled.length === 1 && unsettled[0]!["first"] === cursor),
        );
        if (unsettled.length) run.regenerate(cursor, Number(unsettled[0]!["end"]));
      }
      run.ledger.exec("COMMIT");
      return run;
    } catch (e) {
      run.close();
      throw e;
    }
  }
  private summary(e: Entry): Seen {
    return { txId: e.txId, position: e.position, instant: e.instant, ids: e.ids };
  }
  close() {
    this.ledger.close();
  }
  cursor() {
    return Number(this.ledger.prepare("SELECT cursor FROM session WHERE id=1").get()!["cursor"]);
  }
  entry(f: Frame): Entry | undefined {
    const row = this.ledger
      .prepare("SELECT end,position,body FROM frames WHERE first=?")
      .get(f.first);
    if (!row) return;
    const e: Entry = JSON.parse(String(row["body"])),
      meta = this.frameIdentity(f);
    assert.deepEqual(
      [e.first, e.end, e.facts, e.command, e.digest, e.position],
      [
        f.first,
        f.end,
        f.operations.length,
        meta.commandId,
        meta.correlationId,
        Number(row["position"]),
      ],
    );
    assert.equal(e.end, row["end"]);
    return e;
  }
  async write(f: Frame, hooks: Hooks = {}) {
    const prior = this.entry(f);
    if (prior) return prior;
    if (this.adaptive) {
      // [DX-LOAD2] Why: choose and commit the exact source interval before sending. Rejected: resizing an unresolved command after restart.
      assert.equal(this.cursor(), f.first);
      assert.deepEqual(f, this.regenerate(f.first, f.end));
      this.ledger.prepare("INSERT OR IGNORE INTO packing VALUES (?,?)").run(f.first, f.end);
      assert.equal(
        this.ledger.prepare("SELECT end FROM packing WHERE first=?").get(f.first)?.["end"],
        f.end,
      );
    }
    const meta = this.frameIdentity(f);
    await hooks.beforeSend?.(f.first);
    const out = await this.comp
      .transact(f.operations, meta)
      .catch((error: unknown) => ({ ok: false as const, tag: "TransportError", error }));
    let seen: Seen;
    if (out.ok) {
      // [DX-LOAD1] Why: an invalid acknowledgement and an ambiguous outcome are distinct. Rejected: covering a malformed ACK with a successful later receipt lookup.
      hooks.afterWrite?.(f.first);
      seen = ack(f, out.value);
    } else {
      const original = await lookup(this.comp, f, meta);
      if (!original) throw Error("Snapshot write " + out.tag, { cause: out.error });
      seen = original;
    }
    hooks.beforeCheckpoint?.(f.first);
    const entry: Entry = {
      first: f.first,
      end: f.end,
      facts: f.operations.length,
      command: meta.commandId,
      digest: meta.correlationId,
      ...seen,
    };
    this.ledger.exec("BEGIN IMMEDIATE");
    try {
      this.ledger
        .prepare("INSERT OR IGNORE INTO frames VALUES (?,?,?,?)")
        .run(f.first, f.end, seen.position, JSON.stringify(entry));
      assert.deepEqual(this.entry(f), entry);
      const next = this.ledger.prepare("SELECT end FROM frames WHERE first=?");
      let cursor = this.cursor(),
        row;
      while ((row = next.get(cursor))) {
        assert(Number(row["end"]) > cursor);
        cursor = Number(row["end"]);
      }
      this.ledger.prepare("UPDATE session SET cursor=? WHERE id=1").run(cursor);
      this.ledger.exec("COMMIT");
    } catch (e) {
      this.ledger.exec("ROLLBACK");
      throw e;
    }
    return entry;
  }
  async drain(depth: number, hooks: Hooks = {}) {
    await windowed(this.batches(this.cursor()), depth, async (f) => {
      await this.write(f, hooks);
    });
    assert.equal(this.cursor(), this.subjects);
  }
  totals() {
    const r = this.ledger
      .prepare("SELECT count(*) n,coalesce(sum(json_extract(body,'$.facts')),0) facts FROM frames")
      .get()!;
    return { commands: Number(r["n"]), facts: Number(r["facts"]) };
  }
  // [DX-LOAD1] Why: the feed can publish concurrent disjoint frames in either order. Rejected: validating source order as native order or trusting an acknowledged byte count.
  async verify(
    complete = true,
    extra?: (r: any) => void,
    { pageSize = extra ? 8 : 1, readDepth = 1, assertionSweep = false } = {},
  ) {
    const cut = await this.comp.currentPosition(),
      byPosition = this.ledger.prepare("SELECT * FROM frames WHERE position=?");
    const perSubject = typeof this.shape !== "string" && !assertionSweep;
    const last = !perSubject ? undefined : (await this.comp.feedPage(cut - 1, 1)).transactions[0];
    if (perSubject) assert(last?.position === cut && Number.isFinite(last.instant));
    const lastInstant = last?.instant as number;
    let pos = 0,
      observed = 0,
      facts = 0,
      marker = 0;
    const fixture = this.batches();
    const positions = this.ledger.prepare("SELECT first FROM frames ORDER BY first").iterate();
    let expectedPrefix = 0;
    function* verifyFrames() {
      for (const row of positions) {
        let step = fixture.next();
        while (!step.done && step.value.first < Number(row["first"])) step = fixture.next();
        assert(!step.done && step.value.first === Number(row["first"]));
        const f = step.value;
        if (f.first === expectedPrefix) expectedPrefix = f.end;
        yield f;
      }
    }
    // [DX-LOAD2] Why: disjoint claim reads after drain are independent and still check every original receipt.
    // Rejected: turning the feed alone into a claim-index proof or putting claim audits in the timed window.
    await windowed(verifyFrames(), this.adaptive ? 4 : readDepth, async (f) => {
      const e = this.entry(f)!;
      const original = await lookup(this.comp, f, this.frameIdentity(f));
      assert.deepEqual(original, this.summary(e));
    });
    assert.equal(this.cursor(), expectedPrefix);
    if (complete) assert.equal(expectedPrefix, this.subjects);
    const validAt = typeof this.shape === "string" ? SEED_VALID_FROM : this.shape.validAt;
    const basis = { position: cut, validAt };
    let sweepIds = new Set<string>();
    let sweepExpected = new Map<string, string>();
    async function flushSweep(comp: CompositionHandle) {
      if (!sweepIds.size) return;
      const ids = [...sweepIds];
      const pages = Array.from({ length: Math.ceil(ids.length / 64) }, (_, j) =>
        ids.slice(j * 64, (j + 1) * 64),
      );
      const observed = new Map<string, string>();
      await windowed(pages, readDepth, async (subjects) => {
        const page = await comp.sweepPage(subjects, basis);
        assert.deepEqual(page.reportedBasis, basis);
        for (const v of page.rows) {
          if (!sweepIds.has(v.entityId)) continue;
          const body = JSON.stringify([
            v.entityId,
            v.attribute,
            v.value,
            v.validFrom,
            v.validTo ?? null,
            v.position,
          ]);
          if (observed.has(v.id)) assert.equal(observed.get(v.id), body);
          observed.set(v.id, body);
        }
      });
      assert.deepEqual(observed, sweepExpected);
      sweepIds = new Set();
      sweepExpected = new Map();
    }
    while (pos < cut) {
      const page = await this.comp.feedPage(pos, pageSize);
      assert(page.transactions.length > 0);
      for (const r of page.transactions) {
        if (pos === cut) break;
        assert.equal(r.position, ++pos);
        if (r.commandId === this.manifest) {
          assert.equal(r.correlationId, this.binding);
          assert.equal(r.changes.length, 0);
          marker++;
          continue;
        }
        const row = byPosition.get(pos);
        if (!row) {
          assert(
            !r.changes.some((c: any) => c.entityId.startsWith(this.namespace)),
            "Unaccounted change in imported namespace",
          );
          extra?.(r);
          continue;
        }
        const f = this.batches(Number(row["first"])).next().value as Frame;
        const e = this.entry(f)!;
        assert.deepEqual(record(f, this.frameIdentity(f), r), this.summary(e));
        if (assertionSweep) {
          // [DX-LOAD3] Why: batch independent reads at one exact cut after the timed window.
          // Rejected: replacing a full typed readback with a sample when frame count rises.
          for (const [i, o] of f.operations.entries()) {
            assert.equal(o.op, "assert");
            sweepIds.add(o.entityId);
            const id = r.changes[i].tripleId;
            assert(!sweepExpected.has(id));
            sweepExpected.set(
              id,
              JSON.stringify([o.entityId, o.attribute, o.value, o.validFrom, null, e.position]),
            );
          }
          if (sweepIds.size >= 512) await flushSweep(this.comp);
        } else if (typeof this.shape !== "string") {
          const expected = new Map<string, string>(),
            observed = new Map<string, string>();
          const entities = new Set(f.operations.map((o) => o.entityId));
          for (const [i, o] of f.operations.entries())
            expected.set(
              r.changes[i].tripleId,
              bytes([o.entityId, o.attribute, o.value, o.validFrom, null, e.instant, e.txId]),
            );
          for (const entity of entities) {
            const pulled = await this.comp.pull(entity, {
              recordedPosition: cut,
              validAt: this.shape.validAt,
              recordedAt: lastInstant,
            });
            for (const t of pulled.triples)
              if (t.entityId === entity)
                observed.set(
                  t.id,
                  bytes([
                    t.entityId,
                    t.attribute,
                    t.value,
                    t.validFrom,
                    t.validTo?.value ?? null,
                    t.recordedAt,
                    (t.txId as { value?: string } | undefined)?.value,
                  ]),
                );
          }
          assert.deepEqual(observed, expected);
        } else {
          const expected = new Map<string, string>();
          for (const [i, o] of f.operations.entries())
            expected.set(
              r.changes[i].tripleId,
              JSON.stringify([o.entityId, o.attribute, o.value, o.validFrom, null, e.position]),
            );
          const ids = [...new Set(f.operations.map((o) => o.entityId))],
            owned = new Set(ids),
            got = new Map<string, string>(),
            basis = { position: cut, validAt: SEED_VALID_FROM };
          // [DX-LOAD2] Why: these independent reads use the same immutable cut and exhaust every exact row.
          // Rejected: sampling imported subjects or holding the VM lease for unnecessary serial read back.
          const groups = Array.from({ length: Math.ceil(ids.length / 64) }, (_, j) =>
            ids.slice(j * 64, (j + 1) * 64),
          );
          await windowed(groups, readDepth, async (group) => {
            const p = await this.comp.sweepPage(group, basis);
            assert.deepEqual(p.reportedBasis, basis);
            for (const v of p.rows)
              if (owned.has(v.entityId))
                got.set(
                  v.id,
                  JSON.stringify([
                    v.entityId,
                    v.attribute,
                    v.value,
                    v.validFrom,
                    v.validTo ?? null,
                    v.position,
                  ]),
                );
          });
          assert.deepEqual(got, expected);
        }
        observed++;
        facts += f.operations.length;
      }
    }
    await flushSweep(this.comp);
    assert.equal(marker, 1);
    assert.equal(pos, cut);
    assert.deepEqual(this.totals(), { commands: observed, facts });
    if (complete) assert.equal(this.cursor(), this.subjects);
    return { cut, observed, facts, cursor: this.cursor() };
  }
}
