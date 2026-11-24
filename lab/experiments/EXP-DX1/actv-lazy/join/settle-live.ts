import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { Documents, unpack } from "../../notify1/store.ts";
import { now } from "../../scale1/decision/observer.ts";
import { play, type PublishInterleave, type Save } from "../../scale1/decision/writes.ts";
import { creditModeSelection } from "../../prep1/rolling-credits.ts";
import { jsonFile, preload } from "../../v01/adopted.ts";
import type { AdoptedSeed } from "../../v01/adopt.ts";
import { openStore, type HeldSource, type Store } from "../store.ts";
import type { JoinedAccount } from "./account.ts";
import { BulkQueue, settlementLane } from "./bulk.ts";
import { SettlementStopped } from "./archive.ts";
import { Reference, toWire } from "./check.ts";
import { checkForms, expectForms } from "./form-expect.ts";
import type { FrameMode, Precondition } from "./frames.ts";
import { expected as worldAt, heldTape } from "./held-campaign.ts";
import type { HeldLedger } from "./held-ledger.ts";
import { largeRelease, parseShape } from "./large-release.ts";
import { Settlement } from "./settlement.ts";
import { readSettlement, setSettlementControl } from "./settlement-control.ts";

// [DX-ACT5] Why: settlement had never run beside live saves in the account (or the database) that publishes. This
// phase of the held toy runner (DX_ACT5_LIVE=1, diagnostic only) runs cases, each a Publish followed by settlement while
// an open-loop save stream runs in the SAME account (and, as a control, only in the nine others), and records exact
// counts: frames offered, refused at commit and committed per writer and per second; when settlement finished; what
// the live saves saw (status, and how many frames each overlapped). Every case is then checked exactly: stored changes
// against the oracle at the release's position (and the independent form rule for a large release), every notice of
// every release in order, every ledger, reads pinned throughout, delivered once at the end. Clocks are diagnostic.
// Rejected: the non-held gate (its settlement writes go to scopes of their own, so it cannot meet the risk).

type Read = { started: number; ended: number; result: { subject: string; route: string; json: string; basis: { tx: number; validTime: string } } };
type Release = { position: number; seq: number; doc: W0.ReleaseDoc; durableAt: number };
export type LiveContext = {
  out: string;
  s: Store;
  a: JoinedAccount;
  offer: (doc: W0.ReleaseDoc, id: string, offered: number) => Promise<Release>;
  verifyRead: (probe: Read, r: Release, i: number, where?: string) => Promise<void>;
  demand: { read: (subject: string, pin: { position?: number; validTime: string }) => Promise<Read> };
  writer: DatomicClient;
  seed: AdoptedSeed;
  people: number;
  history: Map<number, { position: number; version: string; width: number }[]>;
  positions: number[];
  ledger: HeldLedger;
  releases: Release[];
  descriptor: Pick<HeldSource, "account" | "prefix" | "people" | "cut" | "seal">;
  db: string;
  ordered: boolean;
  attempt: string;
};
type Case = {
  name: string;
  precondition: Precondition;
  frames: FrameMode;
  /** `same`: no Publish; settle the release the previous case left (for example after a `stop` case). */
  release: "large" | "huge" | "small" | "none" | "same";
  own: 0 | 3.5 | 23.5 | 39.4;
  others: boolean;
  extra?: "kill" | "second" | "multi" | "rival" | "pause" | "stop" | "guard";
  turns?: "admission";
  /** This case's save window in seconds (default DX_ACT5_SECONDS). */
  seconds?: number;
};
const validTime = W0.POPULATION_VALID_TIME;
class SkipDelivery extends Error {}
const ADOPT = /^settled-(values|notice):/;
const shape = parseShape("forms=20,policies=20,permille=1000");

export function parseCases(text: string): Case[] {
  return text.split(",").map((entry) => {
    const [name, precondition, frames, release, own, others, extra, turns, secs] = entry.split(":");
    assert(secs === undefined || secs === "" || (Number.isInteger(Number(secs)) && Number(secs) >= 2 && Number(secs) <= 7200));
    assert(name && ["head", "progress"].includes(precondition!) && ["count", "bytes"].includes(frames!));
    assert(["large", "huge", "small", "none", "same"].includes(release!) && ["0", "3.5", "23.5", "39.4"].includes(own!));
    assert(["0", "1"].includes(others!) && [undefined, "", "kill", "second", "multi", "rival", "pause", "stop", "guard"].includes(extra));
    assert([undefined, "", "admission"].includes(turns));
    return {
      name,
      precondition: precondition as Precondition,
      frames: frames as FrameMode,
      release: release as Case["release"],
      own: Number(own) as Case["own"],
      others: others === "1",
      ...(extra ? { extra: extra as Case["extra"] } : {}),
      ...(turns ? { turns: "admission" as const } : {}),
      ...(secs ? { seconds: Number(secs) } : {}),
    };
  });
}

const pct = (xs: number[], p: number) =>
  xs.length ? xs.toSorted((a, b) => a - b)[Math.max(0, Math.ceil(xs.length * p) - 1)]! : null;

