import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { Worker } from "node:worker_threads";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { DomainOraclePool } from "../../../../bench/lib/w0-gates.ts";
import { Histogram } from "../../../../bench/lib/hist.ts";
import { SEED_VALID_FROM } from "../../../../bench/lib/world.ts";
import {
  accounts,
  field,
  keyFor,
  root,
  sha,
  task,
  writeTape,
  type Density,
  type Write,
} from "../../scale1/decision/plan.ts";
import { now, readCell } from "../../scale1/decision/observer.ts";
import { play, type PublishInterleave, type Save } from "../../scale1/decision/writes.ts";
import { creditModeSelection } from "../../prep1/rolling-credits.ts";
import { checkAdoptedPeer, type AdoptedSeed } from "../../v01/adopt.ts";
import { jsonFile, preload, type Peer } from "../../v01/adopted.ts";
import { openStore, type HeldSource } from "../store.ts";
import type { Pin } from "../read.ts";
import { JoinedAccount, publishBeside, type PublishOptions } from "./account.ts";
import { toWire } from "./check.ts";
import { authoredSeed, authoredWrite, expectedPolicy } from "./deep-reference.ts";
import { HeldLedger } from "./held-ledger.ts";
import { Settlement } from "./settlement.ts";
import { BulkQueue } from "./bulk.ts";
import { firstOffer } from "../../ha1/first-offer.ts";
import { largeRelease, parseShape, shapeName } from "./large-release.ts";
import { checkForms, expectForms } from "./form-expect.ts";
import { docsMode } from "./definitions.ts";
import { agedBase, checkAgedLive, type AgedBase, type AgedSeal } from "../act7/aged.ts";

const validTime = W0.POPULATION_VALID_TIME;
export const rates = [3.5, 23.5, 39.4] as const;
type Rate = (typeof rates)[number];
const creditModes = ["barrier6", "rolling6"] as const;
type Mode = (typeof creditModes)[number];
export const total = (r: Rate) => (r === 3.5 ? r : r === 23.5 ? 235 : 394);
const wait = async (at: number) => {
  while (now() < at) await sleep(Math.ceil(at - now()));
};
const pct = (xs: number[], p: number) =>
  xs.length ? xs.toSorted((a, b) => a - b)[Math.ceil(xs.length * p) - 1] : null;
const p99 = (xs: number[]) => pct(xs, 0.99);
const ratio = (value: number | null | undefined, baseline: number | null | undefined) =>
  value != null && baseline && baseline > 0 ? value / baseline : null;

export function heldTape(people: Density, rate: Rate, seconds: number) {
  const by = Math.round((total(rate) - rate) * seconds),
    own = Math.round(rate * seconds);
  return accounts
    .flatMap((a): Write[] => {
      const count = a ? Math.floor((by + 9 - a) / 9) : own;
      if (!count) return [];
      const rows: Write[] = [];
      for (let block = 0; rows.length < count; block++) {
        const cell = a ? 394 : rate;
        const batch = writeTape(people, cell, block).filter((x) => x.account === a);
        for (const [j, x] of batch.entries()) {
          const ordinal = rows.length;
          const jitter =
            (x.ms * batch.length) /
              (a ? 90_000 : rate === 3.5 ? 150_000 : rate === 23.5 ? 300_000 : 60_000) -
            j;
          assert(jitter >= -1e-8 && jitter <= 1);
          rows.push({
            ...x,
            ordinal,
            ms: ((ordinal + Math.max(0, jitter)) * seconds * 1000) / count,
            version: ["held", rate, a, ordinal].join("/"),
          });
          if (rows.length === count) break;
        }
      }
      return rows;
    })
    .sort((a, b) => a.ms - b.ms);
}

type Seen = {
  subject: string;
  route: string;
  json: string;
  basis: { tx: number; validTime: string };
};
type Read = { started: number; ended: number; result: Seen };
async function readerPeer(
  peer: Peer,
  scope: string,
  descriptor: Pick<HeldSource, "account" | "prefix" | "people" | "cut" | "seal">,
  atLeast = false,
) {
  const worker = new Worker(new URL("./held-reader.ts", import.meta.url), {
    workerData: { scope, held: descriptor, atLeast },
    env: { ...process.env, DATOMIC_URL: peer.read, DATOMIC_READ_URLS: peer.read },
  });
  const ready = new Promise<void>((resolve, reject) => {
    worker.once("message", (m) =>
      m === "ready" ? resolve() : reject(Error("Unexpected reader boot")),
    );
    worker.once("error", reject);
    worker.once("exit", (code) => reject(Error("Reader exited before startup: " + code)));
  });
  let next = 0;
  const requests = new Map<number, { resolve: (r: any) => void; reject: (e: Error) => void }>();
  worker.on("message", (m) => {
    if (m === "ready") return;
    const request = requests.get(m.n);
    assert(request, "Unexpected held read response");
    requests.delete(m.n);
    if (m.error) request.reject(Object.assign(Error(m.error), m.code ? { code: m.code, head: m.head, started: m.started, ended: m.ended } : {}));
    else request.resolve(m);
  });
  const fail = (e: Error) => {
    for (const pending of requests.values()) pending.reject(e);
    requests.clear();
  };
  worker.on("error", fail);
  worker.on("exit", (code) => fail(Error("Held read worker exited: " + code)));
  await ready;
  return {
    read: (subject: string, pin: Pin) =>
      new Promise<Read>((resolve, reject) => {
        const n = next++;
        requests.set(n, { resolve, reject });
        worker.postMessage({ n, subject, pin });
      }),
    // [DX-RD4] Hand the reader a Publish receipt: its later unpinned reads are at or after this position.
    receipt: (position: number) =>
      new Promise<{ floor: number }>((resolve, reject) => {
        const n = next++;
        requests.set(n, { resolve, reject });
        worker.postMessage({ n, receipt: position });
      }),
    close: () => worker.terminate(),
  };
}

const samples = (n: number, turn: number) => [
  ...new Set([0, n - 1, Math.floor(n / 2), (turn * 7919 + 47) % n]),
];
type Release = {
  recordBytes: number;
  recordChanges: number;
  offer: number;
  received: number;
  durableAt: number;
  durabilityClock: "native-ack" | "readback";
  position: number;
  /** [DX-ACT8] Where the Publish read its account's state (`position - 1` under the whole-head rule). */
  read: number;
  /** [DX-ACT8] Tries the Publish sent (1 unless refused by its own account's events). */
  tries: number;
  seq: number;
  tx: string;
  doc: W0.ReleaseDoc;
};
// [DX-ACT8] DX_ACT8_UNPAUSED=1: the windows publish while every account's saves keep running (no pause, no drain).
// Unset: the runner pauses and drains the save sender around each Publish, as every earlier result was measured.
export const unpausedMode = () => process.env.DX_ACT8_UNPAUSED === "1";
/** [DX-ACT8] Writers the runner adopts from the journal by command ID when saves run beside a Publish: settlement frames,
 * notice documents written through the composition (other accounts' enrolments), Publishes of a killed process. */
