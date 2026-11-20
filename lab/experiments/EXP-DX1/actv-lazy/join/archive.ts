import {
  readErasure,
  recheckErasure,
  verifySameErasureAuthority,
} from "../../../../bench/lib/datomic-erasure.ts";
import assert from "node:assert/strict";
import { W0, canonical } from "../../../../bench/lib/w0-world.ts";
import { memberPage, width } from "../../notify1/census.ts";
import { Documents, hash, pack, unpack, type Op } from "../../notify1/store.ts";
import type { Store } from "../store.ts";
import { Conflict, openStore } from "../store.ts";
import { worldsAt, winner } from "../decision.ts";
import { LazyReader } from "../read.ts";
import { JoinedAccount, type Marker } from "./account.ts";
import { address } from "./index.ts";
import { evaluateRows } from "./material.ts";
import { BulkQueue, bulkClaim, bulkWireLimit, bulkUs, type BulkClass } from "./bulk.ts";

const step = 16;
assert(width % step === 0);
const progressKey = (sequence: number) => "values:" + sequence;
const pageKey = (sequence: number, from: number) => "answer:" + sequence + ":" + from;
type Answer = { subject: string; changes: [string, string | null][]; json: string };
type Page = { identity: string; start: number; through: number; previous: string; bytes: string };
type Progress = {
  identity: string;
  through: number;
  status: "pending" | "stored" | "superseded";
  hash: string;
  changes: number;
};
export const identityOf = (scope: string, marker: Marker, position: number) =>
  hash([
    scope,
    marker.joined,
    marker.seq,
    marker.release,
    marker.cut,
    marker.at,
    position,
    marker.census,
    marker.notice,
    marker.compiler,
  ]);

export class Archive {
  readonly db: Documents;
  readonly source: JoinedAccount;
  readonly store: Store;
  readonly queue: BulkQueue;
  private constructor(source: JoinedAccount, store: Store, queue: BulkQueue) {
    this.source = source;
    this.store = store;
    this.queue = queue;
    this.db = new Documents(store.comp, "settlement");
  }
  static async open(
    source: JoinedAccount,
    queue: BulkQueue,
    channel: "values" | "notices" = "values",
  ) {
    const store = await openStore(
      "lazy-settlement-" + hash([source.s.scope, channel]).slice(0, 40),
    );
    return new Archive(source, store, queue);
  }
  close() {
    return this.store.close();
  }
  async write(
    kind: BulkClass,
    id: string,
    ops: Op[],
    at: number,
    context: unknown,
    authority: Awaited<ReturnType<typeof readErasure>>,
  ) {
    // [DX-ACT1] Why: constrain native preparation and durable turns independently of page count. Rejected: a multi-megabyte atomic frame or assuming a timeout can preempt a durable native transaction.
    const estimatedWire = 4096 + 3 * Buffer.byteLength(canonical(ops));
    assert(
      estimatedWire < bulkWireLimit && bulkUs(ops.length * 5 + 16, estimatedWire) <= 8000,
      "Bulk batch exceeds W1 service estimate",
    );
    if (authority) verifySameErasureAuthority(this.source.s.comp, this.store.comp);
    // [DX-ERASE1] Why: admission can wait after a page was derived, so the same ticket belongs on the destination commit.
    // Rejected: a source read immediately before enqueueing (removal can publish while the batch waits).
    return this.queue.submit(this.source.s.scope, () =>
      bulkClaim(
        this.store.scope,
        id,
        kind,
        () => this.store.commit(id, "lazy/settlement", ops, at, context),
        authority,
      ),
    );
  }

