import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { DatomicClient as Client, type DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { frameEstimate } from "./frames.ts";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { ids } from "../../../../bench/lib/world.ts";
import { readFullLedgers } from "./ledger-parts.ts";
import { now } from "../../scale1/decision/observer.ts";
import { play, type PublishInterleave, type Save } from "../../scale1/decision/writes.ts";
import { keyFor } from "../../scale1/decision/plan.ts";
import { creditModeSelection } from "../../prep1/rolling-credits.ts";
import { jsonFile } from "../../v01/adopted.ts";
import { fact, openStore, type Store } from "../store.ts";
import { JoinedAccount, joinedCommandIdAt, publishBeside, type PublishOptions } from "./account.ts";
import { BulkQueue } from "./bulk.ts";
import { Reference, toWire } from "./check.ts";
import { checkForms, expectForms } from "./form-expect.ts";
import { expected as worldAt, seedPositions } from "./held-campaign.ts";
import { largeRelease, parseShape } from "./large-release.ts";
import { Settlement } from "./settlement.ts";
import { setSettlementControl } from "./settlement-control.ts";
import { editOf, saveSide, sequenceAt, type LiveContext } from "./settle-live.ts";
import { heldTape } from "./held-campaign.ts";
import { preload } from "../../v01/adopted.ts";
import type { Write } from "../../scale1/decision/plan.ts";

// [DX-ACT8] The gate for a Publish and an enrolment beside every account's saves (PUBLISH-BESIDE-SAVES.md), run by the
// held toy runner with DX_ACT8_GATE=1 after its first Publish. Parts (DX_ACT8_PARTS, comma-separated, in this order):
//   beside      Publishes of the small, the large (20 forms, 20 policies), the 200-form (ledger in parts) and the
//               by-reference release, offered while saves run in the publishing account and the nine others, under the
//               whole-head rule (refusals counted) and under the account guard; each: first correct answer, deadline
//               reads, oracle fold, settlement beside saves checked against the oracle and the independent form rule;
//               then every read pinned between the Publish's read and its record, and every racing save of the same
//               account, subject by subject.
//   adversarial a write of subject X committed between the Publish's read and its commit (after the plan's reads, and
//               inside its transaction), for each kind of fact a rule reads; a second Publish of the same account in
//               that window; an enrolment of another account in that window.
//   kill        the publishing process killed after its reads, inside its transaction, after its acknowledgement and at
//               a random moment, then the Publish offered again with the same command ID.
//   live        settlement-live cases without any pause: pause and pace, a second release published beside saves and
//               frames mid-settlement.
//   enrol       nine accounts enrolled beside saves (one first without the option: refused), each publishing beside
//               saves, all settling at once through one queue, each checked against its own oracle.
//   restart     (not in the default list; DX_ACT8_PARTS=restart) the transactor, then the write gateway, restarted
//               (`docker restart`) after a Publish's reads, inside its transaction, and before a settlement frame's
//               commit; the same command then offered again until acknowledged: one record for its command ID, the
//               next notice sequence, settlement equal to the oracle. Saves stopped (the tape cannot resolve a save
//               lost in a restart).
// A removal on request in a Publish's window runs in the miniature (scale2/mini.ts, DX_SCALE2_REMOVAL=1): this toy
// stack gives its two gateways no shared removal directory, so a protected database cannot be loaded here.
// Clocks are diagnostic; counts are exact. Every check failing stops the run.

type Read = { started: number; ended: number; result: { subject: string; route: string; json: string; basis: { tx: number; validTime: string } } };
type Release = LiveContext["releases"][number] & { read?: number; tries?: number; offer?: number; received?: number };
export type GateContext = Omit<LiveContext, "offer"> & {
  offer: (doc: W0.ReleaseDoc, id: string, offered: number, options?: PublishOptions) => Promise<Release>;
  firstCorrect: (r: Release, i: number, offered: number) => Promise<{ probe: Read; earlier: unknown[] }>;
  reader: DatomicClient;
  peer: unknown;
};
const validTime = W0.POPULATION_VALID_TIME;
const shape20 = parseShape("forms=20,policies=20,permille=1000");
const shape200 = parseShape("forms=200,policies=200,permille=1000");
// [DX-ACT8, second review] 1,000 forms with ledgers in parts on the stack (a case for DX_ACT8_BESIDE_CASES only).
const shape1000 = parseShape("forms=1000,policies=1000,permille=1000");
const shape150 = parseShape("forms=150,policies=150,permille=1000");
/** Writers the runner adopts from the journal by command ID: settlement frames, notice documents written through the
 * composition (enrolments of other accounts), and Publishes whose writing process was killed. */
const ADOPT = /^(settled-(values|notice):|notice:v1:|joined:.*:act8:(kill|restart):|account-settings:)/;
/** Commit samples of every Datomic client in this process (the reply's datoms, the gateway's transact time, request
 * bytes, HTTP calls), as `w0-http.ts` collects them; bounded. */
const commitSamples: { transactionIds: string[]; httpCalls: number; requests: any[] }[] = [];
function captureCommits() {
  const proto = Client.prototype as any;
  if (proto.__act8) return;
  proto.__act8 = true;
  const original = proto.request;
  const seen = new WeakSet<object>();
  proto.request = function (this: any, ...args: unknown[]) {
    if (!seen.has(this)) {
      seen.add(this);
      const prior = this.onCommit;
      this.onCommit = (sample: any) => {
        prior?.(sample);
        commitSamples.push({ transactionIds: sample.transactionIds ?? [], httpCalls: sample.httpCalls,
          requests: (sample.attempts ?? []).flatMap((a: any) => a.requests ?? []) });
        if (commitSamples.length > 6000) commitSamples.splice(0, 3000);
      };
    }
    return original.apply(this, args);
  };
}
const pct = (xs: number[], p: number) =>
  xs.length ? xs.toSorted((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * p) - 1)]! : null;

type Edit = LiveContext["history"] extends Map<number, (infer E)[]> ? E : never;
function insertEdit(h: Map<number, Edit[]>, subject: number, e: Edit) {
  const list = h.get(subject) ?? [];
  list.push(e);
  list.sort((x, y) => x.position - y.position);
  h.set(subject, list);
}