export const ACT8_ADOPT = /^(settled-(values|notice):|notice:v1:|joined:.*:act8:kill:)/;
type PairSample = {
  mode: Mode;
  rate: Rate;
  load: number;
  publish: boolean;
  first: number[];
  within1000: number;
  within100000: number;
  missedDeadlines: number;
  writes: ReturnType<typeof writeSummary>;
  reads: ReturnType<Histogram["summary"]>;
  readOffered: number;
  readMissing: number;
  savesOnly?: number | null;
};
// [DX-ACT7] `slots`: a production-shaped save's written field numbers (v01/production-card.ts); absent, fields 0 to
// width - 1 as before.
// [DX-ACT8] `facts`: a write of any of the subject's own facts (entity without the account prefix, attribute, value), as
// the adversarial schedule commits; absent, a task-field save as before.
type History = Map<number, { position: number; version: string; width: number; slots?: number[];
  facts?: { e: string; a: string; v: { type: string; value: unknown } }[] }[]>;
// [DX-INT1] Why: SCALE1 packs consecutive people into one loader frame, and the pooled loader keeps two frames in
// flight, so a later frame can commit first. Positions then fall in member order only within each frame. What the
// positions must show is that each person's original facts came from one loader frame and each frame holds one
// contiguous run of people: a position never returns after a different one, and no two runs share a position.
// Rejected: requiring positions to rise with member index (true only for a loader with one frame in flight; the held
// 100,000-person copy has layout pooled), or dropping the check.
export function checkSeedFrames(detected: number[], cut: number) {
  const finished = new Set<number>();
  detected.forEach((p, i) => {
    assert(Number.isSafeInteger(p) && p > 1 && p <= cut);
    if (i > 0 && p !== detected[i - 1]) {
      finished.add(detected[i - 1]!);
      assert(!finished.has(p), "A loader frame's people are not contiguous");
    }
  });
  return { people: detected.length, frames: new Set(detected).size,
    reordered: detected.filter((p, i) => i > 0 && p < detected[i - 1]!).length };
}
export async function seedPositions(client: DatomicClient, seed: AdoptedSeed, account = 0) {
  const detected: number[] = [];
  const width = 128;
  for (let start = 0; start < seed.image.people; start += 4 * width) {
    const windows = await Promise.all(
      Array.from({ length: 4 }, async (_, lane) => {
        const first = start + lane * width;
        const count = Math.min(width, seed.image.people - first);
        if (count <= 0) return [];
        const ids = Array.from({ length: count }, (_, i) => root(account, first + i));
        const rows = await client.rows(seed.scope.db, {
          entityIds: ids,
          pattern: { attribute: ":subject/member" },
          basis: { recordedPosition: seed.scope.cut, validAt: SEED_VALID_FROM },
        });
        assert.equal(rows.length, ids.length);
        const byRoot = new Map(rows.map((r) => [r.entity_id, r]));
        return ids.map((id, i) => {
          const row = byRoot.get(id);
          assert(
            row && row.attribute === ":subject/member" && row.value_string === String(first + i),
          );
          assert(
            row.valid_from === SEED_VALID_FROM &&
              row.recorded_position > 1 &&
              row.recorded_position <= seed.scope.cut,
          );
          return row.recorded_position;
        });
      }),
    );
    detected.push(...windows.flat());
  }
  checkSeedFrames(detected, seed.scope.cut);
  return detected;
}

export function expected(i: number, at: number, edits: History, positions: number[], aged?: AgedBase) {
  // [DX-ACT1] Why: SCALE1 packs one person's original facts atomically. Trace provenance uses their witnessed loader position.
  // Rejected: giving every authored fact position one, which produces the right tasks but different durable notice versions.
  let rows = authoredSeed(i, positions[i]!);
  const owner = task(0, i).split("/").at(-1)!;
  // [DX-ACT7] On an aged database: the subject's task fields as AGE1's tape left them (each at its own position),
  // regenerated from the handoff's replay inputs (act7/aged.ts). Unset, as before.
  for (const f of aged?.(i) ?? [])
    rows = authoredWrite(rows, [{ e: owner, a: f.attribute, v: { type: "string", value: f.value } }], f.position, 0);
  for (const e of edits.get(i) ?? []) {
    if (e.position > at) break;
    if (e.facts) {
      rows = authoredWrite(rows, e.facts as never, e.position, 0);
      continue;
    }
    const slots = e.slots ?? Array.from({ length: e.width }, (_, n) => n);
    rows = authoredWrite(
      rows,
      slots.map((n) => ({
        e: owner,
        a: field(n),
        v: { type: "string" as const, value: sha([e.version, n]).slice(0, 57) },
      })),
      e.position,
      0,
    );
  }
  return expectedPolicy(i, rows);
}
function writeSummary(rows: Save[], start: number, end: number) {
  const summarize = (side: Save[]) => {
    const done = side.filter((x) => x.status === "acked" || x.status === "recovered");
    const count = done.filter((x) => x.end! < end && x.status === "acked").length;
    return {
      offered: side.length,
      acknowledgements: count,
      storedPerSecond: (count * 1000) / (end - start),
      pendingAfterOneSecond: side.filter((x) =>
        x.dispatched === undefined
          ? (x.end ?? Infinity) > end + 1000
          : (x.end ?? Infinity) > end + 1000 || x.status === "uncertain",
      ).length,
      p99Ms: p99(done.map((x) => x.end! - x.due)),
      deadlineExpirations: side.filter((x) => x.status === "expired-before-dispatch").length,
      refused: side.filter((x) => x.status === "refused").length,
    };
  };
  return {
    all: summarize(rows),
    account: summarize(rows.filter((r) => !r.account)),
    neighbours: summarize(rows.filter((r) => r.account > 0)),
  };
}