/** Saves of one side: statuses, latency from due (diagnostic), and how many frame turns each one's life overlapped. */
function saveSide(rows: Save[], turns: [number, number][]) {
  const statuses: Record<string, number> = {};
  for (const r of rows) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
  const done = rows.filter((r) => r.status === "acked");
  const overlaps: Record<string, number> = {};
  const sorted = turns.toSorted((x, y) => x[0] - y[0]),
    longest = Math.max(0, ...sorted.map(([b, e]) => e - b));
  for (const r of done) {
    const from = r.dispatched!,
      to = r.end!;
    // Turns that began before the save ended and ended after it was sent (binary search, then back by the longest).
    let lo = 0,
      hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid]![0] < to) lo = mid + 1;
      else hi = mid;
    }
    let k = 0;
    for (let i = lo - 1; i >= 0 && sorted[i]![0] > from - longest - 1; i--) if (sorted[i]![1] > from) k++;
    overlaps[k] = (overlaps[k] ?? 0) + 1;
  }
  return {
    offered: rows.length,
    statuses,
    p50Ms: pct(done.map((r) => r.end! - r.due), 0.5),
    p99Ms: pct(done.map((r) => r.end! - r.due), 0.99),
    maxMs: done.length ? Math.max(...done.map((r) => r.end! - r.due)) : null,
    overlappedFrames: overlaps,
  };
}