class Gate {
  readonly c: GateContext;
  readonly ref = new Reference();
  readonly roster: string[];
  readonly others = new Map<number, LiveContext["history"]>();
  current: Release;
  oldOf = new Map<number, W0.ReleaseDoc>();
  n = 0;
  readonly published: Release[] = [];
  readonly results: Record<string, unknown>[] = [];
  readonly between = { publishes: 0, positions: 0, reads: 0 };
  readonly racing = { before: 0, after: 0, reads: 0 };
  /** Set once the adversarial part has changed subjects' base facts: from then on a form-adding release's event may
   * also carry base-rule notices (a lowered pay rate's "pay below minimum"), so the independent form rule compares only
   * the added policies' changes and form notices and leaves the rest to the oracle, which checks everything. */
  perturbed = new Set<number>();
  /** A second client of the publishing account's data for the adversarial writes (its own counters and runtime). */
  private adversaryStore?: Store;
  async adversary() {
    this.adversaryStore ??= await openStore(this.c.s.scope, "act2-deep", "write", {
      ...this.c.descriptor,
      verifyThrough: async () => {},
      committed: (r) => this.c.ledger.joined(r),
    });
    return this.adversaryStore;
  }
  async close() {
    await this.adversaryStore?.close();
    this.ref.close();
  }
  constructor(c: GateContext) {
    this.c = c;
    this.roster = Array.from({ length: c.people }, (_, i) => W0.placementId(i));
    this.current = c.releases.at(-1)!;
  }
  historyOf(account: number) {
    if (!account) return this.c.history;
    if (!this.others.has(account)) this.others.set(account, new Map());
    return this.others.get(account)!;
  }
  world(at: number) {
    return (i: number) => worldAt(i, at, this.c.history, this.c.positions);
  }
  /** Every position up to `position` matched to a known writer (all receipts back), adopting known command IDs. */
  async verified(position: number, deadlineMs = 60_000) {
    const until = now() + deadlineMs;
    for (;;) {
      await this.c.ledger.verifyThrough(position, true, ADOPT);
      if (this.c.ledger.verified() >= position) return;
      assert(now() < until, "Receipts below position " + position + " never arrived");
      await sleep(5);
    }
  }
  /** The oracle's changed values of a release pair at a position, for the given subjects (default all). */
  async oracleChanges(doc: W0.ReleaseDoc, old: W0.ReleaseDoc | null, at: number, only?: number[]) {
    const subjects = only ?? this.roster.map((_, i) => i);
    const out: { subject: string; changes: [string, string | null][] }[] = [];
    for (let i = 0; i < subjects.length; i += 32) {
      const part = subjects.slice(i, i + 32);
      const rows = JSON.parse(await this.ref.oracle.call("check", {
        document: doc, old, basis: { tx: at, validTime }, worlds: part.map((k) => this.world(at)(k)), fold: false,
      })) as { subject: string; rows: [string, string | null, string | null][] }[];
      for (const x of rows) if (x.rows.length) out.push({ subject: x.subject, changes: x.rows.map(([k, , v]) => [k, v]) });
    }
    return out;
  }
  /** Saves in the publishing account (`own`) and/or the nine others for `seconds`, while `scenario` runs. */
  async window(label: string, own: 0 | 3.5 | 23.5 | 39.4, others: boolean, seconds: number,
    scenario: (w: { begins: number; ends: number }) => Promise<void>, thin = 1) {
    const c = this.c;
    // `thin` keeps one save in that many of the nine other accounts (long toy windows stay light).
    const from = await c.s.head();
    const tape = heldTape(c.people as never, (own || 23.5) as never, seconds)
      .filter((x) => (x.account === 0 ? own > 0 : others && x.ordinal % thin === 0)) as Write[];
    const senders = await preload(c.writer, c.seed, from, tape);
    const byOrdinal = new Map(tape.map((x) => [x.account + "/" + x.ordinal, x]));
    const gate: PublishInterleave = {
      paused: false,
      committed: (save) => {
        c.ledger.saved(save);
        const e = byOrdinal.get(save.account + "/" + save.ordinal)!;
        insertEdit(this.historyOf(save.account), save.subject, editOf(save.receipt!.p, e) as Edit);
      },
    };
    const begins = now() + 400,
      ends = begins + seconds * 1000;
    const writes = tape.length
      ? play(senders, tape, begins, c.attempt + "/act8/" + label, false, c.ordered, creditModeSelection("rolling6"), gate)
      : Promise.resolve({ rows: [] as Save[], unresolved: new Map() });
    while (now() < begins) await sleep(Math.ceil(begins - now()));
    const [w, s] = await Promise.allSettled([writes, scenario({ begins, ends })]);
    if (w.status === "rejected") throw w.reason;
    if (s.status === "rejected") throw s.reason;
    await this.verified(await c.s.head());
    // [second review] The message names the first uncertain saves' errors (runs G4off and G4off2 stopped here without them).
    assert.equal(w.value.unresolved.size, 0, "Uncertain save: " + [...w.value.unresolved.keys()].slice(0, 3)
      .map((x) => String((x as { error?: string }).error).slice(0, 200) + " (" + Math.round(((x as { end?: number }).end ?? 0) - ((x as { due?: number }).due ?? 0)) + " ms after due)").join(" | "));
    return w.value.rows as Save[];
  }
  /**
   * One Publish offered now (beside whatever saves run), measured and checked: first correct answer and deadline reads
   * (`probe`), the oracle fold in release order, settlement (`settle`) beside the saves checked against the oracle and
   * the independent form rule. A refusal under the whole-head rule is returned, not thrown.
   */
  async publish(doc: W0.ReleaseDoc, label: string, o: { options?: PublishOptions; probe?: boolean; settle?: boolean;
    inner?: () => Release | undefined } = {}) {
    const c = this.c;
    const old = this.current.doc;
    const id = c.attempt + ":act8:" + label + ":" + this.n++;
    const offered = now();
    const members = [...new Set([0, c.people - 1, Math.floor(c.people / 2), this.n % c.people])];
    const cutoff = o.probe ? (async () => {
      while (now() < offered + 1000) await sleep(Math.ceil(offered + 1000 - now()));
      const attempted = now();
      return { attempted, reads: await Promise.all(members.map((i) => c.demand.read(W0.placementId(i), { validTime }))) };
    })() : undefined;
    const refusedBefore = c.a.beside.refused, causesBefore = c.a.beside.causes.length;
    let r: Release;
    try {
      r = await c.offer(doc, id, offered, o.options);
    } catch (e) {
      const message = String((e as Error)?.message);
      if (publishBeside() || !/exhausted three serial predecessor attempts|Source changed at admission/.test(message)) throw e;
      await cutoff?.catch(() => undefined);
      return { refused: true as const, id, message, ms: now() - offered };
    }
    // A Publish of the same account committed inside this one's window (the adversarial schedule) comes first in order.
    const inner = o.inner?.();
    if (inner) await this.fold(inner, old);
    let first: number | null = null, within = false, deadline: unknown = null;
    if (o.probe) {
      const { probe } = await c.firstCorrect(r, members.at(-1)!, offered);
      first = probe.ended - offered;
      const d = await cutoff!;
      let all = true;
      for (const [k, read] of d.reads.entries()) {
        const effective = c.releases.findLast((x) => x.position <= read.result.basis.tx)!;
        await c.verifyRead(read as never, effective, members[k]!, "act8-deadline");
        if (effective.position !== r.position) all = false;
      }
      within = probe.ended <= offered + 1000 && all && d.attempted <= offered + 1025;
      deadline = { attempted: d.attempted - offered, all, bases: d.reads.map((x) => x.result.basis.tx) };
    }
    await this.fold(r, inner ? inner.doc : old);
    this.published.push(r);
    const record: Record<string, unknown> = {
      id, doc: doc.name, forms: doc.forms?.length ?? 0, read: r.read, position: r.position,
      commitsBetween: r.position - (r.read ?? r.position - 1) - 1, tries: r.tries,
      refusedTries: c.a.beside.refused - refusedBefore, causes: c.a.beside.causes.slice(causesBefore),
      ackMs: r.received !== undefined && r.offer !== undefined ? r.received - r.offer : null,
      recordBytes: (r as { recordBytes?: number }).recordBytes ?? null, firstCorrectMs: first, withinOneSecond: within, deadline,
    };
    record.cost = await this.cost(r);
    if (o.settle !== false) record.settled = await this.settle(r, inner ? inner.doc : old);
    return { refused: false as const, r, record };
  }
  /** The oracle fold of a release (in release order), after every save below it has its receipt. */
  async fold(r: Release, old: W0.ReleaseDoc) {
    await this.verified(r.position);
    await this.ref.check(this.c.a, this.roster, this.world(r.position), r.doc, { tx: r.position, validTime }, old,
      undefined, true, false);
    this.oldOf.set(r.seq, old);
    this.current = r;
  }
  /** Settles a release beside whatever saves run and checks its stored changes and its notices. */
  async settle(r: Release, old: W0.ReleaseDoc, worker?: Settlement) {
    const w = worker ?? (await Settlement.open(this.c.a, new BulkQueue(1), false, "bytes", "progress"));
    try {
      const started = now();
      await w.settle(r.seq);
      const ms = now() - started;
      const stored = await w.archive.stored(r.seq);
      assert.equal(stored.frontier.status, "stored", "release " + r.seq + " not stored");
      const got = stored.output.map((x) => ({ subject: x.subject, changes: x.changes }));
      const want = await this.oracleChanges(r.doc, old, r.position);
      if (canonical(got) !== canonical(want)) {
        jsonFile(path.join(this.c.out, "act8-diff-" + r.seq + ".json"), { got, want, position: r.position, read: r.read });
        assert.fail("stored changes differ from the oracle for release " + r.seq + " (read " + r.read + ", record " +
          r.position + ")");
      }
      const deliveries = (await w.recorder.packets(await w.recorder.archive.store.head()))
        .filter((p) => p.event === r.seq).flatMap((p) => p.deliveries.map(toWire));
      let independent: unknown = null;
      if ((r.doc.forms?.length ?? 0) > (old.forms?.length ?? 0)) {
        const by = new Map(got.map((x) => [x.subject, x.changes]));
        const t = { owing: 0, changes: 0, notices: 0 };
        for (const [i, s] of this.roster.entries()) {
          const e = expectForms(this.world(r.position)(i), r.doc, validTime);
          // [DX-ACT8, review F7] Narrowed only for the subjects the adversary changed; every other subject strictly.
          const g = checkForms(e, s, (by.get(s) ?? []) as never, deliveries.filter((d: any) => d.subject === s) as never,
            this.perturbed.has(i));
          if (e.changes.size) t.owing++;
          t.changes += g.changes;
          t.notices += g.notices;
        }
        independent = { ...t, onlyAddedSubjects: [...this.perturbed].sort((x, y) => x - y) };
      }
      // [DX-ACT8, review F7] An adversary's write reaches a subject's notices at the next release's event, which this
      // release's settlement has now recorded, so from the next release on that subject is checked strictly again.
      this.perturbed.clear();
      return { ms, changes: stored.frontier.changes, subjectsChanged: got.length, notices: deliveries.length, independent,
        frames: { values: w.archive.contest.summary(), notices: w.recorder.archive.contest.summary() } };
    } finally {
      if (!worker) await w.close();
    }
  }
  /** What one Publish cost: its changes and operation bytes, the datoms and the gateway's transact time its commit reply
   * reported, its journal entry (rows and bytes as the feed returns them), the bulk writer's estimate for its operations,
   * HTTP calls, tries, and what it guarded. */
  async cost(r: Release & { tx?: string }) {
    const c = this.c;
    const page = await c.reader.request<{ transactions: [string, number, string[]][] }>("POST",
      "/v2/db/" + c.db + "/transactions", { after: r.position - 1, limit: 1 });
    const [tx, at, rows] = page.transactions[0]!;
    assert.equal(at, r.position);
    const stored = await c.s.lookup((await c.s.comp.feedPage(r.position - 1, 1)).transactions[0]!.commandId);
    const ops = stored.changes.map((x: any) => x.op === "retract" ? { op: "retract", id: x.tripleId }
      : { op: "assert", entityId: x.entityId, attribute: x.attribute, value: x.value, validFrom: x.validFrom,
          ...(x.validTo == null ? {} : { validTo: x.validTo }) });
    const sample = commitSamples.findLast((x) => x.transactionIds.includes(tx));
    const reply = sample?.requests.filter((q) => typeof q.datoms === "number").at(-1);
    const marker = JSON.parse(stored.changes.find((x: any) => x.attribute === "lazy/activation").value.value);
    const guarded = marker.precondition === "account";
    return {
      changes: ops.length, operationBytes: Buffer.byteLength(canonical(ops)), datoms: reply?.datoms ?? null,
      transactMicros: reply?.transactMicros ?? null, requestBytes: reply?.requestBytes ?? null,
      journalRows: rows.length, journalBytes: rows.reduce((n, x) => n + Buffer.byteLength(x), 0),
      writerEstimateUs: frameEstimate(ops).us, httpCalls: sample?.httpCalls ?? null, tries: r.tries ?? 1,
      guarded: guarded
        ? { rule: "account", entityState: ["join-calendar"], tripleLive: ["tail"], revisionChecked: [...new Set(ops
            .filter((o: any) => o.op === "assert").map((o: any) => o.entityId))].length + " entities (release, tail, event)" }
        : { rule: "head", scopeWide: true },
    };
  }
  /** Every read pinned at the positions from just before the Publish's read to just after its record, all subjects. */
  async checkBetween(r: Release) {
    const c = this.c;
    const head = await c.s.head();
    const lo = Math.max(1, (r.read ?? r.position - 1) - 1), hi = Math.min(head, r.position + 1);
    let positions = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
    if (positions.length > 16) {
      const keep = new Set([lo, lo + 1, lo + 2, r.position - 1, r.position, hi]);
      const step = Math.ceil(positions.length / 10);
      positions = positions.filter((p, k) => keep.has(p) || k % step === 0);
    }
    for (const p of positions) {
      // Positions before the runner's first release have no release in force (nothing to check there).
      const effective = c.releases.findLast((x) => x.position <= p);
      if (!effective) continue;
      assert.equal(effective.position >= r.position, p >= r.position, "release in force at " + p);
      for (let i = 0; i < c.people; i++) {
        const probe = await c.demand.read(W0.placementId(i), { position: p, validTime });
        assert.equal(probe.result.basis.tx, p);
        await c.verifyRead(probe as never, effective, i, "act8-between");
        this.between.reads++;
      }
      this.between.positions++;
    }
    this.between.publishes++;
  }
  /** The publishing account's saves whose life overlapped a Publish's: each landed wholly before or after it, and a read
   * pinned at its receipt answers under the release in force there. */
  async checkRacing(rows: Save[], r: Release) {
    const c = this.c;
    for (const s of rows) {
      if (s.account !== 0 || s.status !== "acked" || s.dispatched === undefined || s.end === undefined) continue;
      if (s.end < (r.offer ?? 0) || s.dispatched > (r.received ?? Infinity)) continue;
      const p = s.receipt!.p;
      assert.notEqual(p, r.position);
      const effective = c.releases.findLast((x) => x.position <= p)!;
      if (p < r.position) {
        this.racing.before++;
        assert(effective.position < r.position);
      } else {
        this.racing.after++;
        assert(effective.position >= r.position);
      }
      const probe = await c.demand.read(W0.placementId(s.subject), { position: p, validTime });
      await c.verifyRead(probe as never, effective, s.subject, "act8-racing");
      this.racing.reads++;
    }
  }
  /** The journal between a Publish's read and its record: commits by writer, and the record at its position. */
  async journal(r: Release, id?: string) {
    const c = this.c;
    const from = r.read ?? r.position - 1;
    const kinds: Record<string, number> = {};
    for (let at = from; at < r.position; ) {
      const page = await c.s.comp.feedPage(at, Math.min(64, r.position - at));
      assert(page.transactions.length);
      for (const t of page.transactions) {
        if (t.position > r.position) break;
        assert.equal(t.position, ++at, "journal positions contiguous");
        const own = t.changes.some((x: { entityId: string }) => x.entityId.startsWith(c.descriptor.prefix));
        const k = t.position === r.position ? "record" : (t.actor ?? "native") + (own ? ":publishing-account" : "");
        kinds[k] = (kinds[k] ?? 0) + 1;
        if (t.position === r.position) {
          assert.equal(t.actor, "lazy/join");
          if (id) assert.equal(t.commandId, await joinedCommandIdAt(c.s, id, t.position));
        }
      }
    }
    return kinds;
  }
}