const frameSummary = (x: { frames: number; usMax: number; usSum: number; wireMax: number }) => ({
  frames: x.frames,
  usMax: x.usMax,
  usMean: x.frames ? x.usSum / x.frames : 0,
  wireMax: x.wireMax,
});
function summarizeMs(xs: number[]) {
  const s = xs.toSorted((a, b) => a - b),
    q = (p: number) => (s.length ? s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)]! : null);
  return { n: s.length, p50: q(0.5), p99: q(0.99), max: s.at(-1) ?? null };
}
export async function runHeld(
  out: string,
  source: string,
  peer: Peer,
  seed: AdoptedSeed,
  diagnostic = false,
) {
  const start = now(),
    input = path.join(out, "held-input.json");
  // [DX-ACT3] Why: the release-size setting. Unset, every Publish alternates W0's R2 and R3 as before. Set (for example
  // forms=20,policies=20,permille=1000), the R3 turns carry that many synthetic forms and policies, so every Publish in a
  // window adds or removes them for the chosen share of subjects. The first release's full settlement is skipped unless
  // DX_ACT3_SETTLE=1: a settlement frame of a large release exceeds the background writer's bound (LARGE-RELEASE.md), and
  // the hour of server time goes to the one-second path.
  // Rejected: changing the default release or the default settlement.
  const shape = process.env.DX_ACT3_RELEASE ? parseShape(process.env.DX_ACT3_RELEASE) : undefined;
  // [DX-ACT3] DX_ACT3_SETTLE=0 also skips it for the small release (its first settlement is measured already).
  assert([undefined, "0", "1"].includes(process.env.DX_ACT3_SETTLE));
  const settleInitial = process.env.DX_ACT3_SETTLE ? process.env.DX_ACT3_SETTLE === "1" : !shape;
  // [DX-ACT4] Why: settle a large release at full size. DX_ACT4_INITIAL=large makes the first Publish R1 plus the
  // DX_ACT3_RELEASE forms and policies (from nothing), so the first settlement is a large release's; it needs
  // DX_ACT3_SETTLE=1 and is meant with TX2_SETTLE_FRAMES=bytes (the old frames refuse it). The settled values and
  // notices are then also checked against the independent statement of the form rule. Unset, R1 as before.
  // Rejected: a second Publish before the windows (its notices would wait behind the first release's in one stream).
  assert([undefined, "large"].includes(process.env.DX_ACT4_INITIAL));
  const initialLarge = process.env.DX_ACT4_INITIAL === "large";
  assert(!initialLarge || (shape && settleInitial), "DX_ACT4_INITIAL=large needs DX_ACT3_RELEASE and DX_ACT3_SETTLE=1");
  // [DX-ACT3] Why: rerun only the windows a stopped run left unjudged. DX_HELD_WINDOWS lists mode/rate/publish
  // triples (for example rolling6/3.5/1,barrier6/23.5/0); unset, all twelve run in the original order.
  // Rejected: a second runner with its own window order.
  const selected = process.env.DX_HELD_WINDOWS?.split(",").map((w) => {
    const [m, r, p] = w.split("/");
    assert(creditModes.includes(m as Mode) && rates.includes(Number(r) as Rate) && (p === "0" || p === "1"),
      "DX_HELD_WINDOWS entries are mode/rate/publish");
    return [m, Number(r), p === "1"].join("/");
  });
  const wanted = (mode: Mode, rate: Rate, publish: boolean) =>
    !selected || selected.includes([mode, rate, publish].join("/"));
  // [DX-ACT3] Why: a read check that fails records both halves of its values and stops only its own window; the run
  // still fails at the end. Rejected: letting one window's stop hide the later windows' evidence.
  const readFailures: unknown[] = [];
  // A probe sent after the Publish's acknowledgement that answers at an earlier basis: kept apart from exactness
  // failures, it still fails the run at the end (the store gives no read-after-acknowledgement promise across
  // gateways, and whether it must is the owner's decision, not the runner's).
  const visibilityFailures: unknown[] = [];
  // [DX-RD4] Why: with DX_ACT3_AT_LEAST=1 the probe's reader is built from each Publish receipt (the SDK's at-least read),
  // so the runner reads as a product reader holding the receipt would. An answer from before the receipt it was given is
  // then a store defect, recorded with every value and failing the run at the end. Unset, the probe reads as before.
  // Rejected: dropping the earlier-answer record (it is the evidence) or a reader that asks the read gateway to sync.
  const probeAtLeast = process.env.DX_ACT3_AT_LEAST === "1";
  assert([undefined, "0", "1"].includes(process.env.DX_ACT3_AT_LEAST), "DX_ACT3_AT_LEAST is 0 or 1");
  const atLeastDefects: unknown[] = [];
  // [DX-ACT8] Publishes refused in an unpaused window (the whole-head rule beside saves): recorded, never hidden.
  const refusedPublishes: unknown[] = [];
  class ReadCheckFailed extends Error {}
  // [DX-ACT3] Diagnostic gate only: "stale" makes the first probe of the first Publish window read at the previous
  // release (an earlier basis, as on bench 4); "mismatch" checks one deadline read against the wrong subject.
  const inject = process.env.DX_ACT3_INJECT;
  assert(inject === undefined || (diagnostic && (inject === "stale" || inject === "mismatch")));
  let injected = false;
  const large = shape ? largeRelease(W0.R3.doc, shape) : undefined;
  const writer = new DatomicClient(peer.write, 35000),
    reader = new DatomicClient(peer.read, 35000);
  const releases: Release[] = [],
    history: History = new Map();
  const oracles = new DomainOraclePool(
    new URL("./oracle.py", import.meta.url).pathname,
    diagnostic ? 1 : 4,
  );
  let store: Awaited<ReturnType<typeof openStore>> | undefined;
  let connected: Awaited<ReturnType<typeof readerPeer>> | undefined;
  let worker: Settlement | undefined;
  try {
    // [DX-ACT7] Why: on an aged copy (the sealed 1 billion database, or the miniature) the live head is the aged head,
    // not the SCALE1 cut: the held runner adopts it as the scorecard does, then checks AGE1's last save and every aged
    // subject's task fields against the handoff's replay tape before anything is written. Unset, as before.
    // Rejected: running on the aged copy with the fresh cut (refused at the head check: "Restored logical head differs").
    const aged = (seed as AdoptedSeed & { aged?: AgedSeal }).aged;
    const head = aged?.head ?? seed.scope.cut;
    const verified = await checkAdoptedPeer(reader, seed, head);
    assert.deepEqual(verified, await checkAdoptedPeer(writer, seed, head));
    const agedLive = aged ? await checkAgedLive(reader, seed.scope.db, aged) : null;
    if (agedLive) jsonFile(path.join(out, "held-aged-live.json"), { source, attempt: peer.attempt, ...agedLive });
    // [DX-ACT7] Diagnostic only: the oracle without the aged history (the miniature shows it then fails).
    assert(process.env.DX_ACT7_PLAIN_ORACLE === undefined || (diagnostic && process.env.DX_ACT7_PLAIN_ORACLE === "1"));
    const agedOf = (account: number) =>
      aged && process.env.DX_ACT7_PLAIN_ORACLE !== "1" ? agedBase(aged, account) : undefined;
    const aged0 = agedOf(0);
    const options = await writer.request<{
      attempt: string;
      database: string;
      position: number;
      gatewaySourceHash: string;
      commitFunctionInstalled: boolean;
      strictRecordClocks: boolean;
      rowsVersion: number;
      subjectNumericOwner: boolean;
      subjectOrderedIds: boolean;
      subjectSave: boolean;
      subjectFunction: string;
      options: { groupCommit: boolean };
      subjectPrefetch: boolean;
    }>("GET", "/v1/db/" + seed.scope.db + "/write-options");
    assert.deepEqual(
      [options.database, options.position, options.gatewaySourceHash],
      [seed.scope.db, head, peer.gatewaySource],
    );
    assert(
      options.commitFunctionInstalled && options.strictRecordClocks && options.rowsVersion === 3,
    );
    const ordered =
      options.subjectSave === true && options.subjectNumericOwner && options.subjectOrderedIds;
    if (!diagnostic) {
      assert.equal(options.attempt, peer.attempt);
      assert(ordered && !options.options.groupCommit && !options.subjectPrefetch);
      assert.match(options.subjectFunction, /^:triplex\.subject\/v-[a-f0-9]{24}$/);
    }
    const { name, db } = seed.scope,
      cut = head,
      people = seed.image.people;
    const positions = await seedPositions(reader, seed);
    const account = keyFor(0);
    const descriptor = {
      account,
      prefix: "acct/" + account + "/",
      people,
      cut,
      seal: sha256(
        canonical([
          seed.pin,
          seed.proof.sourceSeal,
          name,
          db,
          account,
          people,
          cut,
          verified.terminal,
        ]),
      ),
    };
    jsonFile(input, {
      source,
      peer: {
        slot: peer.slot,
        attempt: peer.attempt,
        gatewaySource: peer.gatewaySource,
        java: peer.java,
      },
      verified,
      descriptor,
      positions,
      options,
      diagnostic,
      rates,
      at: start,
      creditModes,
      release: shape
        ? { shape, name: shapeName(shape), hash: W0.compileRelease(large!).hash,
            documentBytes: Buffer.byteLength(canonical(large)), settleInitial }
        : null,
    });
    // Enrolment's census transactions are checked by JoinedAccount before setting this frontier.
    let ledger: HeldLedger | undefined;
    // [DX-ACT8] With saves running beside a Publish (unpaused windows, or this builder's gate) a save can be committed
    // before the Publish's read without its receipt being back yet, so the Publish checks only the positions whose
    // writers are already known; every position is still checked at the end of each window and case. Unset: as before.
    const partialVerify = unpausedMode() || process.env.DX_ACT8_GATE === "1";
    store = await openStore(name, "act2-deep", "write", {
      ...descriptor,
      verifyThrough: (p) => {
        assert(ledger);
        return ledger.verifyThrough(p, partialVerify);
      },
      committed: (r) => ledger?.joined(r),
    });
    const s = store,
      a = new JoinedAccount(s);
    const meta = await a.installHeld(validTime),
      prepared = now(),
      installed = await s.head();
    const activeLedger = (ledger = new HeldLedger(
      reader,
      db,
      installed,
      ordered ? options.subjectFunction : undefined,
    ));
    if (probeAtLeast) {
      // The read gateway must confirm at-least reads (a gateway before them would answer early without saying so).
      const check = await reader.basis(db, { position: 0, waitMs: 1 });
      assert.equal(check.atLeast, 0, "The read gateway does not support at-least reads");
    }
    connected = await readerPeer(peer, name, descriptor, probeAtLeast);
    const demand = connected;
    const atLeastCounters = async () => {
      const c = (await reader.request<{ atLeast?: Record<string, number> }>("GET", "/v2/admin/scan-stats")).atLeast ?? {};
      return { requests: c.requests ?? 0, waited: c.waited ?? 0, waitMicros: c.waitMicros ?? 0, timeouts: c.timeouts ?? 0 };
    };
    const handReceipt = async (r: Release) => {
      if (probeAtLeast) assert((await demand.receipt(r.position)).floor >= r.position);
    };
    // [DX-ACT1] Why: keep early ACK clocks and pinned bytes from the connected SDK reader, then check them independently.
    // Rejected: timing a process launch or selecting a favourable probe after observing its response.
    const offer = async (doc: W0.ReleaseDoc, id: string, offered: number, options?: PublishOptions) => {
      const published = await a.publish(id, doc, validTime, "owed", undefined, options);
      const received = now(),
        ack = s.counters.lastReceipt,
        record = s.counters.lastOps;
      assert.equal(record.id, "joined:" + id);
      assert(
        ack &&
          ack.position === published.position &&
          ack.txId === published.txId &&
          ack.commandId === "joined:" + id,
      );
      const durableAt = performance.timeOrigin + ack.time;
      assert(offered <= durableAt && durableAt <= received);
      const marker = await a.receipt(
        (await a.notices.observe()).value.sequence,
        published.position,
      );
      assert.deepEqual(
        [marker.event.at, marker.event.value.request, marker.marker.cut],
        [published.position, id, published.position - 1],
      );
      assert.deepEqual(marker.marker.document, doc);
      assert.equal(a.stats.worlds, 0);
      const r = {
        recordBytes: record.bytes,
        recordChanges: record.changes,
        offer: offered,
        received,
        durableAt,
        durabilityClock: ack.clock,
        position: published.position,
        read: marker.marker.read ?? marker.marker.cut,
        tries: ((last) => (last && last.landed === published.position ? last.tries : 1))(a.beside.last),
        tx: published.txId,
        seq: marker.marker.seq,
        doc,
      };
      releases.push(r);
      return r;
    };
    async function verifyRead(probe: Read, r: Release, i: number, where = "read") {
      const b = probe.result.basis;
      // [DX-ACT8] With saves running beside the Publish a read's basis can include a save whose receipt has not reached
      // the oracle's history yet: wait until every position up to the basis is matched to its writer (after the read's
      // clock stopped, so no time changes). Unset: as before (the pause made the history complete).
      if (partialVerify)
        for (const until = now() + 60_000; ; ) {
          await activeLedger.verifyThrough(b.tx, true, ACT8_ADOPT);
          if (activeLedger.verified() >= b.tx) break;
          assert(now() < until, "Receipts below a read's basis never arrived");
          await sleep(5);
        }
      const effective = releases.findLast((x) => x.position <= b.tx);
      const values = {
        where,
        subject: probe.result.subject,
        expectedSubject: W0.placementId(i),
        route: probe.result.route,
        basisTx: b.tx,
        basisValidTime: b.validTime,
        expectedValidTime: validTime,
        releasePosition: r.position,
        releaseSeq: r.seq,
        releaseAck: r.durableAt,
        releaseReceived: r.received,
        effectivePosition: effective?.position ?? null,
        readStarted: probe.started,
        readEnded: probe.ended,
        txHalf: b.tx >= r.position,
        validTimeHalf: b.validTime === validTime,
        subjectMatches: probe.result.subject === W0.placementId(i),
        effectiveMatches: effective?.position === r.position,
        exact: null as boolean | null,
      };
      if (values.txHalf && values.validTimeHalf && values.subjectMatches && values.effectiveMatches) {
        const text = await oracles.children[0]!.call("check", {
          document: r.doc,
          old: null,
          basis: b,
          worlds: [expected(i, b.tx, history, positions, aged0)],
          fold: false,
        });
        values.exact = probe.result.json === JSON.parse(text)[0].json;
        if (values.exact) return;
      }
      readFailures.push(values);
      throw new ReadCheckFailed("Held read check failed: " + JSON.stringify(values));
    }
    // [DX-ACT3] Why: the read gateway answers at its own peer's latest basis (the basis route takes d/db without
    // d/sync), so a probe sent just after a Publish acknowledged through the write gateway can answer at an earlier
    // basis (the bench 4 stop). That answer is recorded as a visibility failure with all its values, checked exactly
    // against the release in force at its basis, and the probe reads again until it reaches the Publish, so the
    // window's other measurements survive. The run still fails at the end.
    // Rejected: stopping the run at the first such answer (it hid ten windows), dropping the check, and pinning the
    // probe to the Publish position (the reader refuses a position past its own head).
    async function firstCorrect(r: Release, i: number, offered: number) {
      const earlier: (Seen["basis"] & { started: number; ended: number; route: string })[] = [];
      for (;;) {
        const previous = releases.at(-2);
        const stale = inject === "stale" && !injected && previous !== undefined && releases.length > 1;
        if (stale) injected = true;
        const probe = await demand.read(W0.placementId(i),
          stale ? { position: previous.position, validTime } : { validTime }).catch((e) => {
          // [DX-RD4] The read gateway refused: its peer did not reach the receipt within the reader's 2 s wait. Recorded with
          // its values; it stops only this window and fails the run at the end.
          if (e?.code !== "AtLeastTimeout") throw e;
          readFailures.push({ where: "probe-at-least-timeout", subject: W0.placementId(i), releasePosition: r.position,
            gatewayHead: e.head, releaseAck: r.durableAt, readStarted: e.started, readEnded: e.ended });
          throw new ReadCheckFailed("The read gateway did not reach the Publish within the at-least wait");
        });
        const b = probe.result.basis;
        if (b.tx >= r.position) {
          await verifyRead(probe, r, i, "first-correct");
          return { probe, earlier };
        }
        const effective = releases.findLast((x) => x.position <= b.tx);
        const failure = { where: "probe-after-ack", subject: probe.result.subject, route: probe.result.route,
          basisTx: b.tx, basisValidTime: b.validTime, releasePosition: r.position, releaseSeq: r.seq,
          releaseAck: r.durableAt, releaseReceived: r.received, effectivePosition: effective?.position ?? null,
          readStarted: probe.started, readEnded: probe.ended, txHalf: false, validTimeHalf: b.validTime === validTime,
          attempt: earlier.length, atLeastAsked: probeAtLeast ? r.position : null, injected: stale };
        visibilityFailures.push(failure);
        if (probeAtLeast) atLeastDefects.push(failure);
        if (!effective) {
          readFailures.push({ where: "first-correct", basisTx: b.tx, releasePosition: r.position, effectivePosition: null });
          throw new ReadCheckFailed("Probe basis before every release");
        }
        await verifyRead(probe, effective, i, "before-publish-visible");
        earlier.push({ ...b, started: probe.started, ended: probe.ended, route: probe.result.route });
        if (now() > offered + 100_000) {
          readFailures.push({ where: "first-correct", reason: "no answer at the Publish within 100 s",
            releasePosition: r.position, lastBasisTx: b.tx, attempts: earlier.length });
          throw new ReadCheckFailed("No answer at the Publish within 100 s");
        }
        await sleep(2);
      }
    }
    firstOffer("held-publish");
    const initialAt = now();
    const initialDoc = initialLarge ? largeRelease(W0.R1.doc, shape!) : W0.R1.doc;
    const initial = await offer(initialDoc, peer.attempt + ":baseline", initialAt);
    await handReceipt(initial);
    const { probe: initialRead } = await firstCorrect(initial, people - 1, initialAt);
    let changes = 0,
      entries = 0,
      settlement: Awaited<ReturnType<Settlement["settle"]>> | undefined;
    if (settleInitial) {
    const holds: number[] = [];
    worker = await Settlement.open(a, new BulkQueue(1, (ms) => holds.push(ms)));
    jsonFile(path.join(out, "held-initial.json"), {
      source,
      attempt: peer.attempt,
      installed,
      initial,
      firstCorrectMs: initialRead.ended - initialAt,
      initialRead,
    });
    settlement = await worker.settle(initial.seq, initialAt - performance.timeOrigin);
    // [DX-ACT6] DX_ACT6_STREAM_CHECK=1 (byte frames only): the stored changes and the packets are compared with the
    // oracle as they are read, page by page, instead of loaded whole (60 million changes at 200 owed forms for 100,000
    // subjects would not fit the runner's heap). The same comparisons, in the same order.
    const streamed = process.env.DX_ACT6_STREAM_CHECK === "1";
    assert([undefined, "", "1"].includes(process.env.DX_ACT6_STREAM_CHECK));
    const [stored, packets] = streamed
      ? [{ frontier: (await worker.archive.values(initial.seq))!.value, output: [] as { subject: string; changes: [string, string | null][] }[], frames: "bytes" as const }, []]
      : await Promise.all([
          worker.archive.stored(initial.seq),
          worker.recorder.packets(settlement.notices.position),
        ]);
    assert.equal(stored.frontier.status, "stored");
    // [DX-ACT4] Byte-framed pages hold each subject's changes without its full answer.
    const bytes = stored.frames === "bytes";
    const independent = { subjects: 0, owing: 0, changes: 0, notices: 0 };
    const archive = new Map(stored.output.map((x) => [x.subject, x]));
    assert.equal(stored.output.length, archive.size, "Duplicate settled subject");
    let notices = packets.flatMap((p) => p.deliveries.map(toWire));
    const valueStream = streamed ? worker.archive.storedStream(initial.seq) : undefined;
    const packetStream = streamed ? worker.recorder.streamPackets(settlement.notices.position) : undefined;
    let noticeBase = 0;
    // Streamed: keep the packets' deliveries from `entries` on (`noticeBase` is the index of notices[0]).
    const needNotices = async (upTo: number) => {
      if (!packetStream) return;
      if (entries > noticeBase) {
        notices = notices.slice(entries - noticeBase);
        noticeBase = entries;
      }
      while (noticeBase + notices.length < upTo) {
        const next = await packetStream.next();
        assert(!next.done, "Fewer recorded notices than the oracle's");
        notices.push(...next.value.deliveries.map(toWire));
      }
    };
    const nextStored = async (subject: string) => {
      const next = await valueStream!.next();
      assert(!next.done && next.value.subject === subject, "Stored changes out of census order at " + subject);
      return next.value;
    };
    for (let i = 0; i < people; i += 32 * oracles.children.length) {
      await Promise.all(
        oracles.children.map(async (oracle, workerIndex) => {
          const first = i + workerIndex * 32;
          if (first >= people) return;
          const worlds = Array.from({ length: Math.min(32, people - first) }, (_, j) =>
            expected(first + j, initial.position, history, positions, aged0),
          );
          const b = { tx: initial.position, validTime };
          const text = await oracle.call("check", {
            document: initial.doc,
            old: null,
            basis: b,
            worlds,
            fold: true,
          });
          return JSON.parse(text) as {
            subject: string;
            json: string;
            rows: [string, string | null, string | null][];
            deliveries: unknown[];
          }[];
        }),
      ).then((parts) => {
        return parts;
      }).then(async (parts) => {
        for (const p of parts)
          for (const row of p ?? []) {
            if (streamed && row.rows.length) archive.set(row.subject, await nextStored(row.subject));
            await needNotices(entries + row.deliveries.length);
            const at0 = entries - noticeBase;
            const saved = archive.get(row.subject);
            if (row.rows.length) {
              assert.deepEqual(saved, {
                subject: row.subject,
                ...(bytes ? {} : { json: row.json }),
                changes: row.rows.map(([k, , v]) => [k, v]),
              });
              archive.delete(row.subject);
            } else assert(!saved);
            changes += row.rows.length;
            assert.deepEqual(
              notices.slice(at0, at0 + row.deliveries.length),
              row.deliveries,
            );
            if (initialLarge) {
              const i = Number(row.subject.slice(4)),
                e = expectForms(expected(i, initial.position, history, positions, aged0), initialDoc, validTime);
              const got = checkForms(e, row.subject, saved?.changes ?? [],
                notices.slice(at0, at0 + row.deliveries.length) as never, true);
              independent.subjects++;
              if (e.changes.size) independent.owing++;
              independent.changes += got.changes;
              independent.notices += got.notices;
            }
            entries += row.deliveries.length;
          }
      });
    }
    if (streamed) {
      assert((await valueStream!.next()).done, "More stored subjects than the oracle's");
      await needNotices(entries);
      assert(notices.length === entries - noticeBase && (await packetStream!.next()).done, "More recorded notices than the oracle's");
    }
    assert.deepEqual(
      [archive.size, changes, entries],
      [0, settlement!.values.state.changes, noticeBase + notices.length],
    );
    const archived = await worker.archive
      .reader()
      .readAt(W0.placementId(people - 1), { position: initial.position, validTime });
    const derived = await demand.read(W0.placementId(people - 1), {
      position: initial.position,
      validTime,
    });
    assert.equal(archived.route, bytes ? "authoritative-source" : "receipt-archive");
    assert.equal(archived.json, derived.result.json);
    await activeLedger.verifyThrough(await s.head());
    jsonFile(path.join(out, "held-setup.json"), {
      preparedMs: prepared - start,
      installed,
      meta,
      initial,
      coldFirstMs: initialRead.ended - initialAt,
      valuesDurableMs: settlement.values.ms,
      noticesDurableMs: settlement.notices.ms,
      settlement,
      checkedChanges: changes,
      checkedEntries: entries,
      // [DX-ACT4] The framing, the frames each writer wrote, the largest estimated hold of the writer, and each bulk
      // turn's client-side duration (queue entry to reply).
      frames: {
        mode: stored.frames,
        initial: initialLarge ? shapeName(shape!) : "R1",
        values: frameSummary(worker.archive.admitted),
        notices: frameSummary(worker.recorder.archive.admitted),
        turnMs: summarizeMs(holds),
        independent: initialLarge ? independent : null,
      },
    });
    await worker.close();
    worker = undefined;
    } else
      jsonFile(path.join(out, "held-setup.json"), {
        preparedMs: prepared - start, installed, meta, initial, coldFirstMs: initialRead.ended - initialAt,
        settlement: "skipped: DX_ACT3_RELEASE set without DX_ACT3_SETTLE=1",
      });
    // [DX-ACT5] Settlement beside live saves (diagnostic toy only): DX_ACT5_LIVE runs its cases instead of the windows.
    if (process.env.DX_ACT5_LIVE) {
      assert(diagnostic || process.env.DX_ACT5_SERVER === "1", "DX_ACT5_LIVE is a toy diagnostic unless DX_ACT5_SERVER=1");
      const { livePhase } = await import("./settle-live.ts");
      await livePhase({
        out, s, a, offer, verifyRead: verifyRead as never, demand: demand as never, writer, seed, people, history, positions,
        ledger: activeLedger, releases, descriptor, db, ordered: Boolean(ordered), attempt: peer.attempt,
        aged: aged ? agedOf : undefined, agedSeal: aged,
      });
      return;
    }
    // [DX-ACT8] A Publish and an enrolment beside every account's saves (diagnostic toy unless DX_ACT8_SERVER=1): this
    // builder's gate parts (beside-gate.ts) instead of the windows.
    if (process.env.DX_ACT8_GATE === "1") {
      assert(diagnostic || process.env.DX_ACT8_SERVER === "1", "DX_ACT8_GATE is a toy diagnostic unless DX_ACT8_SERVER=1");
      const { besideGate } = await import("./beside-gate.ts");
      await besideGate({
        out, s, a, offer, verifyRead: verifyRead as never, demand: demand as never, writer, seed, people, history, positions,
        ledger: activeLedger, releases, descriptor, db, ordered: Boolean(ordered), attempt: peer.attempt,
        firstCorrect: firstCorrect as never, reader, peer,
      });
      return;
    }
    // [DX-ACT10] The adversarial review's stack checks (diagnostic toy only) instead of the windows.
    if (process.env.DX_ACT10_STACK === "1") {
      assert(diagnostic, "DX_ACT10_STACK is a toy diagnostic");
      const { act10Stack } = await import("../../act10/stack-part.ts");
      await act10Stack({ out, s, descriptor, attempt: peer.attempt });
      return;
    }
    const windows: PairSample[] = [];
    // [DX-ACT6] By reference, the definitions the windows publish are written once here, before any window (unfenced,
    // idempotent), so each Publish writes none ahead and the save pause around it covers only its record, as in the
    // product, where a release's definitions are prepared before it is published.
    const definitionsAhead = docsMode() === "ref"
      ? { started: now(), refs: [await a.writeDefinitions(W0.R2.doc), await a.writeDefinitions(large ?? W0.R3.doc)], ms: 0 }
      : undefined;
    if (definitionsAhead) definitionsAhead.ms = now() - definitionsAhead.started;
    if (definitionsAhead) jsonFile(path.join(out, "held-definitions.json"), definitionsAhead);
    for (const rate of diagnostic ? ([3.5, 23.5] as const) : rates) {
      const seconds = diagnostic ? 8 : 100;
      const tape = heldTape(people as Density, rate, seconds);
      const order = rate === 23.5 ? [...creditModes].reverse() : creditModes;
      for (const mode of order)
        for (const publish of [false, true]) {
          if (!wanted(mode, rate, publish)) continue;
          const from = await s.head();
          const senders = await preload(writer, seed, from, tape);
          const begins = now() + 400,
            ends = begins + seconds * 1000;
          const gate: PublishInterleave = {
            paused: false,
            committed: (save) => {
              activeLedger.saved(save);
              if (!save.account) {
                const e = byAccount.get(save.ordinal)!;
                assert.equal(e.subject, save.subject);
                const edits = history.get(save.subject) ?? [];
                edits.push({ position: save.receipt!.p, width: e.width, version: e.version });
                history.set(save.subject, edits);
              }
            },
          };
          const byAccount = new Map(tape.filter((x) => x.account === 0).map((x) => [x.ordinal, x]));
          const first: number[] = [],
            deadline: unknown[] = [],
            native: {
              r: Release;
              ingress: number;
              waiting: number[];
              pausedAt: number;
              drained: number;
              firstCorrect?: unknown;
              readHeadAfterAck?: { position: number; at: number };
            }[] = [];
          let within1000 = 0,
            within100000 = 0,
            missedDeadlines = 0,
            done = false;
          const ticking = (async () => {
            while (!done) {
              await sleep(50);
              if (!gate.paused) await activeLedger.verifyThrough(activeLedger.pending(), true);
            }
          })();
          void ticking.catch(() => {});
          // [DX-RD4] The read gateway's at-least counters over the window (requests, waits, wait time, refusals).
          const atLeastBefore = probeAtLeast ? await atLeastCounters() : undefined;
          const writes = play(
            senders,
            tape,
            begins,
            peer.attempt + "/" + mode + "/" + rate + "/" + publish,
            false,
            ordered,
            creditModeSelection(mode),
            gate,
          );
          const message = {
            kind: "begin" as const,
            key: "held",
            repeat: 0,
            people: people as Density,
            cell: total(rate) === 394 ? (394 as const) : (235 as const),
            start: begins,
            scopes: [seed.scope],
            withReaders: true,
          };
          const pinReads = Promise.all([
            readCell(reader, 0, message, diagnostic),
            readCell(reader, 1, message, diagnostic),
          ]);
          const publication = (async () => {
            if (!publish) return;
            // [DX-ACT3] DX_ACT3_TOY_PUBLISHES (diagnostic only, 2 to 6) packs more Publishes into a toy window.
            const toy = Number(process.env.DX_ACT3_TOY_PUBLISHES ?? 2);
            assert(Number.isInteger(toy) && toy >= 2 && toy <= 6 && (diagnostic || toy === 2));
            for (let j = 0; j < (diagnostic ? toy : 20); j++) {
              const offered = begins + j * (diagnostic ? (toy === 2 ? 3000 : 1200) : 5000);
              await wait(offered);
              const ingress = now(),
                doc = releases.at(-1)!.doc.name === "R2" ? (large ?? W0.R3.doc) : W0.R2.doc;
              const members = samples(people, j);
              const cutoff = (async () => {
                await wait(offered + 1000);
                const attempted = now();
                const reads = await Promise.all(
                  members.map((i) => demand.read(W0.placementId(i), { validTime })),
                );
                return { attempted, reads };
              })();
              const waiting = gate.waiting!();
              let r: Release;
              if (unpausedMode()) {
                // [DX-ACT8] Nothing pauses or drains: the Publish is offered while every save keeps going. Under the
                // whole-head rule it is refused ("exhausted three serial predecessor attempts"); that is recorded with
                // the window and the window goes on, so the old rule's refusals are counted, not hidden.
                const pausedAt = now();
                try {
                  r = await offer(doc, peer.attempt + ":" + mode + ":" + rate + ":" + j, offered);
                } catch (e) {
                  if (!/exhausted three serial predecessor attempts|Source changed at admission/.test(String((e as Error)?.message)))
                    throw e;
                  refusedPublishes.push({ mode, rate, j, offered, refusedAt: now(), message: String((e as Error).message) });
                  await cutoff.catch(() => undefined);
                  continue;
                }
                native.push({ r, ingress, waiting, pausedAt, drained: pausedAt });
              } else {
                gate.paused = true;
                const pausedAt = now();
                try {
                  await gate.drain!();
                  const drained = now();
                  r = await offer(doc, peer.attempt + ":" + mode + ":" + rate + ":" + j, offered);
                  native.push({ r, ingress, waiting, pausedAt, drained });
                } finally {
                  gate.paused = false;
                  gate.resume!();
                }
              }
              await handReceipt(r);
              // [DX-ACT3] The read gateway's basis after the write gateway's acknowledgement and before the probe
              // (one round trip, outside the paused turn, so the gate hold is unchanged).
              const head = await reader.basis(db);
              native.at(-1)!.readHeadAfterAck = { position: Number(head.position.v), at: now() };
              const firstSubject = members.at(-1)!;
              const { probe, earlier } = await firstCorrect(r, firstSubject, offered);
              // [DX-ACT3] The read gateway's own head just after the answer, for the lag evidence.
              native.at(-1)!.firstCorrect = { earlier, basisTx: probe.result.basis.tx, route: probe.result.route,
                started: probe.started, ended: probe.ended };
              first.push(probe.ended - offered);
              const d = await cutoff;
              const timely =
                d.attempted <= offered + 1025 && d.reads.every((x) => x.started <= offered + 1025);
              if (!timely) missedDeadlines++;
              let all = true;
              for (const [index, read] of d.reads.entries()) {
                const effective = releases.findLast((x) => x.position <= read.result.basis.tx);
                assert(effective);
                const wrong = inject === "mismatch" && !injected;
                if (wrong) injected = true;
                await verifyRead(read, effective, wrong ? (members[index]! + 1) % people : members[index]!, "deadline");
                if (effective.position !== r.position) all = false;
              }
              deadline.push({
                ...d,
                timely,
                all,
                scheduled: offered + 1000,
                probe,
                active: r.position,
              });
              within1000 += Number(timely && all && probe.ended <= offered + 1000);
              within100000 += Number(
                probe.ended <= offered + 100000 && r.received <= offered + 100000,
              );
            }
          })();
          let result, sides, windowFailure: string | undefined;
          try {
            const settled = await Promise.allSettled([writes, pinReads, publication]);
            const [w, p, q] = settled;
            if (w.status === "rejected") throw w.reason;
            if (p.status === "rejected") throw p.reason;
            if (q.status === "rejected") {
              if (!(q.reason instanceof ReadCheckFailed)) throw q.reason;
              windowFailure = q.reason.message;
            }
            [result, sides] = [w.value, p.value];
          } finally {
            done = true;
            await ticking;
          }
          const atLeastAfter = probeAtLeast ? await atLeastCounters() : undefined;
          const terminal = await s.head();
          await activeLedger.verifyThrough(terminal);
          assert.equal(result.unresolved.size, 0, "Uncertain writer or foreign cut");
          const reads = new Histogram();
          for (const side of sides) reads.merge(Histogram.fromJSON(side.latency));
          const readOffered = sides.reduce((n, r) => n + r.planned, 0);
          const evidence = {
            mode,
            rate,
            load: total(rate),
            publish,
            first,
            within1000,
            within100000,
            missedDeadlines,
            durabilityP50Ms: pct(
              native.map((x) => x.r.durableAt - x.r.offer),
              0.5,
            ),
            durabilityP99Ms: p99(native.map((x) => x.r.durableAt - x.r.offer)),
            gateHoldP99Ms: p99(native.map((x) => x.r.received - x.pausedAt)),
            // [DX-ACT8] The save pause (none when unpaused), the Publish rule, refusals, and for each Publish the
            // commits that landed between its read and its record, and the tries it sent.
            unpaused: unpausedMode(),
            publishRule: publishBeside() ? "account" : "head",
            publishesRefused: refusedPublishes.filter((x: any) => x.mode === mode && x.rate === rate).length,
            commitsBetweenReadAndRecord: native.map((x) => x.r.position - x.r.read - 1),
            publishTries: native.map((x) => x.r.tries),
            recordBytesMax: native.length ? Math.max(...native.map((x) => x.r.recordBytes)) : null,
            recordChangesMax: native.length ? Math.max(...native.map((x) => x.r.recordChanges)) : null,
            activeWaitP99Ms: p99(native.map((x) => x.drained - x.pausedAt)),
            writes: writeSummary(result.rows, begins, ends),
            reads: reads.summary(),
            readOffered,
            readMissing: readOffered - reads.count,
            readCheckFailure: windowFailure ?? null,
            visibilityFailures: visibilityFailures.length,
            probeAtLeast,
            atLeastDefects: atLeastDefects.length,
            readGatewayAtLeast: atLeastBefore && atLeastAfter ? Object.fromEntries(
              (["requests", "waited", "waitMicros", "timeouts"] as const).map((k) => [k, atLeastAfter[k] - atLeastBefore[k]])) : null,
            probesBeforePublishVisible: native.map((x) => (x.firstCorrect as { earlier: unknown[] } | undefined)?.earlier.length ?? null),
            readHeadLagAfterAck: native.map((x) => x.readHeadAfterAck ? x.r.position - x.readHeadAfterAck.position : null),
          };
          windows.push(evidence);
          jsonFile(path.join(out, "held-" + mode + "-" + rate + "-" + Number(publish) + ".json"), {
            source,
            attempt: peer.attempt,
            seal: descriptor.seal,
            from,
            terminal,
            begins,
            ends,
            tape,
            saves: result.rows,
            read: sides,
            native,
            deadline,
            evidence,
          });
        }
    }
    const report = windows.map((r) => {
      // A window subset (DX_HELD_WINDOWS) may leave out a control; its ratios are then null.
      const quiet = windows.find((x) => x.mode === r.mode && x.rate === 3.5 && !x.publish);
      const control = windows.find((x) => x.mode === r.mode && x.rate === r.rate && !x.publish);
      return {
        ...r,
        firstP50Ms: pct(r.first, 0.5),
        firstP99Ms: p99(r.first),
        againstQuiet: {
          read: ratio(r.reads.p99Ms, quiet?.reads.p99Ms),
          commit: ratio(r.writes.account.p99Ms, quiet?.writes.account.p99Ms),
        },
        againstMatchedControl: {
          read: ratio(r.reads.p99Ms, control?.reads.p99Ms),
          commit: ratio(r.writes.account.p99Ms, control?.writes.account.p99Ms),
        },
      };
    });
    // [DX-ACT1] Why: reopening with empty memory verifies both historical and current pins from the same durable source.
    // Rejected: passing a previously memoized string back to the verifier.
    await connected.close();
    connected = await readerPeer(peer, name, descriptor);
    const final = releases.at(-1)!;
    const reopen = await Promise.all(
      [initial, final].map((r) =>
        connected!.read(W0.placementId(people - 1), { position: r.position, validTime }),
      ),
    );
    await verifyRead(reopen[0]!, initial, people - 1);
    await verifyRead(reopen[1]!, final, people - 1);
    jsonFile(path.join(out, "held-reopened.json"), {
      source,
      attempt: peer.attempt,
      seal: descriptor.seal,
      reopen,
    });
    jsonFile(path.join(out, "held-observations.json"), {
      source,
      slot: peer.slot,
      attempt: peer.attempt,
      seal: descriptor.seal,
      diagnostic,
      people,
      physicalScope: db,
      checkedChanges: changes,
      checkedEntries: entries,
      settlement: settlement
        ? { valuesMs: settlement.values.ms, noticesMs: settlement.notices.ms }
        : "skipped",
      release: shape ? { shape, name: shapeName(shape) } : null,
      windows: report,
      selectedWindows: selected ?? null,
      readFailures,
      visibilityFailures,
      probeAtLeast,
      atLeastDefects,
      unpaused: unpausedMode(),
      publishRule: publishBeside() ? "account" : "head",
      refusedPublishes,
      durationMs: now() - start,
    });
    // [DX-ACT8] Under the account guard no Publish may be refused beside saves.
    assert(!publishBeside() || refusedPublishes.length === 0, "Publishes refused under the account guard: " + JSON.stringify(refusedPublishes));
    // [DX-ACT3] A read check that failed in any window fails the run, after every window has recorded itself.
    assert.equal(readFailures.length, 0, "Held read checks failed: " + JSON.stringify(readFailures));
    assert.equal(atLeastDefects.length, 0,
      "Store defect: probes answered before the receipt position they were given: " + JSON.stringify(atLeastDefects));
    assert.equal(visibilityFailures.length, 0,
      "Probes answered before the acknowledged Publish was visible: " + JSON.stringify(visibilityFailures));
  } finally {
    await worker?.close();
    await connected?.close();
    await store?.close();
    oracles.close();
    writer.close();
    reader.close();
  }
}

export function seedToy(out: string, nonce: string, endpoint: string, source: string) {
  execFileSync(
    process.execPath,
    [
      "--no-warnings",
      "--experimental-transform-types",
      "lab/experiments/EXP-DX1/age1/scale1-fixture.mjs",
      process.cwd(),
      out,
      nonce,
      endpoint,
      process.cwd(),
      source,
    ],
    { stdio: "inherit", timeout: 120_000 },
  );
}