  async values(sequence: number) {
    const r = await this.source.receipt(sequence);
    assert.equal(r.marker.storage, "owed");
    return this.db.row<Progress>(progressKey(sequence), await this.store.head());
  }
  async turn(sequence: number) {
    const a = this.source,
      s = a.s;
    const at = await this.store.head(),
      sourceAt = await s.head();
    const r = await a.receipt(sequence, sourceAt),
      { marker: m, event: e, census } = r;
    assert.equal(m.storage, "owed");
    const authority = await recheckErasure(s.comp, m.erasureSeq);
    const identity = identityOf(s.scope, m, e.at),
      key = progressKey(sequence),
      prior = await this.db.row<Progress>(key, at);
    const current: Progress = prior?.value ?? {
      identity,
      through: 0,
      status: "pending",
      hash: identity,
      changes: 0,
    };
    assert(current.identity === identity && current.through <= census.count);
    if (current.status !== "pending") return current;
    const latest = await s.controls(sourceAt);
    assert(
      latest.generation === m.joined && latest.masks.length === 0,
      "Settlement requires the unprotected joined epoch",
    );
    const displaced = latest.releases.some((x) => x.tx > e.at && x.from <= m.from);
    // [DX-ACT1] Why: output pages are immutable under their own receipt. A later release can obsolete the unfinished copy without retiring its ordered notices. Rejected: overwriting a subject's current answers from an earlier cut.
    const finish = async (next: Progress, page?: Page) => {
      const ops = [...this.db.change(key, prior, next)];
      if (page) ops.push(this.db.put(pageKey(sequence, page.start), page));
      await this.write(
        "activation",
        "settled-values:" + hash([identity, current.through, next]),
        ops,
        at,
        next,
        authority,
      );
      return next;
    };
    if (displaced) return finish({ ...current, status: "superseded" });
    if (current.through === census.count) return finish({ ...current, status: "stored" });
    assert(current.through % step === 0);
    const start = current.through,
      page = Math.floor(start / width) * width;
    const ids = (await memberPage(a.db, census, page, m.cut)).slice(
      start - page,
      start - page + step,
    );
    assert(ids.length === Math.min(step, census.count - start));
    const basis = { tx: e.at, validTime: m.at };
    const worlds = await worldsAt(s, s.profile, ids, { tx: m.cut, validTime: m.at });
    assert.deepEqual(
      worlds.map((w) => w.subject),
      ids,
    );
    const values = evaluateRows(
      { worlds, basis },
      m.old ? W0.compileRelease(m.old) : undefined,
      W0.compileRelease(m.document),
      true,
    );
    const changed = values.rows
      .filter((row) => row.rows.length)
      .map(
        (row): Answer => ({
          subject: row.subject,
          changes: row.rows.map(([k, , value]) => [k, value]),
          json: row.json!,
        }),
      );
    const through = start + ids.length;
    const next: Page = { identity, start, through, previous: current.hash, bytes: pack(changed) };
    return finish(
      {
        identity,
        through,
        status: through === census.count ? "stored" : "pending",
        hash: hash(next),
        changes: current.changes + changed.reduce((n, row) => n + row.changes.length, 0),
      },
      next,
    );
  }
  async runValues(sequence: number, onFrame?: () => Promise<void>) {
    for (;;) {
      try {
        const p = await this.turn(sequence);
        if (p.status !== "pending") return p;
        await onFrame?.();
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
      }
    }
  }
  async stored(sequence: number) {
    const { marker, event, census } = await this.source.receipt(sequence);
    const identity = identityOf(this.source.s.scope, marker, event.at),
      at = await this.store.head();
    const frontier = (await this.db.get<Progress>(progressKey(sequence), at)).value;
    assert(frontier.identity === identity && frontier.through <= census.count);
    assert(frontier.status !== "stored" || frontier.through === census.count);
    let previous = identity;
    const output: Answer[] = [];
    for (let j = 0; j < frontier.through; j += step * 32) {
      const ids = Array.from(
        { length: Math.min(32, Math.ceil((frontier.through - j) / step)) },
        (_, i) => j + i * step,
      );
      const rows = await this.db.rows<Page>(
        ids.map((i) => pageKey(sequence, i)),
        at,
      );
      for (const i of ids) {
        const p = rows.get(pageKey(sequence, i))?.value;
        assert(
          p?.identity === identity &&
            p.start === i &&
            p.through === Math.min(i + step, census.count) &&
            p.previous === previous,
        );
        output.push(...unpack<Answer[]>(p.bytes));
        previous = hash(p);
      }
    }
    assert(
      previous === frontier.hash &&
        frontier.changes === output.reduce((n, row) => n + row.changes.length, 0),
    );
    await recheckErasure(this.source.s.comp, marker.erasureSeq);
    return { frontier, output };
  }
  reader() {
    const source = this.source,
      s = source.s;
    return new LazyReader(
      s,
      s.profile,
      2 << 20,
      undefined,
      "shared-cut",
      async (subject, b, c, latest) => {
        const r = c.releases.find((entry) => entry.id === winner(c, b));
        if (r?.storage !== "owed" || r.tx !== b.tx || b.validTime !== r.at || latest.masks.length)
          return;
        const { marker, event, census } = await source.receipt(r.seq, b.tx);
        const identity = identityOf(s.scope, marker, event.at);
        const a = await source.db.row<number>(address(subject), marker.cut);
        if (!a) return;
        const at = await this.store.head(),
          keys = Array.from({ length: width / step }, (_, i) =>
            pageKey(r.seq, a.value * width + i * step),
          );
        for (const page of (await this.db.rows<Page>(keys, at)).values()) {
          assert(
            page.value.identity === identity &&
              page.key === pageKey(r.seq, page.value.start) &&
              page.value.through <= census.count,
          );
          const row = unpack<Answer[]>(page.value.bytes).find((x) => x.subject === subject);
          if (!row) continue;
          const parsed = JSON.parse(row.json);
          assert(
            parsed.subject === subject &&
              parsed.release === r.release &&
              canonical(parsed.basis) === canonical(b),
          );
          await recheckErasure(s.comp, marker.erasureSeq);
          return row.json;
        }
      },
    );
  }
}