/** The release after `doc`: its form-free base plus 20 forms, or back to the base. */
const nextLarge = (doc: W0.ReleaseDoc, base: W0.ReleaseDoc) => (doc.forms?.length ? base : largeRelease(base, shape20));
const toggleSmall = (doc: W0.ReleaseDoc) => (doc.name === "R1" ? W0.R2.doc : W0.R1.doc);

export async function besideGate(c: GateContext) {
  const parts = (process.env.DX_ACT8_PARTS ?? "cost,beside,adversarial,kill,live,enrol").split(",");
  assert(parts.every((p) => ["cost", "beside", "adversarial", "kill", "live", "enrol", "restart"].includes(p)));
  assert.equal(process.env.TX2_SETTLE_FRAMES, "bytes", "the gate settles with byte frames");
  assert([undefined, "read-cut"].includes(process.env.DX_ACT8_INJECT), "DX_ACT8_INJECT is unset or read-cut");
  captureCommits();
  const g = new Gate(c);
  const evidence: Record<string, unknown> = { attempt: c.attempt, people: c.people, parts, startedAt: new Date().toISOString() };
  // The oracle's ledgers follow every release in order, the runner's first included.
  await g.ref.check(c.a, g.roster, g.world(g.current.position), g.current.doc, { tx: g.current.position, validTime }, null,
    undefined, true, false);
  const base = () => (g.current.doc.forms?.length ? (g.oldOf.get(g.current.seq) ?? W0.R1.doc) : g.current.doc);
  const set = (k: string, v: string | undefined) => (v === undefined ? delete process.env[k] : (process.env[k] = v));
  try {
    // Each part's evidence is written as it completes, so a later failure keeps the earlier parts.
    const keep = (name: string, value: unknown) => {
      evidence[name] = value;
      jsonFile(path.join(c.out, "act8-" + name + ".json"), value);
    };
    if (parts.includes("cost")) keep("cost", await costPart(g, base, set));
    if (parts.includes("beside")) keep("beside", await besidePart(g, base, set));
    if (parts.includes("adversarial")) keep("adversarial", await adversarialPart(g, base, set));
    if (parts.includes("kill")) keep("kill", await killPart(g, base, set));
    if (parts.includes("live")) keep("live", await livePart(g, base, set));
    if (parts.includes("enrol")) keep("enrol", await enrolPart(g, set));
    if (parts.includes("restart")) keep("restart", await restartPart(g, base, set));
    // Every notice of every release of the publishing account, in order, and every ledger, against the oracle.
    const w = await Settlement.open(c.a, new BulkQueue(1), false, "bytes", "progress");
    try {
      await w.settle(g.current.seq);
      const all = (await w.recorder.packets(await w.recorder.archive.store.head())).flatMap((x) => x.deliveries.map(toWire));
      assert.deepEqual(all, g.ref.owed, "notices differ from the oracle");
      // Whole ledgers and ledgers in parts (TX2_NOTICE_LEDGER=parts) alike, through the recorder's own reader.
      const ldb = w.recorder.archive.db;
      // [DX-ACT8, third review U9] With the archived retired items (named by the oracle's item IDs).
      const ledgers = await readFullLedgers(ldb, g.roster, await ldb.head(), (s) => (g.ref.items.get(s) ?? []).map((i: any) => i.id));
      for (const s of g.roster)
        assert.deepEqual(ledgers.get(s)!.items.map(toWire), g.ref.items.get(s) ?? [], "ledger of " + s);
      evidence.noticesInOrder = all.length;
      evidence.ledgers = g.roster.length;
    } finally {
      await w.close();
    }
    evidence.between = g.between;
    evidence.racing = g.racing;
    evidence.besideStats = c.a.beside;
    evidence.finishedAt = new Date().toISOString();
    jsonFile(path.join(c.out, "act8-gate.json"), evidence);
    console.log("[act8] PASS " + JSON.stringify({ between: g.between, racing: g.racing, notices: evidence.noticesInOrder }));
  } finally {
    await g.close();
  }
}

