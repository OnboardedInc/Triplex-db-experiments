// [DX-ACT10] Schedule fuzzer over the narrowed guards (diagnostic only; Mac, in process, toy size).
// The REAL JoinedAccount (Publish under TX2_PUBLISH_BESIDE), Archive and RecordedNotices (frames under
// TX2_SETTLE_PRECONDITION=progress) run over memstore.ts with seeded random interleavings at every store call:
// saves of the publishing account (subject facts, child entities, references added and removed, back-dated and
// future-dated changes), saves of a second account, Publishes (two racing, saves forced between the read and the
// record, killed with and without a lost reply), a second account's Publish, two or three settling processes killed and
// restarted, stalls of the transactor. After each schedule a clean process finishes settlement and the break conditions
// are checked against positions read from the store:
//   values  : each release's stored changes equal the release's difference over every subject's world at q - 1
//             (status stored), or a prefix of it (superseded);
//   notices : the recorded deliveries, in order, equal a fold of every event over every subject's world at the event's
//             position; every ledger equals the fold's items;
//   Publish : every acknowledged Publish is its own account's record; the release list and the notice tail hold
//             exactly the landed Publishes; no Publish is refused under the account guard by anything but its own
//             account's events;
//   reads   : a read pinned at random positions answers the release whose record is the newest at or before it.
// Run: node --experimental-strip-types lab/experiments/EXP-DX1/act10/fuzz.ts --from 0 --count 100 --out <file.json>
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { dropMemoryScope, forkMemoryScope } from "../../../bench/lib/memory.ts";
import { W0, canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { ids } from "../../../bench/lib/world.ts";
import { Documents, hash, unpack } from "../notify1/store.ts";
import { worldsAt, winner } from "../actv-lazy/decision.ts";
import { JoinedAccount, joinedCommandId } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { toWire } from "../actv-lazy/join/check.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { readLedgers } from "../actv-lazy/join/ledger-parts.ts";
import { evaluateRows } from "../actv-lazy/join/material.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { Settlement } from "../actv-lazy/join/settlement.ts";
import { Conflict } from "../actv-lazy/store.ts";
import { heldAccount, Killed, MemDb, memStore, Proc, rng, seedAccount, type Rng } from "./memstore.ts";

const arg = (k: string, d?: string) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1]! : d;
};
const FROM = Number(arg("--from", "0")),
  COUNT = Number(arg("--count", "20")),
  OUT = arg("--out"),
  PEOPLE = Number(arg("--people", "6")),
  FORMS = Number(arg("--forms", "20")),
  ONLY = arg("--only");
const validTime = W0.POPULATION_VALID_TIME;
const V = Date.parse(validTime);
const A = "acct-a",
  B = "acct-b";
const SCOPE = "act10-fz-" + process.pid;
const SNAP = SCOPE + "-snap";
process.env.TX2_ENROL_BESIDE_SAVES = "1";
const shape = (permille: number) => parseShape("forms=" + FORMS + ",policies=" + FORMS + ",permille=" + permille);
const DOCS: Record<string, W0.ReleaseDoc> = {
  R1: W0.R1.doc,
  R2: W0.R2.doc,
  L1000: largeRelease(W0.R1.doc, shape(1000)),
  L500: largeRelease(W0.R1.doc, shape(500)),
  L700b: largeRelease(W0.R2.doc, shape(700)),
};

type Snapshot = { byEntity: Map<string, any[]>; lastChange: Map<string, number>; correlation: Map<string, string>; cuts: number[] };
let snapshot: Snapshot | undefined;

