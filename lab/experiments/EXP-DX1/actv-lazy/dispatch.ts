import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { parseOutbox } from "../../../bench/lib/w0-outbox-state.ts";
import {
  evaluate,
  worldsAt,
  itemChanges,
  itemRoot,
  cursorOps,
  pendingRoot,
  progress,
  type Format,
  type Proposal,
} from "./decision.ts";
import { Projection, type Plan } from "./projection.ts";
import { Conflict, value, type Store } from "./store.ts";

export class Dispatcher {
  private projection: Projection;
  private active?: Plan;
  private work: Promise<void> = Promise.resolve();
  private lastClosed?: Pick<Plan, "event" | "id" | "digest">;
  readonly store: Store;
  readonly format: Format;
  readonly pageSize: number;
  constructor(store: Store, format: Format = "w0", pageSize = 32) {
    assert(Number.isSafeInteger(pageSize) && pageSize > 0 && pageSize <= 64);
    this.store = store;
    this.format = format;
    this.pageSize = pageSize;
    this.projection = new Projection(store.scope, format);
  }
  close() {
    this.projection.close();
  }
  get nextDue() {
    return this.projection.nextDue();
  }
  get queryPlans() {
    return this.projection.queryPlans;
  }
  async wakeDue(at: string) {
    assert(W0.isInstant(at));
    await this.drain();
    const due = this.nextDue;
    if (!due || due > at) return;
    const c = await this.store.controls(await this.store.head());
    // [DX-ACT1] Why: a real due event survives an offline reader or dispatcher. Rejected: using the wake-up head as the cut after a later correction (each input reconstructs every earlier crossed boundary first).
    if (due >= c.at) return this.store.input("lazy/due/" + due, { kind: "due", at: due, due });
  }
  private async plan(cur: { done: number; eventId?: string; digest?: string }, head: number) {
    const done = cur.done;
    assert(
      Number.isSafeInteger(done) && done >= 0 && done <= head,
      "Impossible dispatcher frontier",
    );
    const check = (plan: Pick<Plan, "event" | "id" | "digest"> | undefined) => {
      if (done)
        assert(
          plan && plan.event === done && plan.id === cur.eventId && plan.digest === cur.digest,
          "Unproved closed source prefix",
        );
    };
    if (this.active?.event === done) {
      check(this.active);
      this.lastClosed = { event: done, id: this.active.id, digest: this.active.digest };
    }
    if (this.active && this.active.event > done) {
      check(this.lastClosed);
      return this.active;
    }
    this.active = undefined;
    while (this.projection.seen < head) {
      const page = await this.store.comp.feedPage(this.projection.seen, 16);
      assert(page.transactions.length, "Source journal has a gap");
      for (const r of page.transactions) {
        if (r.position > head) break;
        const plan = this.projection.advance(r);
        if (plan?.event === done) {
          check(plan);
          this.lastClosed = { event: done, id: plan.id, digest: plan.digest };
        }
        if (plan && plan.event > done) {
          check(this.lastClosed);
          this.active = plan;
          return plan;
        }
      }
    }
    check(this.lastClosed);
  }
  step(
    hook?: (where: "before-commit" | "after-commit", command: string) => Promise<void>,
    claim?: { proposal: Proposal; atFence?: () => Promise<void> },
  ) {
    const result = this.work.then(() => this.stepAtHead(hook, claim));
    this.work = result.then(
      () => {},
      () => {},
    );
    return result;
  }
  private async stepAtHead(
    hook?: (where: "before-commit" | "after-commit", command: string) => Promise<void>,
    claim?: { proposal: Proposal; atFence?: () => Promise<void> },
  ) {
    for (;;) {
      const s = this.store,
        p = await s.head(),
        q = claim?.proposal;
      if (q && (p !== q.basis.tx || s.scope !== q.scope || this.format !== q.format)) return;
      const c = await s.controls(p),
        cur = progress(c),
        plan = await this.plan(cur, p);
      if (c.cursor) assert(await s.cursorReceipt(c.cursor), "Unbound dispatcher cursor receipt");
      if (!plan) {
        assert(!cur.open && cur.done >= c.input, "Unclosed source prefix");
        return;
      }
      if (cur.open)
        assert(
          cur.open.event === plan.event && cur.open.digest === plan.digest,
          "Wrong event or incomplete predecessor",
        );
      const ix: number = cur.open?.slice ?? 0,
        first: number = cur.open?.first ?? 0,
        sl = plan.slices[ix]!;
      const end = Math.min(sl.subjects.length, first + this.pageSize);
      assert(sl && first <= end && (!first || cur.open.last === sl.subjects[first - 1]));
      const ids = sl.subjects.slice(first, end),
        b = { tx: sl.cut, validTime: sl.at };
      if (
        q &&
        (cur.open ||
          plan.event !== p ||
          plan.slices.length !== 1 ||
          sl.cut !== p ||
          sl.at !== q.basis.validTime ||
          c.at !== sl.at ||
          sl.subjects.length !== 1 ||
          ids[0] !== q.subject)
      )
        return;
      const historical = await s.controls(sl.cut),
        ops: any[] = [],
        deliveries: W0.Delivery[] = [];
      const changedSubjects: string[] = [];
      const worlds = await worldsAt(s, this.format, ids, b);
      const ledger = ids.length ? await s.rows(ids.map(itemRoot), p) : [];
      for (const [i, subject] of ids.entries()) {
        if (c.masks.some((r) => r.position > sl.cut))
          throw Error("UnrecoverableProtectedEvent: unpaid transition predates erasure");
        const x = evaluate(s, this.format, worlds[i]!, b, historical, c);
        if (q) assert.equal(x.witness, q.witness, "Untrusted ordinary event claim");
        if (W0.isFailure(x.output)) throw Error("Unresolved W0 candidate: " + x.output.error);
        if (x.output.workItems.some((w) => w.rule === "EVSUB"))
          throw Error("ProtectedSubscriberNeedsRuling");
        const change = itemChanges(
          ledger.filter((r) => r.entityId === itemRoot(subject)),
          W0.recordOf(x.output),
        );
        if (change.ops.length) changedSubjects.push(subject);
        ops.push(...change.ops);
        deliveries.push(...change.deliveries);
      }
      const more = end < sl.subjects.length,
        another = ix + 1 < plan.slices.length;
      const next =
        more || another
          ? {
              done: cur.done,
              ...(cur.done ? { eventId: cur.eventId, digest: cur.digest } : {}),
              open: {
                event: plan.event,
                digest: plan.digest,
                slice: more ? ix : ix + 1,
                first: more ? end : 0,
                last: more ? ids.at(-1) : null,
              },
            }
          : { done: plan.event, eventId: plan.id, digest: plan.digest };
      if (q && !changedSubjects.length) return;
      const command = q ? "lazy/live/" + q.witness : ["lazy/event", plan.id, ix, first].join("/");
      const context = {
        event: plan.event,
        eventId: plan.id,
        plan: plan.digest,
        prefix: plan.antecedent,
        cut: sl.cut,
        at: sl.at,
        slice: ix,
        first,
        end,
        keys: sha256(canonical(ids)),
        prior: sha256(canonical(cur)),
        next,
        ...(q ? { ordinary: q } : {}),
      };
      await hook?.("before-commit", command);
      try {
        const receipt = await s.commit(
          command,
          "lazy/event",
          [...ops, ...cursorOps(c, next)],
          p,
          context,
          claim?.atFence,
        );
        const nextRow = receipt.changes.at(-1);
        assert(
          nextRow?.op === "assert" &&
            nextRow.entityId === "lazy/account/dispatcher" &&
            nextRow.value.value === canonical(next),
        );
        await hook?.("after-commit", command);
        return {
          event: plan.event,
          id: plan.id,
          reason: sl.reason,
          examined: sl.examined,
          candidates: sl.subjects.length,
          subjects: ids,
          changedSubjects,
          commands: ops.length,
          deliveries,
          complete: !more && !another,
          receipt,
        };
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
      }
    }
  }
  async drain(visit?: (r: NonNullable<Awaited<ReturnType<Dispatcher["step"]>>>) => void) {
    let frames = 0;
    for (;;) {
      const r = await this.step();
      if (!r) return frames;
      visit?.(r);
      frames++;
    }
  }
}
export class Receiver {
  private db: DatabaseSync;
  private scope: string;
  private generation: string;
  constructor(file: string, scope: string, generation: string) {
    this.db = new DatabaseSync(file);
    this.scope = scope;
    this.generation = generation;
    this.db.exec(
      `PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS origin(s TEXT PRIMARY KEY,g TEXT);CREATE TABLE IF NOT EXISTS state(id TEXT PRIMARY KEY,body TEXT);CREATE TABLE IF NOT EXISTS applied(n INTEGER PRIMARY KEY,id TEXT,seq TEXT,body TEXT,UNIQUE(id,seq));CREATE TABLE IF NOT EXISTS spool(s TEXT PRIMARY KEY);CREATE TABLE IF NOT EXISTS scan(p INTEGER);`,
    );
    this.db.prepare("INSERT OR IGNORE INTO origin VALUES(?,?)").run(scope, generation);
    assert.deepEqual(
      this.db
        .prepare("SELECT s,g FROM origin")
        .all()
        .map((r) => [r.s, r.g]),
      [[scope, generation]],
    );
  }
  close() {
    this.db.close();
  }
  effects(): W0.Delivery[] {
    return this.db
      .prepare("SELECT body FROM applied ORDER BY n")
      .all()
      .map((r) => parseOutbox(String(r.body)));
  }
  private apply(d: W0.Delivery) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare("SELECT body FROM state WHERE id=?").get(d.id);
      const raw = row ? JSON.parse(String(row.body)) : null;
      const state: W0.ReceiverState = raw
        ? {
            effects: [{ id: d.id, done: BigInt(raw.done), waiting: [] }],
            projection: [{ id: d.id, seq: BigInt(raw.done), payload: raw.payload }],
          }
        : W0.EMPTY_RECEIVER;
      if (raw && d.seq <= BigInt(raw.done)) {
        const prior = this.db
          .prepare("SELECT body FROM applied WHERE id=? AND seq=?")
          .get(d.id, String(d.seq));
        assert(prior?.body === canonical(d), "Same delivery identity has different bytes");
      } else {
        const r = W0.receive(state, [d]);
        assert.deepEqual(r.applied.effects, [d], "Receiver refused a gap");
        this.db
          .prepare("INSERT INTO applied(id,seq,body) VALUES(?,?,?)")
          .run(d.id, String(d.seq), canonical(d));
        this.db
          .prepare("INSERT OR REPLACE INTO state VALUES(?,?)")
          .run(d.id, JSON.stringify({ done: String(d.seq), payload: d.payload }));
      }
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  async send(store: Store, subject: string, requested?: string, hook?: (step: string) => void) {
    assert.equal(store.scope, this.scope);
    const origin = (await store.comp.feedPage(0, 1)).transactions[0];
    assert.equal(origin?.txId, this.generation);
    for (;;) {
      const p = await store.head(),
        rows = await store.rows([pendingRoot(subject)], p);
      const ordered = rows
        .map((r) => ({ r, d: parseOutbox(r.value.value) as W0.Delivery }))
        .sort(
          (a, b) =>
            a.r.position - b.r.position ||
            (a.d.id < b.d.id ? -1 : a.d.id > b.d.id ? 1 : a.d.seq < b.d.seq ? -1 : 1),
        );
      if (!ordered.length) return;
      const { r, d } = ordered[0]!;
      assert.equal(d.subject, subject);
      if (requested) assert.equal(r.id, requested, "Earlier unacknowledged subject delivery");
      if (d.rule === "EVSUB") throw Error("ProtectedDeliveryNeedsRuling");
      hook?.("before-receive");
      this.apply(d);
      hook?.("after-receive");
      try {
        const ack = await store.commit(
          "lazy/ack/" + r.id,
          "lazy/ack",
          [{ op: "retract", id: r.id }],
          p,
          { id: d.id, seq: String(d.seq), subject },
        );
        hook?.("after-ack");
        return { d, ack };
      } catch (e) {
        if (!(e instanceof Conflict)) throw e;
      }
    }
  }
  async drain(store: Store) {
    const h = await store.head();
    let p = Number(this.db.prepare("SELECT p FROM scan").get()?.p ?? 0);
    while (p < h) {
      const page = await store.comp.feedPage(p, 32);
      assert(page.transactions.length);
      this.db.exec("BEGIN IMMEDIATE");
      try {
        for (const tx of page.transactions) {
          if (tx.position > h) break;
          assert.equal(tx.position, ++p);
          for (const c of tx.changes)
            if (c.op === "assert" && c.attribute === "lazy/delivery") {
              const d = parseOutbox(c.value.value);
              assert.equal(c.entityId, pendingRoot(d.subject));
              this.db.prepare("INSERT OR IGNORE INTO spool VALUES(?)").run(d.subject);
            }
        }
        this.db.exec("DELETE FROM scan");
        this.db.prepare("INSERT INTO scan VALUES(?)").run(p);
        this.db.exec("COMMIT");
      } catch (e) {
        this.db.exec("ROLLBACK");
        throw e;
      }
    }
    let n = 0;
    for (const row of this.db.prepare("SELECT s FROM spool ORDER BY s").all()) {
      while (await this.send(store, String(row.s))) n++;
      this.db.prepare("DELETE FROM spool WHERE s=?").run(row.s);
    }
    return n;
  }
}