// ------------------------------------------------------------------------------------------------ cost
type Setter = (k: string, v: string | undefined) => unknown;
/** With no saves running (so the whole-head rule lands too): the same releases under both rules, each Publish's cost. */
async function costPart(g: Gate, base: () => W0.ReleaseDoc, set: Setter) {
  const out: Record<string, unknown>[] = [];
  for (const docs of [undefined, "ref"] as const)
    for (const kind of ["small", "large"] as const)
      for (const rule of ["head", "account"] as const) {
        set("TX2_PUBLISH_BESIDE", rule === "account" ? "1" : undefined);
        set("TX2_RELEASE_DOCS", docs);
        for (const step of [0, 1]) {
          const cur = g.current.doc;
          const doc = kind === "small" ? toggleSmall(cur) : nextLarge(cur, base());
          const res = await g.publish(doc, "cost-" + (docs ?? "inline") + "-" + kind + "-" + rule, { settle: false });
          assert(!res.refused);
          out.push({ docs: docs ?? "inline", kind, rule, step, doc: doc.name, forms: doc.forms?.length ?? 0, ...(res.record.cost as object) });
        }
      }
  set("TX2_PUBLISH_BESIDE", "1");
  set("TX2_RELEASE_DOCS", undefined);
  console.log("[act8] cost " + JSON.stringify(out.map((x: any) => [x.docs, x.kind, x.rule, x.changes, x.operationBytes, x.datoms,
    x.journalBytes, x.writerEstimateUs, x.httpCalls])));
  return out;
}

// ------------------------------------------------------------------------------------------------ beside
async function besidePart(g: Gate, base: () => W0.ReleaseDoc, set: Setter) {
  const c = g.c;
  const out: Record<string, unknown>[] = [];
  // name, rule, release kind, own rate, others, Publishes in the window, window seconds
  const cases: [string, "head" | "account", "small" | "large" | "limits200" | "limits1000" | "ref", 0 | 3.5 | 23.5 | 39.4, boolean, number, number][] =
    (process.env.DX_ACT8_BESIDE_CASES?.split(",").map((x) => {
      const [n, rule, rel, own, oth, k, s] = x.split(":");
      return [n!, rule as never, rel as never, Number(own) as never, oth === "1", Number(k), Number(s)];
    })) ?? [
      ["head-small", "head", "small", 23.5, true, 2, 8],
      ["small-23", "account", "small", 23.5, true, 3, 12],
      ["large-23", "account", "large", 23.5, true, 2, 12],
      ["small-39", "account", "small", 39.4, true, 3, 12],
      ["large-own3", "account", "large", 3.5, true, 2, 10],
      ["large-others", "account", "large", 0, true, 2, 10],
      ["limits200-23", "account", "limits200", 23.5, true, 2, 14],
      ["ref-23", "account", "ref", 23.5, true, 2, 12],
    ];
  for (const [name, rule, kind, own, others, count, seconds] of cases) {
    set("TX2_PUBLISH_BESIDE", rule === "account" ? "1" : undefined);
    set("TX2_RELEASE_DOCS", kind === "ref" ? "ref" : undefined);
    const results: Record<string, unknown>[] = [];
    let refused = 0;
    const done: Release[] = [];
    const rows = await g.window("beside-" + name, own, others, seconds, async ({ begins, ends }) => {
      for (let k = 0; k < count; k++) {
        const at = begins + 600 + (k * (ends - begins - 1600)) / Math.max(1, count);
        while (now() < at) await sleep(Math.ceil(at - now()));
        const cur = g.current.doc;
        const doc = kind === "small" ? toggleSmall(cur)
          : kind === "limits200" ? (cur.forms?.length ? base() : largeRelease(base(), shape200))
          : kind === "limits1000" ? (cur.forms?.length ? base() : largeRelease(base(), shape1000))
          : nextLarge(cur, base());
        const res = await g.publish(doc, name, { probe: true, settle: rule === "account" });
        if (res.refused) {
          refused++;
          results.push({ refused: true, message: res.message, ms: res.ms });
          continue;
        }
        done.push(res.r);
        results.push(res.record);
      }
    });
    // After the window (every receipt back): the journal between each read and record, every pinned read there, and the
    // publishing account's racing saves.
    for (const [k, r] of done.entries()) {
      const rec = results.find((x) => (x as { position?: number }).position === r.position)!;
      rec.journal = await g.journal(r);
      await g.checkBetween(r);
      await g.checkRacing(rows, r);
    }
    if (rule === "head") {
      // A release refused under the old rule was never published: the oracle and the runner's list are unchanged.
      assert(refused >= 1, "the whole-head rule was not refused beside saves (" + name + ")");
    } else assert.equal(refused, 0, "a Publish was refused under the account guard (" + name + ")");
    const saves = {
      account: saveSide(rows.filter((x) => x.account === 0), []),
      neighbours: saveSide(rows.filter((x) => x.account > 0), []),
    };
    out.push({ name, rule, kind, own, others, seconds, offered: count, refused, publishes: results, saves });
    console.log("[act8] beside " + JSON.stringify(out.at(-1)).slice(0, 1500));
  }
  set("TX2_PUBLISH_BESIDE", "1");
  set("TX2_RELEASE_DOCS", undefined);
  // Settle the last release if a head case left it unsettled (it settles in later parts anyway).
  return out;
}

// ------------------------------------------------------------------------------------------------ adversarial
/** A kind of fact a rule reads: which of the subject's rows it is and the value it changes to. */
type Kind = { name: string; pick: (row: { entityId: string; attribute: string }, i: number, prefix: string) => boolean;
  change: (v: { type: string; value: any }) => any };