/** Seeds A and B, enrols both, publishes R1 in each (the baseline every schedule starts from), then snapshots. */
async function prepare() {
  dropMemoryScope(SCOPE);
  dropMemoryScope(SNAP);
  const db = new MemDb(SCOPE, 1);
  db.maxYield = 0;
  const cuts = [await seedAccount(db, A, PEOPLE), await seedAccount(db, B, PEOPLE)];
  const proc = new Proc(db, "prepare");
  for (const [i, n] of [A, B].entries()) {
    const a = new JoinedAccount(memStore(proc, heldAccount(n, PEOPLE, cuts[i]!)) as any);
    await a.installHeld(validTime);
    process.env.TX2_PUBLISH_BESIDE = "1";
    await a.publish(n + ":base:R1", DOCS.R1!, validTime, "owed");
  }
  // The baseline release of A settled (values and notices) before the snapshot.
  await settleAll(db, proc, heldAccount(A, PEOPLE, cuts[0]!), { precondition: "progress", ledger: "whole" } as Cfg, "prepare");
  const anyDb = db as any;
  snapshot = {
    byEntity: new Map([...anyDb.byEntity].map(([k, v]: [string, any[]]) => [k, v.map((x) => ({ ...x }))])),
    lastChange: new Map(anyDb.lastChange),
    correlation: new Map(db.correlation),
    cuts,
  };
  forkMemoryScope(SCOPE, SNAP);
}
function restore(seed: number) {
  dropMemoryScope(SCOPE);
  forkMemoryScope(SNAP, SCOPE);
  const db = new MemDb(SCOPE, seed) as any;
  db.byEntity = new Map([...snapshot!.byEntity].map(([k, v]) => [k, v.map((x) => ({ ...x }))]));
  db.lastChange = new Map(snapshot!.lastChange);
  for (const [k, v] of snapshot!.correlation) db.correlation.set(k, v);
  return db as MemDb;
}

type Cfg = {
  beside: boolean;
  precondition: "progress" | "head";
  docs: "ref" | "inline";
  ledger: "whole" | "parts";
  publishes: string[];
  race: boolean;
  hookSave: "afterRead" | "inside" | null;
  saves: number;
  savesB: number;
  settlers: number;
  kills: number;
  killPublisher: boolean;
  bPublish: boolean;
  stall: boolean;
  maxYield: number;
};
const FORCE = { beside: arg("--beside"), precondition: arg("--precondition"), docs: arg("--docs"), ledger: arg("--ledger") };
function config(r: Rng): Cfg {
  const names = Object.keys(DOCS).filter((x) => x !== "R1");
  const publishes = Array.from({ length: 1 + r.int(3) }, () => r.pick(names));
  const b = r.next() < 0.85,
    pre = r.next() < 0.85,
    docs = r.next() < 0.5,
    ledger = r.next() < 0.3;
  const beside = FORCE.beside ? FORCE.beside === "1" : b;
  return {
    beside,
    precondition: (FORCE.precondition as Cfg["precondition"]) ?? (pre ? "progress" : "head"),
    docs: (FORCE.docs as Cfg["docs"]) ?? (docs ? "ref" : "inline"),
    ledger: (FORCE.ledger as Cfg["ledger"]) ?? (ledger ? "parts" : "whole"),
    publishes,
    race: publishes.length >= 2 && r.next() < 0.35,
    hookSave: beside && r.next() < 0.5 ? r.pick(["afterRead", "inside"] as const) : null,
    saves: r.int(14),
    savesB: r.int(6),
    settlers: 1 + r.int(3),
    kills: r.int(4),
    killPublisher: r.next() < 0.15,
    bPublish: r.next() < 0.5,
    stall: r.next() < 0.3,
    maxYield: 1 + r.int(4),
  };
}