export async function livePhase(c: LiveContext) {
  const cases = parseCases(
    process.env.DX_ACT5_CASES ??
      "control:head:bytes:none:23.5:0,quiet:head:bytes:large:0:0,own3:head:bytes:large:3.5:0,own23:head:bytes:large:23.5:0",
  );
  const defaultSeconds = Number(process.env.DX_ACT5_SECONDS ?? 8);
  // Toy windows stay short; the server mode (DX_ACT5_SERVER=1) allows up to an hour per case.
  const limit = process.env.DX_ACT5_SERVER === "1" ? 7200 : 30;
  assert(defaultSeconds >= 2 && defaultSeconds <= limit && cases.every((k) => (k.seconds ?? 0) <= limit));
  const ref = new Reference(process.env.DX_ACT5_SERVER === "1" ? 4 : 1);
  const roster = Array.from({ length: c.people }, (_, i) => W0.placementId(i));
  const world = (at: number) => (i: number) => worldAt(i, at, c.history, c.positions);
  let current = c.releases.at(-1)!;
  const oldOf = new Map<number, W0.ReleaseDoc>();
  // The oracle's ledgers follow every release in order, the first included.
  await ref.check(c.a, roster, world(current.position), current.doc, { tx: current.position, validTime }, null,
    undefined, true, false);
  const results: unknown[] = [];
  let n = 0,
    reads = 0;
  const publish = async (doc: W0.ReleaseDoc) => {
    const old = current.doc;
    const r = await c.offer(doc, c.attempt + ":act5:" + n++, now());
    await ref.check(c.a, roster, world(r.position), doc, { tx: r.position, validTime }, old, undefined, true, false);
    oldOf.set(r.seq, old);
    current = r;
    return { r, old };
  };
  /** The oracle's changed values of a release pair at the release's own position. */
  const oracleChanges = async (doc: W0.ReleaseDoc, old: W0.ReleaseDoc, at: number) => {
    const out: { subject: string; changes: [string, string | null][] }[] = [];
    // Pages of 32 subjects, one per oracle worker at a time, folded back in roster order.
    const workers = ref.workers.children;
    for (let base = 0; base < roster.length; base += 32 * workers.length) {
      const parts = await Promise.all(
        workers.map(async (oracle, w) => {
          const i = base + w * 32;
          if (i >= roster.length) return [];
          return JSON.parse(
            await oracle.call("check", {
              document: doc,
              old,
              basis: { tx: at, validTime },
              worlds: roster.slice(i, i + 32).map((_, j) => world(at)(i + j)),
              fold: false,
            }),
          ) as { subject: string; rows: [string, string | null, string | null][] }[];
        }),
      );
      for (const rows of parts)
        for (const x of rows)
          if (x.rows.length) out.push({ subject: x.subject, changes: x.rows.map(([k, , v]) => [k, v]) });
    }
    return out;
  };
  /** Reads pinned at the ledger's verified position, checked exactly against the release in force there. */
  const pinnedRead = async (i: number, where: string) => {
    await c.ledger.verifyThrough(c.ledger.pending(), true, ADOPT);
    const at = c.ledger.verified();
    const effective = c.releases.findLast((x) => x.position <= at);
    if (!effective) return;
    const probe = await c.demand.read(W0.placementId(i), { position: at, validTime });
    assert.equal(probe.result.basis.tx, at);
    await c.verifyRead(probe, effective, i, where);
    reads++;
  };
  const recipient = await openStore("lazy-act5-recipient-" + randomUUID());
  const extras: Extra[] = [];
  try {
    for (const k of cases) {
      const seconds = k.seconds ?? defaultSeconds;
      if (k.extra === "guard") {
        results.push(await guardCase(c));
        continue;
      }
      if (k.extra === "multi") {
        results.push(await multiCase(c, k, seconds, extras, { ref, roster, current: () => current, publish }));
        continue;
      }
      const base = current.doc;
      const doc =
        k.release === "large"
          ? largeRelease(base, shape)
          : k.release === "huge"
            ? largeRelease(base, parseShape("forms=150,policies=150,permille=1000"))
          : k.release === "small"
            ? base.name === "R1" ? W0.R2.doc : W0.R1.doc
            : undefined;

      const published = doc
        ? await publish(doc)
        : k.release === "same"
          ? { r: current, old: oldOf.get(current.seq)! }
          : undefined;
      // Saves: the held tape at the own rate (account 0) and/or the nine others at their usual load (the 23.5 tape).
      const tape = heldTape(c.people as never, k.own || 23.5, seconds).filter((x) =>
        x.account === 0 ? k.own > 0 : k.others,
      );
      const from = await c.s.head();
      const senders = await preload(c.writer, c.seed, from, tape);
      const queue = new BulkQueue(1);
      // The pause case: the account's settlement is paused before it starts (TX2_SETTLE_CONTROL on for this worker).
      const controlled = k.extra === "pause" ? process.env.TX2_SETTLE_CONTROL : undefined;
      if (k.extra === "pause") {
        process.env.TX2_SETTLE_CONTROL = "1";
        await setSettlementControl(c.s, { paused: true, by: "act5-gate" });
      }
      let worker = published
        ? await Settlement.open(c.a, queue, false, k.frames, k.precondition)
        : undefined;
      const sight: unknown[] = [];
      // A rival writer of the same release in the same process, with its own queue (a restart
      // that overlaps the old process, or a second host): exactly one of two frames that follow one progress row lands.
      // (A second process: two writers in one process would share the process's claim registry.)
      const rival = k.extra === "rival" && published ? { result: undefined as unknown } : undefined;
      const begins = now() + 400,
        ends = begins + seconds * 1000;
      const origin = begins - performance.timeOrigin;
      // `stop`: settlement stops at the end of the save window (its progress stays durable for a later `same` case).
      if (worker && k.extra === "stop") worker.archive.stopAt = worker.recorder.archive.stopAt = ends - performance.timeOrigin;
      let stopped = false;

      worker?.archive.contest.reset(origin);
      worker?.recorder.archive.contest.reset(origin);
      const gate: PublishInterleave = {
        paused: false,
        committed: (save) => {
          c.ledger.saved(save);
          if (!save.account) {
            const e = byOrdinal.get(save.ordinal)!;
            const edits = c.history.get(save.subject) ?? [];
            edits.push({ position: save.receipt!.p, width: e.width, version: e.version });
            c.history.set(save.subject, edits);
          }
        },
      };
      const byOrdinal = new Map(tape.filter((x) => x.account === 0).map((x) => [x.ordinal, x]));
      // Turn-taking through the account admission (DX_ACT5 case flag `admission`): frames take a credit as a bulk lane
      // that yields to waiting live saves, one frame at a time.
      const lane = k.turns === "admission" && worker ? settlementLane(queue, ends) : undefined;
      const writes = tape.length
        ? play(senders, tape, begins, c.attempt + "/act5/" + k.name, false, c.ordered,
            creditModeSelection("rolling6"), gate, false, undefined, lane)
        : Promise.resolve({ rows: [] as Save[], unresolved: new Map() });
      let settledAt: number | undefined,
        superseded: unknown;
      const kills: unknown[] = [];
      const settling = (async () => {
        if (!worker || !published) return;
        while (now() < begins) await sleep(Math.ceil(begins - now()));
        if (k.extra === "kill") {
          // Settle in a child process killed at a random moment (inside or between frames), three times, then here.
          for (let j = 0; j < 3; j++) kills.push(await killedChild(c, published.r.seq, k, 80 + Math.floor(Math.random() * 400)));
        }
        if (k.extra === "pause") {
          // Paused: nothing is written for 2 s; a restart (a new worker) is still paused for 1 s; then paced at 300 ms
          // between frames and resumed.
          const run = worker.settle(published.r.seq);
          await sleep(2000);
          sight.push({ at: "paused", status: await readSettlement(worker) });
          assert.equal(worker.archive.contest.offered + worker.recorder.archive.contest.offered, 0, "a paused account wrote");
          const restarted = await Settlement.open(c.a, queue, false, k.frames, k.precondition);
          const run2 = restarted.settle(published.r.seq);
          await sleep(1000);
          assert.equal(restarted.archive.contest.offered + restarted.recorder.archive.contest.offered, 0, "paused after restart");
          await setSettlementControl(c.s, { paused: false, paceMs: 300, by: "act5-gate" });
          await Promise.all([run, run2]);
          sight.push({ at: "done", status: await readSettlement(restarted) });
          const t = [...worker.archive.contest.turns, ...worker.recorder.archive.contest.turns,
            ...restarted.archive.contest.turns, ...restarted.recorder.archive.contest.turns].map(([b]) => b).sort((x, y) => x - y);
          const gaps = t.slice(1).map((x, i) => x - t[i]!);
          sight.push({ at: "pace", frames: t.length, minGapMs: gaps.length ? Math.min(...gaps) : null });
          assert(gaps.every((g) => g >= 295), "pace not kept: " + Math.min(...gaps));
          await restarted.close();
          await setSettlementControl(c.s, { paused: false, paceMs: null, by: "act5-gate" });
          if (controlled === undefined) delete process.env.TX2_SETTLE_CONTROL;
          else process.env.TX2_SETTLE_CONTROL = controlled;
        } else if (k.extra === "second") {
          // A second release while the first is being settled: pause saves and frames, Publish, resume.
          // Frames of this account paced 400 ms apart, so the second Publish lands after the first value frame.
          queue.pace(worker.archive.turnKey(), 400);
          const firstRun = worker.settle(published.r.seq);
          while (worker.archive.contest.committed < 1) await sleep(20);
          gate.paused = true;
          await queue.hold();
          try {
            await gate.drain?.();
            await c.ledger.verifyThrough(await c.s.head(), true, ADOPT);
            const second = await publish(base);
            superseded = { position: second.r.position, seq: second.r.seq };
          } finally {
            queue.release();
            gate.paused = false;
            gate.resume?.();
          }
          queue.pace(worker.archive.turnKey(), null);
          const first = (await firstRun).values.state;
          superseded = { ...(superseded as object), status: first.status, through: first.through, frame: first.frame };
          await worker.settle(current.seq);
        } else if (rival)
          // Both start at the same moment, after the child has booted.
          [, rival.result] = await Promise.all([
            (async () => {
              const at = now() + 4000;
              while (now() < at) await sleep(Math.ceil(at - now()));
              return worker.settle(published.r.seq);
            })(),
            killedChild(c, published.r.seq, k, 120_000, now() + 4000),
          ]);
        else
          await worker.settle(published.r.seq).catch((e) => {
            if (!(e instanceof SettlementStopped)) throw e;
            stopped = true;
          });
        if (!stopped) settledAt = now();
      })();
      const probing = (async () => {
        let i = 0;
        while (now() < ends) {
          await sleep(400);
          await pinnedRead(i++ % c.people, "act5-during:" + k.name);
        }
      })();
      // The lane hands frames back to the queue's own turns once the save window is over.
      const saved = writes.finally(() => lane?.close());
      const [w, s, p] = await Promise.allSettled([saved, settling, probing]);
      if (w.status === "rejected") throw w.reason;
      if (s.status === "rejected") throw s.reason;
      if (p.status === "rejected") throw p.reason;
      await c.ledger.verifyThrough(await c.s.head(), false, ADOPT);
      const rows = (w.value as { rows: Save[]; unresolved: Map<unknown, unknown> }).rows;
      assert.equal((w.value as { unresolved: Map<unknown, unknown> }).unresolved.size, 0, "Uncertain save");
      const turns = worker
        ? [...worker.archive.contest.turns, ...worker.recorder.archive.contest.turns].map(
            ([b, e]) => [b + performance.timeOrigin, e + performance.timeOrigin] as [number, number],
          )
        : [];
      // ---- exactness of this case ----
      const exact: Record<string, unknown> = {};
      if (worker && published && stopped) {
        const v = await worker.archive.values(published.r.seq);
        exact.release = { seq: published.r.seq, stoppedAt: v?.value ?? null };
      } else if (worker && published) {
        const seqs = k.extra === "second" ? [published.r.seq, current.seq] : [published.r.seq];
        for (const [j, seq] of seqs.entries()) {
          const r = c.releases.find((x) => x.seq === seq)!;
          const old = oldOf.get(seq)!;
          const stored = await worker.archive.stored(seq);
          const want = await oracleChanges(r.doc, old, r.position);
          const got = stored.output.map((x) => ({ subject: x.subject, changes: x.changes }));
          if (stored.frontier.status === "stored") assert.deepEqual(got, want, "stored changes differ: " + k.name);
          else {
            assert.equal(stored.frontier.status, "superseded");
            assert.deepEqual(got, want.filter((x) => got.some((g) => g.subject === x.subject)));
            assert.deepEqual(got.map((x) => x.subject), want.map((x) => x.subject).slice(0, got.length));
          }
          const packets = await worker.recorder.packets(await worker.recorder.archive.store.head());
          const deliveries = packets.filter((x) => x.event === seq).flatMap((x) => x.deliveries.map(toWire));
          let independent: unknown = null;
          if (r.doc.forms?.length && !old.forms?.length) {
            const by = new Map(got.map((x) => [x.subject, x.changes]));
            const t = { owing: 0, changes: 0, notices: 0 };
            // A superseded release is checked for the subjects it wrote (each written whole at 20 forms); its notices
            // are all recorded, so they are checked for every subject.
            const written = new Set(got.map((x) => x.subject));
            for (const [i, s] of roster.entries()) {
              const e = expectForms(world(r.position)(i), r.doc, validTime);
              if (stored.frontier.status !== "stored" && !written.has(s)) e.changes.clear();
              const g = checkForms(e, s, (by.get(s) ?? []) as never, deliveries.filter((d: any) => d.subject === s) as never);
              if (e.changes.size) t.owing++;
              t.changes += g.changes;
              t.notices += g.notices;
            }
            independent = t;
          }
          exact[j ? "second" : "release"] = {
            seq,
            doc: r.doc.name,
            status: stored.frontier.status,
            changes: stored.frontier.changes,
            subjectsChanged: got.length,
            frames: stored.frontier.frame ?? null,
            notices: deliveries.length,
            independent,
          };
        }
        const all = (await worker.recorder.packets(await worker.recorder.archive.store.head())).flatMap((x) =>
          x.deliveries.map(toWire),
        );
        assert.deepEqual(all, ref.owed, "notices differ from the oracle: " + k.name);
        const ldb = worker.recorder.archive.db,
          lat = await ldb.head();
        for (let i = 0; i < roster.length; i += 256) {
          const part = roster.slice(i, i + 256),
            lrows = await ldb.rows<string>(part.map((s) => "recorded-ledger:" + s), lat);
          for (const s of part) {
            const v = lrows.get("recorded-ledger:" + s);
            assert.deepEqual(v ? unpack<any[]>(v.value).map(toWire) : [], ref.items.get(s) ?? [], "ledger of " + s);
          }
        }
        exact.noticesInOrder = all.length;
        exact.ledgers = roster.length;
      }
      // Reads at the release's position and at the head after the case.
      for (const i of [0, c.people - 1]) await pinnedRead(i, "act5-after:" + k.name);
      const result = {
        case: k,
        seconds,
        settledMsFromStart: settledAt === undefined ? null : settledAt - begins,
        finishedWhileSaving: settledAt !== undefined && settledAt <= ends,
        stopped,
        values: worker?.archive.contest.summary() ?? null,
        notices: worker?.recorder.archive.contest.summary() ?? null,
        frameUsMax: worker
          ? Math.max(worker.archive.admitted.usMax, worker.recorder.archive.admitted.usMax)
          : null,
        kills,
        sight,
        superseded: superseded ?? null,
        lane: lane ? lane.stats() : null,
        rival: rival ? { child: rival.result } : null,
        saves: {
          account: saveSide(rows.filter((r) => r.account === 0), turns),
          neighbours: saveSide(rows.filter((r) => r.account > 0), turns),
        },
        exact,
      };
      console.log("[act5] " + JSON.stringify(result));
      jsonFile(path.join(c.out, "act5-case-" + k.name + ".json"), result);
      results.push(result);
      await worker?.close();

      // A large release is followed by its form-free predecessor again (settled quietly, checked the same way).
      if (k.release !== "none" && k.release !== "small" && k.extra !== "second" && k.extra !== "stop" && k !== cases.at(-1)) {
        const formFree = k.release === "same" ? published!.old : base;
        const back = await publish(formFree);
        const quiet = await Settlement.open(c.a, new BulkQueue(1), false, k.frames, k.precondition);
        try {
          await quiet.settle(back.r.seq);
          const stored = await quiet.archive.stored(back.r.seq);
          assert.deepEqual(
            stored.output.map((x) => ({ subject: x.subject, changes: x.changes })),
            await oracleChanges(formFree, back.old, back.r.position),
          );
          const all = (await quiet.recorder.packets(await quiet.recorder.archive.store.head())).flatMap((x) =>
            x.deliveries.map(toWire),
          );
          assert.deepEqual(all, ref.owed, "notices differ after the reset release");
        } finally {
          await quiet.close();
        }
      }
    }
    // Delivered once: every recorded notice of every release reaches a recipient once; a second pass adds nothing.
    // (Toy only: at full size it would be millions of recipient commits.)
    const final = await Settlement.open(c.a, new BulkQueue(1));
    let delivered: unknown = "skipped at server size";
    try {
      if (process.env.DX_ACT5_SERVER === "1") throw new SkipDelivery();
      const sink = new Documents(recipient.comp, "receiver"),
        at = await final.recorder.archive.store.head();
      const first = await final.recorder.deliver(sink, at),
        again = await final.recorder.deliver(sink, at);
      assert.equal(first, ref.owed.length);
      assert.equal(again, 0);
      delivered = { first, again, owed: ref.owed.length, hash: sha256(canonical(ref.owed)) };
    } catch (e) {
      if (!(e instanceof SkipDelivery)) throw e;
    } finally {
      await final.close();
    }
    jsonFile(path.join(c.out, "act5-live.json"), { attempt: c.attempt, people: c.people, reads, delivered, results });
    console.log("[act5] delivered " + JSON.stringify(delivered) + " reads " + reads);
  } finally {
    ref.close();
    for (const x of extras) {
      x.ref.close();
      await x.store.close();
    }
    await recipient.close();
  }
}