const num = (v: { type: string; value: any }, d: number) => (typeof v.value === "number" ? v.value + d : String(Number(v.value) + d));
const KINDS: Kind[] = [
  { name: "startDate", pick: (r, i, p) => r.entityId === p + ids.worker(i) && r.attribute === ":person/custom-start",
    change: (v) => "2026-10-" + String(10 + (Number(String(v.value).slice(-2)) % 15)).padStart(2, "0") },
  { name: "payRate", pick: (r, i, p) => r.entityId === p + ids.worker(i) && r.attribute === ":person/custom-pay-cents", change: (v) => num(v, -600) },
  { name: "weeklyMinutes", pick: (r, i, p) => r.entityId === p + ids.worker(i) && r.attribute === ":person/custom-weekly-minutes", change: (v) => num(v, 700) },
  { name: "background", pick: (r, i, p) => r.entityId === p + ids.worker(i) && r.attribute === ":person/custom-background",
    change: (v) => (v.value === "clear" ? "consider" : "clear") },
  { name: "stateFloor", pick: (r, i, p) => r.entityId === p + ids.worker(i) && r.attribute === ":person/custom-state-floor", change: (v) => num(v, 900) },
  { name: "localFloor", pick: (r, i, p) => r.entityId === p + ids.worker(i) && r.attribute === ":person/custom-local-floor", change: (v) => num(v, 900) },
  { name: "section1", pick: (r) => r.attribute === ":task/progress", change: (v) => (Number(v.value) > 0 ? num(v, -Number(v.value)) : num(v, 1)) },
  { name: "documentExpiry", pick: (r) => r.attribute === ":file/expiresOn", change: (v) => (String(v.value) < "2026-06-01" ? "2027-09-30" : "2026-02-01") },
  { name: "answerValue", pick: (r) => r.attribute === ":task/field-0", change: (v) => "act8-" + sha256(String(v.value)).slice(0, 12) },
  { name: "revision", pick: (r, i, p) => r.entityId === p + ids.placement(i) && r.attribute === ":placement/stamp", change: (v) => num(v, 1) },
  // [DX-ACT8, review F7] Other entities than the subject's own facts: a child entity added by reference, a reference
  // removed (adversaryWrite builds both writes).
  { name: "childFile", pick: (r, i, p) => r.entityId === p + ids.worker(i) && r.attribute === ":person/custom-start", change: (v) => v.value },
  { name: "unlinkFile", pick: (r, i, p) => r.entityId === p + ids.worker(i) && r.attribute === ":person/file", change: (v) => v.value },
];
let fileSerial = 0;
/** A hook that runs once however many tries the Publish takes (a retry plans again and would call it again). */
const once = (f: () => Promise<void>) => {
  let fired = false;
  return async () => {
    if (fired) return;
    fired = true;
    await f();
  };
};
/** Commits a write of subject `i`'s fact of `kind` now (a raw commit guarded only by its own retraction), and adds it to
 * the oracle's history. */
async function adversaryWrite(g: Gate, kind: Kind, i: number, tag: string) {
  const c = g.c;
  const prefix = c.descriptor.prefix;
  // Its own store: a write inside the Publish's transaction must not touch the Publish's store's counters.
  const a = await g.adversary();
  for (let attempt = 0; ; attempt++) {
    const head = await a.head();
    // The first subject from `i` on that has this kind of fact (not every subject has a document).
    let target: Awaited<ReturnType<Store["rows"]>>[number] | undefined;
    for (let k = 0; k < c.people && !target; k++) {
      const j = (i + k) % c.people;
      const rows = await a.rows([prefix + ids.placement(j)], head, validTime);
      target = rows.filter((r) => kind.pick(r, j, prefix)).sort((a, b) => a.entityId.localeCompare(b.entityId))[0];
      if (target) i = j;
    }
    assert(target, "no subject has a " + kind.name + " fact");
    const marker = "act8/adversary/" + sha256(c.attempt + tag).slice(0, 16);
    // [DX-ACT8, review F7] Two kinds write other entities than the picked fact: a new child entity by reference (a
    // document file with an expired date, linked from the worker) and a reference removed (a file unlinked).
    let ops: any[], facts: { e: string; a: string; v: { type: string; value: unknown }; remove?: boolean }[];
    if (kind.name === "childFile") {
      const file = prefix + ids.document(i, 9, ++fileSerial);
      const link = { type: "ref", value: file };
      ops = [{ op: "assert", entityId: target.entityId, attribute: ":person/file", value: link, validFrom: target.validFrom },
        { op: "assert", entityId: file, attribute: ":file/expiresOn", value: { type: "string", value: "2026-02-01" }, validFrom: target.validFrom }];
      facts = [{ e: target.entityId.slice(prefix.length), a: ":person/file", v: { type: "ref", value: file.slice(prefix.length) } },
        { e: file.slice(prefix.length), a: ":file/expiresOn", v: { type: "string", value: "2026-02-01" } }];
    } else if (kind.name === "unlinkFile") {
      ops = [{ op: "retract", id: target.id }];
      facts = [{ e: target.entityId.slice(prefix.length), a: target.attribute,
        v: { type: "ref", value: String(target.value.value).slice(prefix.length) }, remove: true }];
    } else {
      const v = { ...target.value, value: kind.change(target.value) };
      ops = [{ op: "retract", id: target.id },
        { op: "assert", entityId: target.entityId, attribute: target.attribute, value: v, validFrom: target.validFrom,
          ...(target.validTo == null ? {} : { validTo: target.validTo }) }];
      facts = [{ e: target.entityId.slice(prefix.length), a: target.attribute, v }];
    }
    ops.push(fact(marker, "act8/adversary", { kind: kind.name, subject: i }));
    try {
      const r = await a.commit("act8-adversary:" + sha256(c.attempt + tag + attempt).slice(0, 24), "act8/adversary", ops, head,
        { kind: kind.name }, undefined, undefined, [{ entityId: marker, tripleIds: [] }]);
      insertEdit(c.history, i, { position: r.position, version: "act8", width: 0, facts } as Edit);
      g.perturbed.add(i);
      return { position: r.position, subject: i, entity: target.entityId.slice(prefix.length), attribute: target.attribute };
    } catch (e) {
      if (attempt >= 4) throw e;
    }
  }
}
async function adversarialPart(g: Gate, base: () => W0.ReleaseDoc, set: Setter) {
  const c = g.c;
  set("TX2_PUBLISH_BESIDE", "1");
  const out: Record<string, unknown>[] = [];
  const windows = ["afterRead", "inside"] as const;
  // Saves in the nine other accounts throughout. (Before the review: the publishing account's subjects were written only
  // by the adversary, so its writes never met the save sender's cached predecessors.)
  // [DX-ACT8, review F7] The publishing account's own save tape runs in this window too (DX_ACT8_ADV_OWN, default 23.5
  // saves per second; 0 as before). The tape writes task fields 0 to 2, so with it on the adversary leaves `answerValue`
  // (task field 0) to the tape and writes every other kind.
  const own = Number(process.env.DX_ACT8_ADV_OWN ?? 23.5) as 0 | 3.5 | 23.5 | 39.4;
  assert([0, 3.5, 23.5, 39.4].includes(own));
  await g.window("adversarial", own, true, Number(process.env.DX_ACT8_ADV_SECONDS ?? 150), async () => {
    let k = 0;
    // DX_ACT8_KINDS limits the kinds (the negative control runs startDate alone with DX_ACT8_INJECT=read-cut);
    // DX_ACT8_ADV_EXTRAS=0 skips the second-Publish and enrolment steps.
    const only = process.env.DX_ACT8_KINDS?.split(",");
    for (const kind of KINDS.filter((x) => (!only || only.includes(x.name)) && !(own > 0 && x.name === "answerValue")))
      for (const where of windows) {
        const i = (k++ * 3 + 1) % c.people;
        const doc = nextLarge(g.current.doc, base());
        let landed: Awaited<ReturnType<typeof adversaryWrite>> | undefined;
        const hook = once(async () => {
          landed = await adversaryWrite(g, kind, i, kind.name + where + k);
        });
        const res = await g.publish(doc, "adv-" + kind.name + "-" + where, {
          options: where === "afterRead" ? { afterRead: hook } : { inside: hook },
        });
        assert(!res.refused && landed);
        const r = res.r;
        assert(r.read! < landed.position && landed.position < r.position,
          "the write of " + kind.name + " did not land between the Publish's read and its record");
        // Would the wrong rule (settlement at the read position) differ for this subject? The oracle answers.
        const atRead = await g.oracleChanges(r.doc, g.oldOf.get(r.seq)!, r.read!, [landed.subject]);
        const atRecord = await g.oracleChanges(r.doc, g.oldOf.get(r.seq)!, r.position, [landed.subject]);
        await g.checkBetween(r);
        out.push({ kind: kind.name, where, subject: landed.subject, write: landed, ...res.record,
          wrongRuleWouldDiffer: canonical(atRead) !== canonical(atRecord) });
      }
    // A second Publish of the same account inside the window: the first is refused once and lands after it.
    const extras = process.env.DX_ACT8_ADV_EXTRAS !== "0";
    for (const where of extras ? windows : []) {
      let inner: Release | undefined;
      const hook = once(async () => {
        inner = await c.offer(toggleSmall(g.current.doc.forms?.length ? base() : g.current.doc), c.attempt + ":act8:inner:" + where,
          now());
      });
      const outerDoc = largeRelease(toggleSmall(g.current.doc.forms?.length ? base() : g.current.doc), shape20);
      const res = await g.publish(outerDoc, "adv-second-" + where, {
        options: where === "afterRead" ? { afterRead: hook } : { inside: hook }, inner: () => inner,
      });
      assert(!res.refused && inner);
      const r = res.r;
      assert(inner.position < r.position && r.tries === 2, "the second Publish did not refuse the first exactly once");
      const receipt = await c.a.receipt(r.seq, r.position);
      assert.equal(receipt.marker.old && canonical(receipt.marker.old), canonical(inner.doc), "the first's predecessor");
      assert.equal(r.seq, inner.seq + 1);
      await g.checkBetween(inner);
      await g.checkBetween(r);
      out.push({ kind: "second-publish", where, inner: { position: inner.position, seq: inner.seq }, ...res.record });
    }
    // An enrolment of another account inside the window: the Publish is not refused.
    set("TX2_ENROL_BESIDE_SAVES", "1");
    for (const where of extras ? windows : []) {
      const index = where === "afterRead" ? 8 : 9;
      let enrolled: { commits: number } | undefined;
      const hook = once(async () => {
        const before = await c.s.head();
        const x = await enrolStore(g, index);
        enrolled = { commits: (await c.s.head()) - before };
        await x.store.close();
      });
      const res = await g.publish(nextLarge(g.current.doc, base()), "adv-enrol-" + where, {
        options: where === "afterRead" ? { afterRead: hook } : { inside: hook },
      });
      assert(!res.refused && enrolled && res.r.tries === 1, "an enrolment of another account refused the Publish");
      await g.checkBetween(res.r);
      out.push({ kind: "enrolment-of-another-account", where, account: keyFor(index), enrolCommits: enrolled.commits, ...res.record });
    }
  }, Number(process.env.DX_ACT8_THIN ?? 5));
  console.log("[act8] adversarial " + JSON.stringify(out.map((x) => [x.kind, x.where, x.tries, x.commitsBetween, x.wrongRuleWouldDiffer])));
  return out;
}