let fileSerial = 0;
/** A save of one fact of subject `i` of `account`: one commit, guarded only by its own retractions. */
async function save(proc: Proc, account: string, i: number, r: Rng, tag: string) {
  const prefix = "acct/" + account + "/";
  const comp = proc.comp();
  for (let attempt = 0; attempt < 6; attempt++) {
    const head = await comp.currentPosition();
    const rows = (await comp.sweepPage([prefix + ids.placement(i)], { position: head, validAt: V })).rows as any[];
    const kind = r.int(10);
    let ops: any[];
    const scalar = rows.filter((x) => x.value.type !== "ref" && !/^:subject\//.test(x.attribute) && !/^:task\/status/.test(x.attribute));
    const target = r.pick(scalar);
    const next = (v: any) =>
      v.type === "integer" ? { ...v, value: String(Number(v.value) + 1 + r.int(900)) } :
      /^\d{4}-\d{2}-\d{2}$/.test(String(v.value)) ? { ...v, value: "2026-" + String(1 + r.int(12)).padStart(2, "0") + "-" + String(1 + r.int(28)).padStart(2, "0") } :
      target.attribute === ":person/custom-background" ? { ...v, value: r.pick(["clear", "pending", "consider"]) } :
      { ...v, value: "act10-" + sha256(tag + attempt).slice(0, 10) };
    if (kind <= 5) {
      // a value change of any fact of the subject (root, worker, task, file, nested step)
      ops = [{ op: "retract", id: target.id }, { op: "assert", entityId: target.entityId, attribute: target.attribute, value: next(target.value), validFrom: target.validFrom, ...(target.validTo == null ? {} : { validTo: target.validTo }) }];
    } else if (kind === 6) {
      // back-dated correction: the old value closed in the past, the new one from then on
      const t = V - (1 + r.int(30)) * 86_400_000;
      ops = [{ op: "retract", id: target.id },
        ...(target.validFrom < t ? [{ op: "assert", entityId: target.entityId, attribute: target.attribute, value: target.value, validFrom: target.validFrom, validTo: t }] : []),
        { op: "assert", entityId: target.entityId, attribute: target.attribute, value: next(target.value), validFrom: Math.min(t, Math.max(target.validFrom, t)) }];
    } else if (kind === 7) {
      // future-dated change: the old value closes after the valid time, the new one starts then (invisible now)
      const t = V + (1 + r.int(30)) * 86_400_000;
      ops = [{ op: "retract", id: target.id },
        { op: "assert", entityId: target.entityId, attribute: target.attribute, value: target.value, validFrom: target.validFrom, validTo: t },
        { op: "assert", entityId: target.entityId, attribute: target.attribute, value: next(target.value), validFrom: t }];
    } else if (kind === 8) {
      // a new child entity by reference: a document file with an expiry
      const file = prefix + ids.document(i, 9, ++fileSerial);
      ops = [{ op: "assert", entityId: prefix + ids.worker(i), attribute: ":person/file", value: { type: "ref", value: file }, validFrom: rows[0].validFrom },
        { op: "assert", entityId: file, attribute: ":file/expiresOn", value: { type: "string", value: r.pick(["2026-02-01", "2027-09-30", "2026-11-05"]) }, validFrom: rows[0].validFrom }];
    } else {
      // a reference removed (a document file unlinked), or a value change if the subject has no file
      const link = rows.filter((x) => x.attribute === ":person/file");
      ops = link.length ? [{ op: "retract", id: r.pick(link).id }] :
        [{ op: "retract", id: target.id }, { op: "assert", entityId: target.entityId, attribute: target.attribute, value: next(target.value), validFrom: target.validFrom }];
    }
    const res = await comp.transact(ops, { commandId: "save:" + tag + ":" + attempt, actor: "act10/save", preconditions: ops.filter((o) => o.op === "retract").map((o) => ({ _tag: "TripleLive", id: o.id })) });
    if (res.ok) return res.value.position;
  }
  return undefined;
}

type Outcome = { seed: number; cfg: Cfg; violations: string[]; counts: Record<string, number> };

async function schedule(seed: number): Promise<Outcome> {
  const r = rng(seed * 7919 + 17);
  const cfg = config(r);
  const db = restore(seed);
  db.maxYield = cfg.maxYield;
  const violations: string[] = [];
  const counts: Record<string, number> = {};
  const count = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
  const env = { TX2_PUBLISH_BESIDE: cfg.beside ? "1" : "0", TX2_RELEASE_DOCS: cfg.docs === "ref" ? "ref" : "" };
  Object.assign(process.env, env);
  const hA = heldAccount(A, PEOPLE, snapshot!.cuts[0]!),
    hB = heldAccount(B, PEOPLE, snapshot!.cuts[1]!);
  if (cfg.stall)
    db.stall = async () => {
      if (db.random.next() < 0.15) for (let k = db.random.int(6); k > 0; k--) await new Promise((x) => setImmediate(x));
    };
  // ---- actors ----
  const acknowledged: { account: string; id: string; position: number; txId: string; doc: string }[] = [];
  const refused: { id: string; message: string }[] = [];
  let publishing = true;
  let killsLeft = cfg.kills;
  const publisher = async (account: string, held: typeof hA, docs: string[], race: boolean) => {
    const proc = new Proc(db, "publisher-" + account);
    if (cfg.killPublisher && account === A) {
      proc.killAfter = 5 + r.int(60);
      proc.lostReply = r.next() < 0.5;
    }
    const a = new JoinedAccount(memStore(proc, held) as any);
    const one = async (k: number, name: string) => {
      const id = account + ":" + seed + ":" + k + ":" + name;
      const hook = cfg.hookSave && account === A
        ? { [cfg.hookSave]: async () => { const p = await save(new Proc(db, "hook"), A, r.int(PEOPLE), r, "hook" + seed + k); if (p) count("hookSaves"); } }
        : {};
      try {
        // Account B publishes with full documents unless ACT10_CROSS_DOCS=1: by reference, two accounts that share a
        // predecessor document collide on the definitions' command IDs (finding F2, cross-account.test.ts X3, X4).
        const docs = account === B && process.env.ACT10_CROSS_DOCS !== "1" ? { docs: "inline" } : {};
        const receipt = await a.publish(id, DOCS[name]!, validTime, "owed", undefined, { ...hook, ...docs } as never);
        acknowledged.push({ account, id, position: receipt.position, txId: receipt.txId, doc: name });
      } catch (e: any) {
        if (e instanceof Killed) return;
        refused.push({ id, message: String(e?.message ?? e).slice(0, 200) });
        if (!(e instanceof Conflict)) violations.push("Publish " + id + " failed: " + String(e?.stack ?? e).slice(0, 400));
      }
    };
    if (race) await Promise.all(docs.map((d, k) => one(k, d)));
    else for (const [k, d] of docs.entries()) await one(k, d);
  };
  const saver = async (account: string, n: number) => {
    const proc = new Proc(db, "saver-" + account);
    for (let j = 0; j < n; j++) {
      const p = await save(proc, account, r.int(PEOPLE), r, account + seed + ":" + j);
      if (p) count("saves" + (account === A ? "A" : "B"));
    }
  };
  let generation = 0;
  const settler = async (k: number) => {
    // Settles every owed release of A in order and records every event, restarting after a kill, until the
    // publishers are done and nothing is left.
    for (;;) {
      const proc = new Proc(db, "settler-" + k + "-" + generation++);
      if (killsLeft > 0 && r.next() < 0.6) {
        killsLeft--;
        proc.killAfter = 3 + r.int(120);
        proc.lostReply = r.next() < 0.5;
      }
      try {
        const done = await settleAll(db, proc, hA, cfg, "p" + k + "g" + generation);
        if (done && !publishing) return;
      } catch (e: any) {
        if (e instanceof Killed) {
          count("kills");
          continue;
        }
        violations.push("settler " + k + ": " + String(e?.stack ?? e).slice(0, 500));
        return;
      }
      await new Promise((x) => setImmediate(x));
    }
  };
  const settlers = Array.from({ length: cfg.settlers }, (_, k) => settler(k));
  const publishers = Promise.all([
    publisher(A, hA, cfg.publishes, cfg.race),
    cfg.bPublish ? publisher(B, hB, [r.pick(["L1000", "R2"])], false) : Promise.resolve(),
    saver(A, cfg.saves),
    saver(B, cfg.savesB),
  ]).finally(() => (publishing = false));
  await publishers;
  await Promise.all(settlers);
  // A clean process finishes everything (no kills).
  db.stall = undefined;
  const clean = new Proc(db, "clean");
  try {
    await settleAll(db, clean, hA, cfg, "clean");
  } catch (e: any) {
    violations.push("clean settlement: " + String(e?.stack ?? e).slice(0, 500));
    return { seed, cfg, violations, counts };
  }
  db.maxYield = 0;
  await check(db, cfg, hA, hB, acknowledged, refused, violations, counts, r);
  return { seed, cfg, violations, counts };
}

const queues = new Map<string, BulkQueue>();
/** One settling process's pass: values of every owed release of A (in order) and the notices of every event. */
async function settleAll(db: MemDb, proc: Proc, held: ReturnType<typeof heldAccount>, cfg: Cfg, label: string) {
  const s = memStore(proc, held) as any;
  const a = new JoinedAccount(s);
  // The settlement stores: the same database, labelled per process (bulk.ts keeps one claim registry per Node process).
  const vs = memStore(proc, held, db.scope + "-" + label + "-v") as any,
    ns = memStore(proc, held, db.scope + "-" + label + "-n") as any;
  const queue = new BulkQueue(1);
  const values = new (Archive as any)(a, vs, queue, "values", "bytes", cfg.precondition) as Archive;
  const notices = new (Archive as any)(a, ns, queue, "notices", "bytes", cfg.precondition) as Archive;
  const recorder = new RecordedNotices(notices, cfg.ledger);
  const head = await s.head();
  const c = await s.controls(head);
  const tail = (await a.notices.observe()).value.sequence;
  const owed = c.releases.filter((x: any) => x.storage === "owed").sort((l: any, r: any) => l.tx - r.tx);
  await Promise.all([
    (async () => {
      for (const rel of owed) {
        const st = await values.values(rel.seq);
        if (!st || st.value.status === "pending") await values.runValues(rel.seq);
      }
    })(),
    tail ? recorder.record(tail) : Promise.resolve(),
  ]);
  const after = await s.controls(await s.head());
  return after.releases.length === c.releases.length && (await a.notices.observe()).value.sequence === tail;
}

/** The checks, against positions read from the store. */
async function check(
  db: MemDb, cfg: Cfg, hA: ReturnType<typeof heldAccount>, hB: ReturnType<typeof heldAccount>,
  acknowledged: { account: string; id: string; position: number; txId: string; doc: string }[],
  refused: { id: string; message: string }[], violations: string[], counts: Record<string, number>, r: Rng,
) {
  const v = (m: string) => violations.push(m);
  const proc = new Proc(db, "check");
  const s = memStore(proc, hA) as any,
    a = new JoinedAccount(s);
  const head = await s.head();
  const journal = (await db.comp.feedPage(0, 1_000_000)).transactions as any[];
  // -- Publish: each acknowledged Publish is its own account's record; release lists and tails hold exactly the landed.
  for (const x of acknowledged) {
    const tx = journal.find((t) => t.position === x.position);
    const rel = (x.account === A ? "lazy/account/releases/" + A : "lazy/account/releases/" + B);
    if (!tx || tx.commandId !== joinedCommandId({ held: x.account === A ? hA : hB } as never, x.id) || !tx.changes.some((c: any) => c.entityId === rel && c.op === "assert"))
      v("acknowledged Publish " + x.id + " is not its own account's record at " + x.position);
  }
  for (const [acct, held] of [[A, hA], [B, hB]] as const) {
    const st = memStore(proc, held) as any;
    const ja = new JoinedAccount(st);
    const landed = journal.filter((t) => t.actor === "lazy/join" && t.changes.some((c: any) => c.entityId === "lazy/account/releases/" + acct && c.op === "assert"));
    const rels = (await st.controls(head)).releases;
    const tail = (await ja.notices.observe()).value.sequence;
    if (rels.length !== landed.length || tail !== landed.length) v(acct + ": releases " + rels.length + ", tail " + tail + ", landed records " + landed.length);
    for (const t of landed) {
      const id = String(t.commandId).replace(/^joined:(?:[a-zA-Z0-9_.-]+\/)?/, "");
      if (id.includes(":base:")) continue;
      if (!acknowledged.some((x) => x.id === id) && !cfg.killPublisher) v(acct + ": Publish " + id + " landed but was not acknowledged and its process was not killed");
    }
  }
  if (cfg.beside)
    for (const x of refused)
      if (!cfg.race && !cfg.killPublisher) v("Publish " + x.id + " refused under the account guard with no rival Publish: " + x.message);
  counts.refused = refused.length;
  counts.acknowledged = acknowledged.length;
  // -- Values: every owed release of A, against the difference over every subject's world at q - 1.
  const rels = ((await s.controls(head)).releases as any[]).filter((x) => x.storage === "owed").sort((l, r) => l.tx - r.tx);
  const roster = Array.from({ length: PEOPLE }, (_, i) => W0.placementId(i));
  const docOf = new Map<number, W0.ReleaseDoc>();
  for (const rel of rels) {
    const id = String(journal.find((t) => t.position === rel.tx)!.commandId).replace(/^joined:(?:[a-zA-Z0-9_.-]+\/)?/, "");
    docOf.set(rel.tx, DOCS[id.split(":").at(-1)!]!);
  }
  const vstore = memStore(proc, hA, db.scope + "-check-v") as any;
  const values = new (Archive as any)(a, vstore, new BulkQueue(1), "values", "bytes", cfg.precondition) as Archive;
  for (const [k, rel] of rels.entries()) {
    if (k === 0) continue; // the baseline R1 (settled or not by the schedule's settlers alike)
    const q = rel.tx,
      doc = docOf.get(q)!,
      old = docOf.get(rels[k - 1].tx)!;
    const worlds = await worldsAt(s, "act2-deep", roster, { tx: q - 1, validTime });
    const want = evaluateRows({ worlds, basis: { tx: q, validTime } }, W0.compileRelease(old), W0.compileRelease(doc), false)
      .rows.filter((x) => x.rows.length).map((x) => ({ subject: x.subject, changes: x.rows.map(([key, , val]) => [key, val]) }));
    let stored;
    try {
      stored = await values.stored(rel.seq);
    } catch (e: any) {
      v("values of release " + rel.seq + " unreadable: " + String(e?.message).slice(0, 200));
      continue;
    }
    const got = stored.output.map((x: any) => ({ subject: x.subject, changes: x.changes }));
    const status = stored.frontier.status;
    counts["values-" + status] = (counts["values-" + status] ?? 0) + 1;
    if (status === "stored") {
      if (canonical(got) !== canonical(want)) v("release " + rel.seq + " (q " + q + "): stored changes differ from the world at q - 1");
      const later = rels[k + 1];
      if (later) {
        // S2: stored although a later release landed before its last frame.
        const progressKey = "values:" + rel.seq;
        const vdb = new Documents(db.comp as any, "settlement-values-" + A);
        const row = await vdb.row(progressKey, head);
        if (row && row.at > later.tx) counts.storedAfterSuperseded = (counts.storedAfterSuperseded ?? 0) + 1;
      }
    } else if (status === "superseded") {
      if (canonical(got) !== canonical(want.slice(0, got.length).map((w, j) => (j === got.length - 1 && got[j] ? { subject: w.subject, changes: w.changes.slice(0, got[j].changes.length) } : w))))
        v("release " + rel.seq + ": superseded values are not a prefix of the world at q - 1");
      if (!rels[k + 1]) v("release " + rel.seq + " superseded with no later release");
    }
    if (rels[k + 1]) {
      const key = new Documents(db.comp as any, "settlement-values-" + A).prefix + "values:" + rel.seq;
      const late = journal.filter((t) => t.position > rels[k + 1].tx && t.changes.some((c: any) => c.entityId === key && c.op === "assert")).length;
      if (late) counts.framesAfterSuperseded = (counts.framesAfterSuperseded ?? 0) + late;
      // the frame that marks a release superseded is one such frame; count the others (pages written for it)
      const pages = journal.filter((t) => t.position > rels[k + 1].tx && t.changes.some((c: any) => c.entityId === key && c.op === "assert") &&
        t.changes.some((c: any) => /answer:/.test(String(c.entityId)))).length;
      if (pages) counts.pagesAfterSuperseded = (counts.pagesAfterSuperseded ?? 0) + pages;
    }
    if (status === "superseded") {
    } else if (status !== "stored") v("release " + rel.seq + " still " + status + " after the clean settlement");
  }
  // -- Notices: the recorded deliveries in order, and the ledgers, against a fold over every event.
  const ns = memStore(proc, hA, db.scope + "-check-n") as any;
  const recorder = new RecordedNotices(new (Archive as any)(a, ns, new BulkQueue(1), "notices", "bytes", cfg.precondition), cfg.ledger);
  let packets;
  try {
    packets = await recorder.packets(head);
  } catch (e: any) {
    v("recorded notices unreadable: " + String(e?.message).slice(0, 200));
    return;
  }
  const got = packets.flatMap((p: any) => p.deliveries.map(toWire));
  const tail = (await a.notices.observe()).value.sequence;
  const ledgers = new Map<string, W0.ItemState[]>();
  const states = new Map<string, string[]>(roster.map((x) => [x, [canonical([])]]));
  const want: unknown[] = [];
  for (let n = 1; n <= tail; n++) {
    const e = await a.notices.event(n, head);
    const doc = docOf.get(e.at)!;
    const policy = W0.compileRelease(doc);
    assert.equal(policy.hash, e.value.nextHash);
    const worlds = await worldsAt(s, "act2-deep", roster, { tx: e.at, validTime: e.value.validTime });
    for (const w of worlds) {
      const out = W0.evaluateWorld(w, policy, { tx: e.at, validTime: e.value.validTime });
      assert(!("error" in out));
      const res = W0.publish({ items: ledgers.get(w.subject) ?? [], subjects: [], pending: [] }, [
        { subject: w.subject, release: e.value.nextHash, basis: { tx: BigInt(e.at), validTime: e.value.validTime }, workItems: (out as any).workItems },
      ]);
      ledgers.set(w.subject, res.state.items as W0.ItemState[]);
      states.get(w.subject)!.push(canonical(res.state.items));
      want.push(...res.deliveries.map(toWire));
    }
  }
  counts.notices = got.length;
  if (canonical(got) !== canonical(want)) {
    let i = 0;
    while (i < got.length && i < want.length && canonical(got[i]) === canonical(want[i])) i++;
    v("recorded notices differ from the fold: " + got.length + " recorded, " + want.length + " expected, first difference at " + i);
  }
  const ndb = new Documents(db.comp as any, "settlement-notices-" + A);
  const stored = await readLedgers(ndb, roster, head);
  for (const subject of roster)
    if (canonical(stored.get(subject)!.items) !== canonical(ledgers.get(subject) ?? [])) v("ledger of " + subject + " differs from the fold");
  // -- A ledger read at any position is a whole state of the fold (never half old, half new), parts or not.
  const noticeFrames = journal.filter((t) => String(t.commandId).startsWith("settled-notice:")).map((t) => t.position);
  for (const x of noticeFrames.flatMap((p) => [p - 1, p])) {
    try {
      const at = await readLedgers(ndb, roster, x);
      for (const subject of roster)
        if (!states.get(subject)!.includes(canonical(at.get(subject)!.items))) {
          v("ledger of " + subject + " at " + x + " is no whole state of the fold");
          break;
        }
    } catch (e: any) {
      v("ledger read at " + x + " refused: " + String(e?.message).slice(0, 160));
    }
    counts.ledgerReads = (counts.ledgerReads ?? 0) + 1;
  }
  const partsHeads = [...stored.values()].filter((l) => l.parts.length).length;
  if (partsHeads) counts.ledgersInParts = (counts.ledgersInParts ?? 0) + partsHeads;
  // -- Reads pinned at random positions: the release in force is the newest record at or before the position.
  const all = ((await s.controls(head)).releases as any[]);
  for (let k = 0; k < 4; k++) {
    const x = rels[0].tx + r.int(head - rels[0].tx + 1);
    const c = await s.controls(x);
    const w = winner(c, { tx: x, validTime });
    const newest = all.filter((y) => y.tx <= x).sort((l, r) => r.tx - l.tx)[0];
    if (w !== newest?.id) v("read at " + x + ": release in force is not the newest record at or before it");
  }
  void unpack;
  void hash;
}

async function main() {
  await prepare();
  const out: Outcome[] = [];
  const totals: Record<string, number> = {};
  let violating = 0;
  const started = Date.now();
  for (let seed = FROM; seed < FROM + COUNT; seed++) {
    if (ONLY && String(seed) !== ONLY) continue;
    let o: Outcome;
    try {
      o = await schedule(seed);
    } catch (e: any) {
      o = { seed, cfg: config(rng(seed * 7919 + 17)), violations: ["schedule threw: " + String(e?.stack ?? e).slice(0, 600)], counts: {} };
    }
    for (const [k, n] of Object.entries(o.counts)) totals[k] = (totals[k] ?? 0) + n;
    if (o.violations.length) {
      violating++;
      out.push(o);
      console.log("[act10-fuzz] seed " + seed + " " + JSON.stringify(o.cfg) + "\n  " + o.violations.slice(0, 4).join("\n  "));
    }
    if ((seed - FROM + 1) % 200 === 0)
      console.log("[act10-fuzz] " + (seed - FROM + 1) + " schedules, " + violating + " violating, " + Math.round((Date.now() - started) / 1000) + " s");
  }
  const summary = { from: FROM, count: COUNT, people: PEOPLE, forms: FORMS, schedules: COUNT, violating, totals, seconds: (Date.now() - started) / 1000, violations: out };
  if (OUT) writeFileSync(OUT, JSON.stringify(summary, null, 1));
  console.log("[act10-fuzz] done " + JSON.stringify({ ...summary, violations: out.length }));
  dropMemoryScope(SCOPE);
  dropMemoryScope(SNAP);
}
await main();
