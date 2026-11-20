import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { windowed } from "../../../bench/lib/load-window.ts";
import { frames, identity, sourceId, sha, type Shape, type Frame } from "./source.ts";
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
    readonly shape: Shape,
    readonly subjects: number,
    readonly width: number,
    file: string,
  ) {
    assert(comp.scopeName && comp.backend.name === "datomic");
    this.scope = comp.scopeName;
    this.source = sourceId(shape, subjects);
    this.binding = sha(JSON.stringify([this.scope, this.source, width]));
    this.ledger = new DatabaseSync(file);
    this.ledger.exec(
      "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS session(id INTEGER PRIMARY KEY CHECK(id=1), binding TEXT NOT NULL, marker TEXT NOT NULL, cursor INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS frames(first INTEGER PRIMARY KEY, end INTEGER UNIQUE NOT NULL, position INTEGER UNIQUE NOT NULL, body TEXT NOT NULL)",
    );
  }
  static async open(
    comp: CompositionHandle,
    shape: Shape,
    subjects: number,
    width: number,
    file: string,
  ) {
    const run = new Snapshot(comp, shape, subjects, width, file);
    try {
      const key = "load1/manifest/import";
      const meta = { actor: "bulk-import", commandId: key, correlationId: run.binding };
      const marker = async () => {
        const r = await comp.transactionByCommand(key);
        if (!r.ok) throw Error(r.tag);
        return r.value;
      };
      let m = await marker();
      if (!m) {
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
        [saved.binding, JSON.parse(String(saved.marker))],
        [run.binding, bound],
        "Checkpoint belongs to different source or storage",
      );
      // [DX-LOAD1] Why: a restored destination can have the right manifest and an old prefix. Rejected: trusting a local high-water integer after reopening a scope.
      if (run.ledger.prepare("SELECT 1 FROM frames LIMIT 1").get()) {
        let cursor = 0;
        const stored = run.ledger.prepare("SELECT * FROM frames ORDER BY first").iterate();
        let next = stored.next();
        for (const f of frames(shape, subjects, width)) {
          if (next.done) break;
          assert(Number(next.value.first) >= f.first);
          if (Number(next.value.first) !== f.first) continue;
          const saved = run.entry(f)!;
          const original = await lookup(comp, f, identity(run.scope, run.source, width, f));
          assert.deepEqual(original, run.summary(saved));
          if (cursor === f.first) cursor = f.end;
          next = stored.next();
        }
        assert(next.done);
        assert.equal(run.cursor(), cursor);
      }
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
    return Number(this.ledger.prepare("SELECT cursor FROM session WHERE id=1").get()!.cursor);
  }
  entry(f: Frame): Entry | undefined {
    const row = this.ledger
      .prepare("SELECT end,position,body FROM frames WHERE first=?")
      .get(f.first);
    if (!row) return;
    const e: Entry = JSON.parse(String(row.body)),
      meta = identity(this.scope, this.source, this.width, f);
    assert.deepEqual(
      [e.first, e.end, e.facts, e.command, e.digest, e.position],
      [
        f.first,
        f.end,
        f.operations.length,
        meta.commandId,
        meta.correlationId,
        Number(row.position),
      ],
    );
    assert.equal(e.end, row.end);
    return e;
  }
  async write(f: Frame, hooks: Hooks = {}) {
    const prior = this.entry(f);
    if (prior) return prior;
    const meta = identity(this.scope, this.source, this.width, f);
    let seen: Seen;
    await hooks.beforeSend?.(f.first);
    try {
      const out = await this.comp.transact(f.operations, meta);
      if (!out.ok) throw Error("Snapshot write " + out.tag + " " + String(out.error?.message));
      hooks.afterWrite?.(f.first);
      seen = ack(f, out.value);
    } catch (error) {
      const original = await lookup(this.comp, f, meta);
      if (!original) throw error;
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
        assert(Number(row.end) > cursor);
        cursor = Number(row.end);
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
    await windowed(
      frames(this.shape, this.subjects, this.width, this.cursor()),
      depth,
      async (f) => {
        await this.write(f, hooks);
      },
    );
    assert.equal(this.cursor(), this.subjects);
  }
  totals() {
    const r = this.ledger
      .prepare("SELECT count(*) n,coalesce(sum(json_extract(body,'$.facts')),0) facts FROM frames")
      .get()!;
    return { commands: Number(r.n), facts: Number(r.facts) };
  }
  // [DX-LOAD1] Why: the feed can publish concurrent disjoint frames in either order. Rejected: validating source order as native order or trusting an acknowledged byte count.
  async verify(complete = true, extra?: (r: any) => void) {
    const cut = await this.comp.currentPosition(),
      byPosition = this.ledger.prepare("SELECT * FROM frames WHERE position=?");
    let pos = 0,
      observed = 0,
      facts = 0,
      marker = 0;
    const fixture = frames(this.shape, this.subjects, this.width);
    const positions = this.ledger.prepare("SELECT first FROM frames ORDER BY first").iterate();
    for (const row of positions) {
      let step = fixture.next();
      while (!step.done && step.value.first < Number(row.first)) step = fixture.next();
      assert(!step.done && step.value.first === Number(row.first));
      const f = step.value,
        e = this.entry(f)!,
        original = await lookup(this.comp, f, identity(this.scope, this.source, this.width, f));
      assert.deepEqual(original, this.summary(e));
    }
    while (pos < cut) {
      const page = await this.comp.feedPage(pos, extra ? 8 : 1);
      assert(page.transactions.length > 0);
      for (const r of page.transactions) {
        assert.equal(r.position, ++pos);
        if (r.commandId === "load1/manifest/import") {
          assert.equal(r.correlationId, this.binding);
          assert.equal(r.changes.length, 0);
          marker++;
          continue;
        }
        const row = byPosition.get(pos);
        if (!row) {
          assert(extra && !String(r.commandId).startsWith("load1/"));
          extra(r);
          continue;
        }
        const f = frames(this.shape, this.subjects, this.width, Number(row.first)).next()
          .value as Frame;
        const e = this.entry(f)!;
        assert.deepEqual(
          record(f, identity(this.scope, this.source, this.width, f), r),
          this.summary(e),
        );
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
        for (let j = 0; j < ids.length; j += 64) {
          const p = await this.comp.sweepPage(ids.slice(j, j + 64), basis);
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
        }
        assert.deepEqual(got, expected);
        observed++;
        facts += expected.size;
      }
    }
    assert.equal(marker, 1);
    assert.equal(pos, cut);
    assert.deepEqual(this.totals(), { commands: observed, facts });
    if (complete) assert.equal(this.cursor(), this.subjects);
    return { cut, observed, facts, cursor: this.cursor() };
  }
}