// ------------------------------------------------------------------------------------------------ kill
async function killPart(g: Gate, base: () => W0.ReleaseDoc, set: Setter) {
  const c = g.c;
  set("TX2_PUBLISH_BESIDE", "1");
  const out: Record<string, unknown>[] = [];
  await g.window("kill", 23.5, true, Number(process.env.DX_ACT8_KILL_SECONDS ?? 30), async () => {
    for (const step of ["read", "inside", "ack", "random", "random"] as const) {
      const doc = nextLarge(g.current.doc, base());
      const id = c.attempt + ":act8:kill:" + g.n++;
      const old = g.current.doc;
      const child = await publishChild(c, id, doc, step);
      // The same Publish offered again: recovered by its command ID if the killed process's record landed (no try is
      // sent), written now if not. (Not through the runner's `offer`: a recovered record has no acknowledgement here.)
      const triesBefore = c.a.beside.tries;
      const offered = now();
      const p = await c.a.publish(id, doc, validTime, "owed");
      const landedInChild = c.a.beside.tries === triesBefore;
      const seq = await sequenceAt(c.a, p.position);
      const receipt = await c.a.receipt(seq, p.position);
      assert.deepEqual([receipt.event.at, receipt.event.value.request], [p.position, id]);
      assert.equal(receipt.marker.seq, (c.releases.at(-1)?.seq ?? 0) + 1, "the next notice sequence");
      const r: Release = { position: p.position, seq, doc, durableAt: now(), offer: offered, received: now(),
        read: receipt.marker.read ?? receipt.marker.cut, tries: landedInChild ? 0 : c.a.beside.last?.tries ?? 1 };
      c.releases.push(r as never);
      await g.fold(r, old);
      g.published.push(r);
      // Exactly one record for the command ID, at the position the receipt names.
      const found = await c.s.lookup(await joinedCommandIdAt(c.s, id, r.position));
      assert.equal(found.position, r.position);
      const settled = await g.settle(r, old);
      await g.checkBetween(r);
      out.push({ step, child, landedInChild, position: r.position, read: r.read, seq: r.seq, settled });
    }
  }, Number(process.env.DX_ACT8_THIN ?? 5));
  console.log("[act8] kill " + JSON.stringify(out.map((x) => [x.step, x.landedInChild, x.position])));
  return out;
}
/** Publishes in a child process killed at `step` (or at a random moment), returning how it ended. */
async function publishChild(c: GateContext, id: string, doc: W0.ReleaseDoc, step: "read" | "inside" | "ack" | "random") {
  const child = spawn(process.execPath,
    ["--experimental-transform-types", "--no-warnings", new URL("./publish-child.ts", import.meta.url).pathname],
    { stdio: ["pipe", "ignore", "pipe"], env: { ...process.env, TX2_PUBLISH_BESIDE: "1" } });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  child.stdin.end(JSON.stringify({ scope: c.s.scope, held: c.descriptor, id, doc, validTime, step,
    killAfterMs: step === "random" ? 20 + Math.floor(Math.random() * 300) : undefined }));
  const code = await new Promise<number | string>((resolve) => child.on("close", (k, signal) => resolve(signal ?? k ?? -1)));
  assert(code === "SIGKILL" || code === 0, "publish child: " + code + " " + stderr.slice(0, 600));
  return { step, ended: code };
}

// ------------------------------------------------------------------------------------------------ restart
// [DX-ACT8, review "not tested"] A restart of the transactor (`-active`) or of the write gateway (`-write`) of this toy
// stack: completed between a Publish's reads and its transaction (`afterRead`); begun inside its transaction, 30 ms
// before its operations are sent, so the commit meets the stopping container (`inside`); begun 30 ms before the second
// values frame of its settlement is sent (`frame`). Diagnostic toy only: the containers are this run's own
// (`tx2-ha1-<attempt>-`).
const docker = (args: string[]) => new Promise<string>((resolve, reject) =>
  execFile("docker", args, { timeout: 180_000 }, (e, out, err) => (e ? reject(new Error(String(err || e))) : resolve(String(out)))));