/** Runs settlement of `seq` in a child process and kills it after `ms` (inside a frame or between frames). */
async function killedChild(c: LiveContext, seq: number, k: Case, ms: number, startAt?: number) {
  const child = spawn(
    process.execPath,
    ["--experimental-transform-types", "--no-warnings", new URL("./settle-child.ts", import.meta.url).pathname],
    { stdio: ["pipe", "ignore", "pipe"], env: process.env },
  );
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  child.stdin.end(
    JSON.stringify({
      scope: c.s.scope,
      sequence: seq,
      path: "both",
      frames: k.frames,
      precondition: k.precondition,
      held: c.descriptor,
      killAfterMs: ms,
      ...(startAt === undefined ? {} : { startAt }),
    }),
  );
  const code = await new Promise<number | string>((resolve) =>
    child.on("close", (code, signal) => resolve(signal ?? code ?? -1)),
  );
  assert(code === "SIGKILL" || code === 0, "settlement child: " + code + " " + stderr);
  return { ms, ended: code };
}

// ---------------------------------------------------------------------------------------------------------------
// [DX-ACT5] Several accounts settling at once in the one database. Accounts 1 .. DX_ACT5_ACCOUNTS-1 of the toy seed
// are enrolled as publishing accounts with their own names (HeldSource.namespace), each with its own oracle. In a
// `multi` case every account publishes the large release back to back, then all settle at once through ONE bulk
// queue (accounts rotate round-robin; optionally the admission lane) while every account takes saves.
type Extra = {
  index: number;
  store: Store;
  a: JoinedAccount;
  ref: Reference;
  history: LiveContext["history"];
  positions: number[];
  current: { position: number; seq: number; doc: W0.ReleaseDoc };
  oldOf: Map<number, W0.ReleaseDoc>;
};
const ADOPT_SETUP = /^(settled-(values|notice):|notice:v1:)/;
async function enrol(c: LiveContext, index: number): Promise<Extra> {
  const { keyFor } = await import("../../scale1/decision/plan.ts");
  const { seedPositions } = await import("./held-campaign.ts");
  const { JoinedAccount } = await import("./account.ts");
  const account = keyFor(index);
  const descriptor = {
    account,
    prefix: "acct/" + account + "/",
    people: c.people,
    cut: c.descriptor.cut,
    seal: sha256(canonical([c.descriptor.seal, "act5-account", account])),
    namespace: true,
  };
  const store = await openStore(c.s.scope, "act2-deep", "write", {
    ...descriptor,
    verifyThrough: (p) => c.ledger.verifyThrough(p, false, ADOPT_SETUP),
    committed: (r) => c.ledger.joined(r),
  });
  const a = new JoinedAccount(store);
  await a.installHeld(validTime);
  await c.ledger.verifyThrough(await store.head(), false, ADOPT_SETUP);
  const positions = await seedPositions(c.writer, c.seed, index);
  const history: LiveContext["history"] = new Map();
  const ref = new Reference();
  const p = await a.publish(c.attempt + ":act5:" + account + ":R1", W0.R1.doc, validTime, "owed");
  const seq = await sequenceAt(a, p.position);
  const roster = Array.from({ length: c.people }, (_, i) => W0.placementId(i));
  await ref.check(a, roster, (i) => worldAt(i, p.position, history, positions), W0.R1.doc,
    { tx: p.position, validTime }, null, undefined, true, false);
  const x: Extra = { index, store, a, ref, history, positions, current: { position: p.position, seq, doc: W0.R1.doc },
    oldOf: new Map() };
  // Its first release settled quietly, so every account starts the case with only the large release owed.
  const w = await Settlement.open(a, new BulkQueue(1));
  try {
    await w.settle(seq);
  } finally {
    await w.close();
  }
  return x;
}
async function multiCase(
  c: LiveContext,
  k: Case,
  seconds: number,
  extras: Extra[],
  zero: {
    ref: Reference;
    roster: string[];
    current: () => Release;
    publish: (doc: W0.ReleaseDoc) => Promise<{ r: Release; old: W0.ReleaseDoc }>;
  },
) {
  const count = Number(process.env.DX_ACT5_ACCOUNTS ?? 3);
  assert(Number.isInteger(count) && count >= 2 && count <= 10);
  while (extras.length < count - 1) extras.push(await enrol(c, extras.length + 1));
  const roster = zero.roster;
  // Every account publishes the large release (account 0 through the runner, so its reads stay checked).
  const bases = [zero.current().doc, ...extras.map((x) => x.current.doc)];
  const published: { seq: number; position: number; doc: W0.ReleaseDoc; old: W0.ReleaseDoc }[] = [];
  const z = await zero.publish(largeRelease(bases[0]!, shape));
  published.push({ seq: z.r.seq, position: z.r.position, doc: z.r.doc, old: z.old });
  for (const x of extras) {
    const doc = largeRelease(x.current.doc, shape);
    const p = await x.a.publish(c.attempt + ":act5:" + x.index + ":" + k.name, doc, validTime, "owed");
    const seq = await sequenceAt(x.a, p.position);
    await x.ref.check(x.a, roster, (i) => worldAt(i, p.position, x.history, x.positions), doc,
      { tx: p.position, validTime }, x.current.doc, undefined, true, false);
    x.oldOf.set(seq, x.current.doc);
    published.push({ seq, position: p.position, doc, old: x.current.doc });
    x.current = { position: p.position, seq, doc };
  }
  const accounts = [c.a, ...extras.map((x) => x.a)];
  const queue = new BulkQueue(1);
  const workers = await Promise.all(accounts.map((a) => Settlement.open(a, queue, false, k.frames, k.precondition)));
  // Saves: account 0 at its own rate, the others at their usual load (the 23.5 tape), into every account.
  const tape = heldTape(c.people as never, k.own || 23.5, seconds).filter((x) => (x.account === 0 ? k.own > 0 : k.others));
  const senders = await preload(c.writer, c.seed, await c.s.head(), tape);
  const begins = now() + 400,
    ends = begins + seconds * 1000;
  for (const w of workers) {
    w.archive.contest.reset(begins - performance.timeOrigin);
    w.recorder.archive.contest.reset(begins - performance.timeOrigin);
  }
  const histories = new Map<number, LiveContext["history"]>([[0, c.history], ...extras.map((x) => [x.index, x.history] as const)]);
  const ordinals = new Map(tape.map((x) => [x.account + "/" + x.ordinal, x]));
  const gate: PublishInterleave = {
    paused: false,
    committed: (save) => {
      c.ledger.saved(save);
      const h = histories.get(save.account);
      if (!h) return;
      const e = ordinals.get(save.account + "/" + save.ordinal)!;
      const edits = h.get(save.subject) ?? [];
      edits.push({ position: save.receipt!.p, width: e.width, version: e.version });
      h.set(save.subject, edits);
    },
  };
  const lane = k.turns === "admission" ? settlementLane(queue, ends) : undefined;
  const writes = play(senders, tape, begins, c.attempt + "/act5/" + k.name, false, c.ordered,
    creditModeSelection("rolling6"), gate, false, undefined, lane).finally(() => lane?.close());
  const finished: (number | null)[] = workers.map(() => null);
  const settling = Promise.all(
    workers.map(async (w, j) => {
      while (now() < begins) await sleep(Math.ceil(begins - now()));
      await w.settle(published[j]!.seq);
      finished[j] = now() - begins;
    }),
  );
  const [wr, st] = await Promise.allSettled([writes, settling]);
  if (wr.status === "rejected") throw wr.reason;
  if (st.status === "rejected") throw st.reason;
  await c.ledger.verifyThrough(await c.s.head(), false, ADOPT);
  const rows = wr.value.rows;
  assert.equal(wr.value.unresolved.size, 0, "Uncertain save");
  const turns = workers.flatMap((w) => [...w.archive.contest.turns, ...w.recorder.archive.contest.turns]).map(
    ([b, e]) => [b + performance.timeOrigin, e + performance.timeOrigin] as [number, number],
  );
  const perAccount = [];
  for (const [j, w] of workers.entries()) {
    const x = j ? extras[j - 1]! : undefined;
    const ref = x ? x.ref : zero.ref,
      history = x ? x.history : c.history,
      positions = x ? x.positions : c.positions,
      pub = published[j]!;
    const stored = await w.archive.stored(pub.seq);
    assert.equal(stored.frontier.status, "stored");
    const want = (
      JSON.parse(
        await ref.oracle.call("check", {
          document: pub.doc,
          old: pub.old,
          basis: { tx: pub.position, validTime },
          worlds: roster.map((_, i) => worldAt(i, pub.position, history, positions)),
          fold: false,
        }),
      ) as { subject: string; rows: [string, string | null, string | null][] }[]
    )
      .filter((r) => r.rows.length)
      .map((r) => ({ subject: r.subject, changes: r.rows.map(([key, , v]) => [key, v]) }));
    const got = stored.output.map((r) => ({ subject: r.subject, changes: r.changes }));
    if (canonical(got) !== canonical(want)) {
      const bad = want.findIndex((x, i) => canonical(x) !== canonical(got[i]));
      jsonFile(path.join(c.out, "act5-diff-" + k.name + "-" + j + ".json"), { got, want, seq: pub.seq, position: pub.position });
      assert.fail("account " + j + " stored changes differ at " + bad + ": got " + canonical(got[bad] ?? null).slice(0, 400) +
        " want " + canonical(want[bad] ?? null).slice(0, 400) + " (counts " + got.length + "/" + want.length + ")");
    }
    const all = (await w.recorder.packets(await w.recorder.archive.store.head())).flatMap((p) =>
      p.deliveries.map(toWire),
    );
    assert.deepEqual(all, ref.owed, "account " + j + " notices differ");
    const deliveries = (await w.recorder.packets(await w.recorder.archive.store.head()))
      .filter((p) => p.event === pub.seq)
      .flatMap((p) => p.deliveries.map(toWire));
    const by = new Map(got.map((r) => [r.subject, r.changes]));
    const t = { owing: 0, changes: 0, notices: 0 };
    for (const [i, s] of roster.entries()) {
      const e = expectForms(worldAt(i, pub.position, history, positions), pub.doc, validTime);
      const g = checkForms(e, s, (by.get(s) ?? []) as never, deliveries.filter((d: any) => d.subject === s) as never);
      if (e.changes.size) t.owing++;
      t.changes += g.changes;
      t.notices += g.notices;
    }
    perAccount.push({
      account: j,
      finishedMs: finished[j],
      values: w.archive.contest.summary(),
      notices: w.recorder.archive.contest.summary(),
      changes: stored.frontier.changes,
      noticesWritten: deliveries.length,
      independent: t,
      saves: saveSide(rows.filter((r) => r.account === j), turns),
    });
  }
  const result = {
    case: k,
    seconds,
    accounts: workers.length,
    turnsByAccount: Object.fromEntries(queue.turnsByKey),
    lane: lane ? lane.stats() : null,
    perAccount,
    otherSaves: saveSide(rows.filter((r) => r.account >= workers.length), turns),
  };
  console.log("[act5] " + JSON.stringify(result));
  jsonFile(path.join(c.out, "act5-case-" + k.name + ".json"), result);
  for (const w of workers) await w.close();
  // Back to form-free releases, settled quietly and checked.
  const back = await zero.publish(bases[0]!);
  const quiet = await Settlement.open(c.a, new BulkQueue(1), false, k.frames, k.precondition);
  try {
    await quiet.settle(back.r.seq);
  } finally {
    await quiet.close();
  }
  for (const x of extras) {
    const old = x.current.doc,
      doc = bases[x.index]!;
    const p = await x.a.publish(c.attempt + ":act5:" + x.index + ":back:" + k.name, doc, validTime, "owed");
    const seq = await sequenceAt(x.a, p.position);
    await x.ref.check(x.a, roster, (i) => worldAt(i, p.position, x.history, x.positions), doc,
      { tx: p.position, validTime }, old, undefined, true, false);
    x.current = { position: p.position, seq, doc };
    const w = await Settlement.open(x.a, new BulkQueue(1), false, k.frames, k.precondition);
    try {
      await w.settle(seq);
      const all = (await w.recorder.packets(await w.recorder.archive.store.head())).flatMap((p) => p.deliveries.map(toWire));
      assert.deepEqual(all, x.ref.owed, "account " + x.index + " notices differ after its reset release");
    } finally {
      await w.close();
    }
  }
  return result;
}

