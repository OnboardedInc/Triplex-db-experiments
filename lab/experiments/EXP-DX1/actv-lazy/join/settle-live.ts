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
import { Reference, toWire } from "./check.ts";
import { checkForms, expectForms } from "./form-expect.ts";
import type { FrameMode, Precondition } from "./frames.ts";
import { expected as worldAt, heldTape } from "./held-campaign.ts";
import type { HeldLedger } from "./held-ledger.ts";
import { largeRelease, parseShape } from "./large-release.ts";
import { Settlement } from "./settlement.ts";

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
  release: "large" | "small" | "none";
  own: 0 | 3.5 | 23.5 | 39.4;
  others: boolean;
  extra?: "kill" | "second";
  turns?: "admission";
};
const validTime = W0.POPULATION_VALID_TIME;
const ADOPT = /^settled-(values|notice):/;
const shape = parseShape("forms=20,policies=20,permille=1000");

export function parseCases(text: string): Case[] {
  return text.split(",").map((entry) => {
    const [name, precondition, frames, release, own, others, extra, turns] = entry.split(":");
    assert(name && ["head", "progress"].includes(precondition!) && ["count", "bytes"].includes(frames!));
    assert(["large", "small", "none"].includes(release!) && ["0", "3.5", "23.5", "39.4"].includes(own!));
    assert(["0", "1"].includes(others!) && [undefined, "", "kill", "second"].includes(extra));
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
  for (const r of done) {
    const from = r.dispatched!,
      to = r.end!;
    const k = turns.filter(([b, e]) => b < to && e > from).length;
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
  const seconds = Number(process.env.DX_ACT5_SECONDS ?? 8);
  assert(seconds >= 2 && seconds <= 30);
  const ref = new Reference();
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
  const oracleChanges = async (doc: W0.ReleaseDoc, old: W0.ReleaseDoc, at: number) =>
    (
      JSON.parse(
        await ref.oracle.call("check", {
          document: doc,
          old,
          basis: { tx: at, validTime },
          worlds: roster.map((_, i) => world(at)(i)),
          fold: false,
        }),
      ) as { subject: string; rows: [string, string | null, string | null][] }[]
    )
      .filter((x) => x.rows.length)
      .map((x) => ({ subject: x.subject, changes: x.rows.map(([k, , v]) => [k, v]) }));
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
  try {
    for (const k of cases) {
      const base = current.doc;
      const doc =
        k.release === "large"
          ? largeRelease(base, shape)
          : k.release === "small"
            ? base.name === "R1" ? W0.R2.doc : W0.R1.doc
            : undefined;
      assert(k.release !== "large" || !base.name.includes("+"), "a large case needs a form-free predecessor");
      const published = doc ? await publish(doc) : undefined;
      // Saves: the held tape at the own rate (account 0) and/or the nine others at their usual load (the 23.5 tape).
      const tape = heldTape(c.people as never, k.own || 23.5, seconds).filter((x) =>
        x.account === 0 ? k.own > 0 : k.others,
      );
      const from = await c.s.head();
      const senders = await preload(c.writer, c.seed, from, tape);
      const queue = new BulkQueue(1);
      const worker = published
        ? await Settlement.open(c.a, queue, false, k.frames, k.precondition)
        : undefined;
      const begins = now() + 400,
        ends = begins + seconds * 1000;
      const origin = begins - performance.timeOrigin;
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
          for (let j = 0; j < 3; j++) kills.push(await killedChild(c, published.r.seq, k, 150 + Math.floor(Math.random() * 900)));
        }
        if (k.extra === "second") {
          // A second release while the first is being settled: pause saves and frames, Publish, resume.
          await sleep(Math.min(1500, (seconds * 1000) / 4));
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
          const first = await worker.archive.runValues(published.r.seq);
          superseded = { ...(superseded as object), status: first.status, through: first.through };
          await worker.settle(current.seq);
        } else await worker.settle(published.r.seq);
        settledAt = now();
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
      if (worker && published) {
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
          if (r.doc.name.includes("+") && !old.name.includes("+")) {
            const by = new Map(got.map((x) => [x.subject, x.changes]));
            const t = { owing: 0, changes: 0, notices: 0 };
            for (const [i, s] of roster.entries()) {
              const e = expectForms(world(r.position)(i), r.doc, validTime);
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
          lrows = await ldb.rows<string>(roster.map((s) => "recorded-ledger:" + s), await ldb.head());
        for (const s of roster) {
          const v = lrows.get("recorded-ledger:" + s);
          assert.deepEqual(v ? unpack<any[]>(v.value).map(toWire) : [], ref.items.get(s) ?? [], "ledger of " + s);
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
        values: worker?.archive.contest.summary() ?? null,
        notices: worker?.recorder.archive.contest.summary() ?? null,
        frameUsMax: worker
          ? Math.max(worker.archive.admitted.usMax, worker.recorder.archive.admitted.usMax)
          : null,
        kills,
        superseded: superseded ?? null,
        lane: lane ? lane.stats() : null,
        saves: {
          account: saveSide(rows.filter((r) => r.account === 0), turns),
          neighbours: saveSide(rows.filter((r) => r.account > 0), turns),
        },
        exact,
      };
      console.log("[act5] " + JSON.stringify({ ...result, saves: undefined }));
      results.push(result);
      await worker?.close();
      // A large release is followed by its form-free predecessor again (settled quietly, checked the same way).
      if (k.release === "large" && k.extra !== "second") {
        const back = await publish(base);
        const quiet = await Settlement.open(c.a, new BulkQueue(1), false, k.frames, k.precondition);
        try {
          await quiet.settle(back.r.seq);
          const stored = await quiet.archive.stored(back.r.seq);
          assert.deepEqual(
            stored.output.map((x) => ({ subject: x.subject, changes: x.changes })),
            await oracleChanges(base, back.old, back.r.position),
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
    const final = await Settlement.open(c.a, new BulkQueue(1));
    let delivered: unknown;
    try {
      const sink = new Documents(recipient.comp, "receiver"),
        at = await final.recorder.archive.store.head();
      const first = await final.recorder.deliver(sink, at),
        again = await final.recorder.deliver(sink, at);
      assert.equal(first, ref.owed.length);
      assert.equal(again, 0);
      delivered = { first, again, owed: ref.owed.length, hash: sha256(canonical(ref.owed)) };
    } finally {
      await final.close();
    }
    jsonFile(path.join(c.out, "act5-live.json"), { attempt: c.attempt, people: c.people, reads, delivered, results });
    console.log("[act5] delivered " + JSON.stringify(delivered) + " reads " + reads);
  } finally {
    ref.close();
    await recipient.close();
  }
}

/** Runs settlement of `seq` in a child process and kills it after `ms` (inside a frame or between frames). */
async function killedChild(c: LiveContext, seq: number, k: Case, ms: number) {
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
    }),
  );
  const code = await new Promise<number | string>((resolve) =>
    child.on("close", (code, signal) => resolve(signal ?? code ?? -1)),
  );
  assert(code === "SIGKILL" || code === 0, "settlement child: " + code + " " + stderr);
  return { ms, ended: code };
}