async function restartPart(g: Gate, base: () => W0.ReleaseDoc, set: Setter) {
  const c = g.c;
  set("TX2_PUBLISH_BESIDE", "1");
  assert(process.env.DOCKER_HOST?.includes("triplex2"), "the restart part runs only against the lab VM");
  const name = (role: string) => "tx2-ha1-" + c.attempt.slice(0, 8) + "-" + role;
  const out: Record<string, unknown>[] = [];
  const restart = async (role: "active" | "write") => {
    const begun = now();
    // [DX-ACT10] Third review: DX_ACT10_KILL=1 (diagnostic only) kills the container (SIGKILL, no shutdown) and starts it
    // again, instead of a graceful restart: a commit in flight meets a gateway or transactor that is simply gone.
    if (process.env.DX_ACT10_KILL === "1") {
      await docker(["kill", name(role)]);
      await docker(["start", name(role)]);
    } else await docker(["restart", "-t", "5", name(role)]);
    // Back when the write path answers a head read and a command lookup again (a lookup syncs with the transactor, so
    // it fails until the peer reaches the restarted transactor); the commit itself is retried below.
    for (let k = 0; ; k++) {
      try { await c.s.head(); await c.s.lookup("act8-restart-probe"); break; } catch (e) { if (k > 120) throw e; await sleep(1000); }
    }
    // And the read gateway's peer, which reaches the restarted transactor on its own (the checks read through it).
    for (let k = 0; ; k++) {
      try { await c.demand.read(W0.placementId(0), { validTime }); break; } catch (e) { if (k > 120) throw e; await sleep(1000); }
    }
    return Math.round(now() - begun);
  };
  // A step after a restart, again while it fails only because a peer has not reached the restarted transactor or the
  // gateway is not back (settlement resumes from its durable progress, so running it again is the claim being tested).
  // [second review] "Transactor not available": a peer's answer while it reconnects (run G4res2, the transactor's frame case).
  const transport = /Error communicating with HOST|Transactor not available|ECONNREFUSED|ECONNRESET|socket hang up|fetch failed|Native write had no receipt|Gateway deadline/;
  const steady = async <T>(what: string, f: () => Promise<T>, retried: string[]) => {
    for (let k = 0; ; k++) {
      try { return await f(); } catch (e) {
        const m = String((e as Error)?.message);
        if (k >= 60 || !transport.test(m)) throw e;
        retried.push(what + ": " + m.split("\n")[0]!.slice(0, 120));
        await sleep(2000);
      }
    }
  };
  // The same command offered until it is acknowledged; every failure recorded (a transport failure, an unknown outcome).
  const offerUntil = async (id: string, doc: W0.ReleaseDoc, options?: PublishOptions) => {
    const failures: string[] = [];
    for (let k = 0; k < 60; k++) {
      try {
        return { p: await c.a.publish(id, doc, validTime, "owed", undefined, k === 0 ? options : undefined), failures };
      } catch (e) {
        failures.push(String((e as Error)?.constructor?.name) + ": " + String((e as Error)?.message).split("\n")[0]!.slice(0, 160));
        await sleep(2000);
      }
    }
    throw new Error("the Publish was never acknowledged after the restart: " + failures.join(" | "));
  };
  let stage = "";
  // The write gateway only on request (DX_ACT8_RESTART_ROLES=active,write): in load-* modes the toy stack publishes a
  // gateway on a host port the VM assigns when the container starts (`ha1/stack.ts` 109-111), so a restarted gateway
  // can come back on another port and this run's clients cannot reach it again.
  const roles = (process.env.DX_ACT8_RESTART_ROLES ?? "active").split(",") as ("active" | "write")[];
  assert(roles.every((r) => r === "active" || r === "write"));
  for (const role of roles)
    for (const where of ["afterRead", "inside", "frame"] as const) try {
      stage = "publish";
      const doc = nextLarge(g.current.doc, base());
      const id = c.attempt + ":act8:restart:" + role + ":" + where + ":" + g.n++;
      const old = g.current.doc;
      let restartMs: number | undefined, pending: Promise<number> | undefined;
      const hook = once(async () => {
        if (where === "afterRead") restartMs = await restart(role);
        else { pending = restart(role); await sleep(30); }
      });
      const offered = now();
      const { p, failures } = await offerUntil(id, doc,
        where === "afterRead" ? { afterRead: hook } : where === "inside" ? { inside: hook } : undefined);
      if (pending) restartMs = await pending;
      assert(where === "frame" || restartMs !== undefined, "the restart did not run inside the Publish");
      stage = "record checks";
      const retried: string[] = [];
      const seq = await steady("sequence", () => sequenceAt(c.a, p.position), retried);
      const receipt = await steady("receipt", () => c.a.receipt(seq, p.position), retried);
      assert.deepEqual([receipt.event.at, receipt.event.value.request], [p.position, id]);
      assert.equal(receipt.marker.seq, (c.releases.at(-1)?.seq ?? 0) + 1, "the next notice sequence");
      // Exactly one record for the command ID, at the position the receipt names.
      const found = await steady("lookup", async () => c.s.lookup(await joinedCommandIdAt(c.s, id, p.position)), retried);
      assert.equal(found.position, p.position);
      const r: Release = { position: p.position, seq, doc, durableAt: now(), offer: offered, received: now(),
        read: receipt.marker.read ?? receipt.marker.cut, tries: 1 };
      c.releases.push(r as never);
      await g.fold(r, old);
      g.published.push(r);
      let frame: Record<string, unknown> | null = null;
      stage = "settlement";
      if (where === "frame") {
        // Settle with a restart before the second settlement frame's commit, values or notices ([second review] in run
        // g4res at 73f1d98a6 the write gateway's case saw no second values frame, so its restart never began); that
        // frame's commit fails, the worker stops, and the release is then settled from its durable progress and checked.
        const w = await Settlement.open(c.a, new BulkQueue(1), false, "bytes", "progress");
        const stores = [...new Set([w.archive.store, w.recorder.archive.store])];
        const commits = stores.map((x) => x.commit);
        let frames = 0, restartAt = "";
        stores.forEach((x, i) => {
          (x as any).commit = async (...args: Parameters<Store["commit"]>) => {
            const id = String(args[0]);
            if (/^settled-(values|notice):/.test(id) && ++frames === 2 && !pending) {
              restartAt = id.split(":")[0]!;
              pending = restart(role);
              await sleep(30);
            }
            return commits[i]!(...args);
          };
        });
        const first = await w.settle(r.seq).then(() => "finished", (e) => "stopped: " + String(e?.message).split("\n")[0]!.slice(0, 160));
        stores.forEach((x, i) => ((x as any).commit = commits[i]));
        if (pending) restartMs = await pending;
        await w.close().catch(() => undefined);
        frame = { framesBeforeRestart: Math.min(frames, 2) - 1, restartAt, framesOffered: frames, firstRun: first };
        assert(restartMs !== undefined, "the restart did not run inside the settlement (" + frames + " frames)");
      }
      const settled = await steady("settle", () => g.settle(r, old), retried);
      stage = "pinned reads";
      await steady("pinned reads", () => g.checkBetween(r), retried);
      out.push({ role, where, restartMs, failures, retried, position: r.position, read: r.read, seq: r.seq, frame, settled });
    } catch (e) {
      jsonFile(path.join(c.out, "act8-restart-partial.json"), out);
      throw new Error("restart " + role + " " + where + " at " + stage + ": " + String((e as Error)?.message), { cause: e });
    }
  console.log("[act8] restart " + JSON.stringify(out.map((x) => [x.role, x.where, x.restartMs, (x.failures as string[]).length, x.position])));
  return out;
}

// ------------------------------------------------------------------------------------------------ live
async function livePart(g: Gate, base: () => W0.ReleaseDoc, set: Setter) {
  const c = g.c;
  set("TX2_PUBLISH_BESIDE", "1");
  const out: Record<string, unknown> = {};
  // (1) Pause and pace, with the Publish beside saves.
  const prior = process.env.TX2_SETTLE_CONTROL;
  set("TX2_SETTLE_CONTROL", "1");
  try {
    await g.window("live-pause", 23.5, true, 12, async () => {
      await sleep(600);
      const doc = nextLarge(g.current.doc, base());
      await setSettlementControl(c.s, { paused: true, by: "act8-gate" });
      const res = await g.publish(doc, "live-pause", { probe: true, settle: false });
      assert(!res.refused);
      const w = await Settlement.open(c.a, new BulkQueue(1), false, "bytes", "progress");
      try {
        const run = g.settle(res.r, g.oldOf.get(res.r.seq)!, w);
        await sleep(2000);
        const offeredWhilePaused = w.archive.contest.offered + w.recorder.archive.contest.offered;
        assert.equal(offeredWhilePaused, 0, "a paused account wrote");
        await setSettlementControl(c.s, { paused: false, paceMs: 300, by: "act8-gate" });
        const settled = await run;
        const t = [...w.archive.contest.turns, ...w.recorder.archive.contest.turns].map(([b]) => b).sort((x, y) => x - y);
        const gaps = t.slice(1).map((x, k) => x - t[k]!);
        assert(gaps.every((x) => x >= 295), "pace not kept");
        await setSettlementControl(c.s, { paused: false, paceMs: null, by: "act8-gate" });
        out.pause = { ...res.record, offeredWhilePaused, frames: t.length, minGapMs: gaps.length ? Math.min(...gaps) : null, settled };
      } finally {
        await w.close();
      }
    });
  } finally {
    set("TX2_SETTLE_CONTROL", prior);
  }
  // (2) A second release published beside saves AND settlement frames (no pause, no hold), after the first value frame.
  await g.window("live-second", 23.5, true, 14, async () => {
    await sleep(600);
    const from = base();
    const huge = largeRelease(from, shape150);
    const res = await g.publish(huge, "live-second-first", { probe: true, settle: false });
    assert(!res.refused);
    const first = res.r;
    const queue = new BulkQueue(1);
    const w = await Settlement.open(c.a, queue, false, "bytes", "progress");
    try {
      queue.pace(w.archive.turnKey(), 400);
      const firstRun = w.settle(first.seq);
      while (w.archive.contest.committed < 1) await sleep(20);
      const second = await g.publish(from, "live-second-second", { probe: true, settle: false });
      assert(!second.refused);
      queue.pace(w.archive.turnKey(), null);
      const state = (await firstRun).values.state;
      const stored = await w.archive.stored(first.seq);
      assert.equal(stored.frontier.status, "superseded");
      const got = stored.output.map((x) => ({ subject: x.subject, changes: x.changes }));
      const want = await g.oracleChanges(first.doc, g.oldOf.get(first.seq)!, first.position);
      const wanted = want.filter((x) => got.some((y) => y.subject === x.subject));
      // [DX-ACT8, review F5] Under TX2_SETTLE_FRAME_GUARDS (as under the head precondition) a frame in flight when the
      // later release lands is refused and the next one marks the release superseded, so a superseded release can stop
      // inside a split subject (`part` > 0): that last subject's stored changes are then the oracle's first ones, in
      // frame order, and every earlier subject's are all of its. No reader consults a superseded release's pages.
      const split = (stored.frontier.part ?? 0) > 0 ? got.length - 1 : -1;
      assert.equal(got.length, wanted.length, "superseded release's subjects");
      for (const [i, x] of got.entries()) {
        const w = wanted[i]!;
        assert.equal(x.subject, w.subject, "superseded release's subjects");
        if (i === split) assert(x.changes.length < w.changes.length, "a split subject's stored part is a part");
        assert.deepEqual(x.changes, i === split ? w.changes.slice(0, x.changes.length) : w.changes, "superseded release's pages");
      }
      out.splitAtSupersession = split >= 0 ? { subject: got[split]!.subject, stored: got[split]!.changes.length, of: wanted[split]!.changes.length } : null;
      const settled = await g.settle(second.r, huge, w);
      out.second = { first: { ...res.record, status: state.status, through: state.through, subjectsWritten: got.length },
        second: { ...second.record, settled } };
    } finally {
      await w.close();
    }
  });
  console.log("[act8] live " + JSON.stringify(out).slice(0, 1500));
  return out;
}