/** The notice sequence a Publish at `position` wrote, checked against the tail at that position (an earlier version of
 * this phase reused a Publish command id between cases, got the earlier case's receipt back, and settled the wrong
 * release; that was the "stored changes differ" seen in two toy runs). An unpinned read can also trail the write. */
async function sequenceAt(a: JoinedAccount, position: number) {
  for (let i = 0; i < 2000; i++) {
    const t = await a.notices.observe();
    if (t.at >= position) {
      assert.equal(t.at, position, "another Publish followed");
      return t.value.sequence;
    }
    await sleep(5);
  }
  throw new Error("The notice tail never reached the Publish at " + position);
}

// [DX-ACT5] The guard itself, on the held database: (1) a write that follows a progress row another writer has
// already replaced is refused; (2) twenty pairs of writers create the same absent progress row at once: exactly one of
// each pair lands; the refusal's cause says whether the client's read inside the transaction or the transactor's
// serial check refused it.
async function guardCase(c: LiveContext) {
  const { Conflict } = await import("../store.ts");
  const db = new Documents(c.s.comp, "act5-guard" + randomUUID().slice(0, 8));
  const guardOf = (k: string, prior?: { id: string }) => [{ entityId: db.prefix + k, tripleIds: prior ? [prior.id] : [] }];
  const write = (id: string, k: string, prior: { id: string } | undefined, v: unknown, at: number) =>
    c.s.commit(id, "lazy/settlement", db.change(k, prior as never, v), at, v, undefined, undefined, guardOf(k, prior));
  const cause = (e: unknown) => {
    const x = (e as { cause?: { message?: string; _tag?: string } }).cause;
    return String(x?._tag ?? "") + " " + String(x?.message ?? "");
  };
  // (1) follow, rival replaces, follower refused.
  let at = await c.s.head();
  await write("act5-guard-a", "p", undefined, 1, at);
  at = await c.s.head();
  const prior = await db.row<number>("p", at);
  assert(prior);
  await write("act5-guard-rival", "p", prior, 3, at);
  let followerRefused = "";
  try {
    await write("act5-guard-follower", "p", prior, 2, at);
  } catch (e) {
    if (!(e instanceof Conflict)) throw e;
    followerRefused = cause(e);
  }
  assert(followerRefused, "a write following a replaced progress row was not refused");
  assert.equal((await db.row<number>("p", await c.s.head()))!.value, 3);
  // (2) races on an absent row.
  const races = { pairs: 20, oneWon: 0, client: 0, transactor: 0, other: [] as string[] };
  for (let i = 0; i < races.pairs; i++) {
    const h = await c.s.head();
    const outcomes = await Promise.allSettled([
      write("act5-race-" + i + "-a", "r" + i, undefined, "a", h),
      write("act5-race-" + i + "-b", "r" + i, undefined, "b", h),
    ]);
    const won = outcomes.filter((o) => o.status === "fulfilled").length;
    if (won === 1) races.oneWon++;
    for (const o of outcomes)
      if (o.status === "rejected") {
        if (!(o.reason instanceof Conflict)) throw o.reason;
        const why = cause(o.reason);
        if (/observed fact set|TransactionConflict/.test(why)) races.client++;
        else if (/CONFLICT|Conflict/i.test(why)) races.transactor++;
        else races.other.push(why.slice(0, 200));
      }
    const rows = await db.rows<string>(["r" + i], await c.s.head());
    assert.equal(rows.size, 1, "one live progress row");
  }
  assert.equal(races.oneWon, races.pairs, "exactly one of each pair lands");
  await c.ledger.verifyThrough(await c.s.head(), false, ADOPT);
  const result = { case: { name: "guard" }, followerRefused, races };
  console.log("[act5] " + JSON.stringify(result));
  jsonFile(path.join(c.out, "act5-case-guard.json"), result);
  return result;
}