// ------------------------------------------------------------------------------------------------ enrol
type Extra = { index: number; store: Store; a: JoinedAccount; history: LiveContext["history"]; positions: number[];
  ref: Reference; current?: { position: number; seq: number; doc: W0.ReleaseDoc } };
async function enrolStore(g: Gate, index: number) {
  const c = g.c;
  const account = keyFor(index);
  const descriptor = { account, prefix: "acct/" + account + "/", people: c.people, cut: c.descriptor.cut,
    seal: sha256(canonical([c.descriptor.seal, "act8-account", account])), namespace: true };
  const store = await openStore(c.s.scope, "act2-deep", "write", {
    ...descriptor,
    verifyThrough: (p) => c.ledger.verifyThrough(p, true, ADOPT),
    committed: (r) => c.ledger.joined(r),
  });
  const a = new JoinedAccount(store);
  try {
    await a.installHeld(validTime);
  } catch (e) {
    await store.close();
    throw e;
  }
  return { index, store, a };
}
async function enrolPart(g: Gate, set: Setter) {
  const c = g.c;
  set("TX2_PUBLISH_BESIDE", "1");
  const extras: Extra[] = [];
  const out: Record<string, unknown> = {};
  const indexes = (process.env.DX_ACT8_ENROL ?? "1,2,3,4,5,6,7").split(",").map(Number);
  try {
    await g.window("enrol", 23.5, true, Number(process.env.DX_ACT8_ENROL_SECONDS ?? 40), async () => {
      await sleep(500);
      // Control: the option off, beside saves (the enrolment's own walk refuses another account's commit).
      set("TX2_ENROL_BESIDE_SAVES", undefined);
      let control = "";
      try {
        const x = await enrolStore(g, indexes[0]!);
        await x.store.close();
      } catch (e) {
        control = String((e as Error).message).slice(0, 200);
      }
      out.controlRefused = control || "not refused (no other commit landed in its walk)";
      set("TX2_ENROL_BESIDE_SAVES", "1");
      const started = now();
      for (const index of indexes) {
        const t = now();
        const x = await enrolStore(g, index);
        const positions = await seedPositions(c.writer, c.seed, index);
        extras.push({ ...x, history: g.historyOf(index), positions, ref: new Reference() });
        (out.enrolMs ??= [] as number[]) && (out.enrolMs as number[]).push(Math.round(now() - t));
      }
      out.enrolledMs = Math.round(now() - started);
      out.enrolTries = extras.map((x) => x.a.beside.enrolTries);
      // Each publishes R1 then the large release beside saves, folded by its own oracle.
      const roster = g.roster;
      for (const x of extras)
        for (const doc of [W0.R1.doc, largeRelease(W0.R1.doc, shape20)]) {
          const p = await x.a.publish(c.attempt + ":act8:" + keyFor(x.index) + ":" + doc.name + (doc.forms ? "-forms" : ""),
            doc, validTime, "owed");
          const seq = await sequenceAt(x.a, p.position);
          await g.verified(p.position);
          const old = x.current?.doc ?? null;
          await x.ref.check(x.a, roster, (i) => worldAt(i, p.position, x.history, x.positions), doc,
            { tx: p.position, validTime }, old, undefined, true, false);
          x.current = { position: p.position, seq, doc };
          assert.equal(x.a.beside.last?.landed, p.position);
        }
      out.publishTries = extras.map((x) => x.a.beside.tries);
      out.publishRefused = extras.reduce((n, x) => n + x.a.beside.refused, 0);
      assert.equal(out.publishRefused, 0, "a Publish of an enrolled account was refused");
      // All settle at once through one queue, beside the saves.
      const queue = new BulkQueue(1);
      const workers = await Promise.all(extras.map((x) => Settlement.open(x.a, queue, false, "bytes", "progress")));
      try {
        const finished: number[] = [];
        const t0 = now();
        await Promise.all(workers.map(async (w, j) => {
          await w.settle(extras[j]!.current!.seq);
          finished[j] = now() - t0;
        }));
        out.settledMs = finished.map(Math.round);
      } finally {
        for (const w of workers) await w.close();
      }
    });
    // Each account against its own oracle (every receipt is back now).
    const per: unknown[] = [];
    for (const x of extras) {
      const w = await Settlement.open(x.a, new BulkQueue(1), false, "bytes", "progress");
      try {
        const cur = x.current!;
        const stored = await w.archive.stored(cur.seq);
        assert.equal(stored.frontier.status, "stored");
        const got = stored.output.map((r) => ({ subject: r.subject, changes: r.changes }));
        const want = (JSON.parse(await x.ref.oracle.call("check", { document: cur.doc, old: W0.R1.doc,
          basis: { tx: cur.position, validTime }, worlds: g.roster.map((_, i) => worldAt(i, cur.position, x.history, x.positions)),
          fold: false })) as { subject: string; rows: [string, string | null, string | null][] }[])
          .filter((r) => r.rows.length).map((r) => ({ subject: r.subject, changes: r.rows.map(([k, , v]) => [k, v]) }));
        assert.deepEqual(got, want, "account " + x.index + " stored changes differ");
        const packets = await w.recorder.packets(await w.recorder.archive.store.head());
        const all = packets.flatMap((p) => p.deliveries.map(toWire));
        assert.deepEqual(all, x.ref.owed, "account " + x.index + " notices differ");
        const deliveries = packets.filter((p) => p.event === cur.seq).flatMap((p) => p.deliveries.map(toWire));
        const by = new Map(got.map((r) => [r.subject, r.changes]));
        const t = { owing: 0, changes: 0, notices: 0 };
        for (const [i, s] of g.roster.entries()) {
          const e = expectForms(worldAt(i, cur.position, x.history, x.positions), cur.doc, validTime);
          const k = checkForms(e, s, (by.get(s) ?? []) as never, deliveries.filter((d: any) => d.subject === s) as never);
          if (e.changes.size) t.owing++;
          t.changes += k.changes;
          t.notices += k.notices;
        }
        per.push({ account: keyFor(x.index), changes: stored.frontier.changes, notices: all.length, independent: t });
      } finally {
        await w.close();
      }
    }
    out.accounts = per;
  } finally {
    for (const x of extras) {
      x.ref.close();
      await x.store.close();
    }
  }
  console.log("[act8] enrol " + JSON.stringify(out).slice(0, 1500));
  return out;
}

export { pct };
