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
import { JoinedAccount, joinedCommandId, scopedJoinedId } from "../actv-lazy/join/account.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { toWire } from "../actv-lazy/join/check.ts";
import { largeRelease, parseShape } from "../actv-lazy/join/large-release.ts";
import { readFullLedgers } from "../actv-lazy/join/ledger-parts.ts";
import { evaluateRows } from "../actv-lazy/join/material.ts";
import { RecordedNotices } from "../actv-lazy/join/recorded.ts";
import { ensureSettings, forgetSettled, originAt, SettingsConflict, type Permits } from "../actv-lazy/join/account-settings.ts";
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
// [DX-ACT10, second review] Off by default (every earlier run unchanged): ACT10_SHARED=1 both accounts share Publish IDs,
// documents (B by reference too) and save command IDs; ACT10_MIXED=1 publishing runs in phases with TX2_ACCOUNT_KEYS on
// or off per phase and resends earlier commands; ACT10_SINGLE=1 account B uses the single-account layout.
const SHARED = process.env.ACT10_SHARED === "1",
  MIXED = process.env.ACT10_MIXED === "1",
  SINGLE = process.env.ACT10_SINGLE === "1";
// [DX-ACT10, third review] Off by default: ACT10_TRANSITIONS=1 lands a settings transition of account A (a process with
// random permissions and ledger mode) inside the window between a commit's read and its commit (a Publish, a values
// frame or a notice frame), and inside a frame's window, half the time, also a later release of A (a Publish of R2): the
// schedule that tells a frame guarded on the origin row from one that is not (DX_ACT8_INJECT=no-origin-guard).
const TRANSITIONS = process.env.ACT10_TRANSITIONS === "1";
const relName = (acct: string) => (SINGLE && acct === "acct-b" ? "lazy/account/releases" : "lazy/account/releases/" + acct);
// [DX-ACT8, second review] Under ACT10_MIXED every modelled process is one of a fleet's builds (`build`), drawn per
// publisher per phase and per settling process at each restart: "1" this build allowed to turn some of the account's
// settings on (each of the three allowed or not, at least one); "0" this build allowed none (it follows what is stored);
// "o" a build from before the stored settings (Proc.oldBuild: it refuses an account whose settings are on, knows no
// settings and guards nothing on the origin row). Each "1" or "0" process names its own ledger mode or not. Publishers
// run in phases (below) and resend earlier commands; the environment's own permissions are unset.
const PHASES = [["1", "0"], ["0", "1"], ["0", "1", "0"], ["1", "0", "1"], ["1"], ["0"], ["1", "o"], ["o", "1", "o"], ["0", "1", "o", "0"]];
const NONE: Permits = { accountKeys: false, frameGuards: false, ledgerCap: false };
type Build = { old: boolean; permits: Permits; tag: string };
function build(r: Rng, kind: string): Build {
  if (kind === "o") return { old: true, permits: NONE, tag: "o" };
  const ledger = r.pick([undefined, undefined, "whole", "parts"] as const);
  let p: Permits = { ...NONE, ...(ledger ? { ledger } : {}) };
  if (kind === "1")
    do p = { accountKeys: r.next() < 0.6, frameGuards: r.next() < 0.6, ledgerCap: r.next() < 0.6, ...(ledger ? { ledger } : {}) };
    while (!p.accountKeys && !p.frameGuards && !p.ledgerCap);
  return { old: false, permits: p, tag: kind + (p.accountKeys ? "K" : "") + (p.frameGuards ? "G" : "") + (p.ledgerCap ? "C" : "") + (ledger ? ledger[0] : "") };
}
if (MIXED) for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER"]) delete process.env[k];
const logicalId = (commandId: string) => String(commandId).replace(/^joined:(?:v2\/\d+\/[^/]+\/)?/, "");
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

type Snapshot = { byEntity: Map<string, any[]>; lastChange: Map<string, number>; correlation: Map<string, string>; cuts: number[]; head: number };
let snapshot: Snapshot | undefined;

/** Seeds A and B, enrols both, publishes R1 in each (the baseline every schedule starts from), then snapshots. */
async function prepare() {
  dropMemoryScope(SCOPE);
  dropMemoryScope(SNAP);
  const db = new MemDb(SCOPE, 1);
  db.maxYield = 0;
  const proc = new Proc(db, "prepare");
  // Under ACT10_MIXED the baseline holds no settings (a fleet's processes turn them on, or not, in the schedule).
  if (MIXED) proc.permits = NONE;
  const cuts: number[] = [];
  if (SINGLE) cuts[1] = await seedAccount(db, B, PEOPLE);
  else cuts.push(await seedAccount(db, A, PEOPLE), await seedAccount(db, B, PEOPLE));
  for (const [i, n] of (SINGLE ? [B, A] : [A, B]).entries()) {
    if (SINGLE && n === A) cuts[0] = await seedAccount(db, A, PEOPLE);
    const k = n === A ? 0 : 1;
    void i;
    const a = new JoinedAccount(memStore(proc, heldAccount(n, PEOPLE, cuts[k]!, !(SINGLE && n === B))) as any);
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
    head: await db.comp.currentPosition(),
  };
  forkMemoryScope(SCOPE, SNAP);
}
function restore(seed: number) {
  // The database goes back to the snapshot: what this Node process remembers as turned on no longer holds.
  forgetSettled();
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
  // [second review] Every process of a schedule without ACT10_MIXED names the schedule's ledger mode (the settings
  // store it at the first transition, or move it from whole to parts).
  if (!MIXED) process.env.TX2_NOTICE_LEDGER = cfg.ledger;
  const hA = heldAccount(A, PEOPLE, snapshot!.cuts[0]!),
    hB = heldAccount(B, PEOPLE, snapshot!.cuts[1]!, !SINGLE);
  if (cfg.stall)
    db.stall = async () => {
      if (db.random.next() < 0.15) for (let k = db.random.int(6); k > 0; k--) await new Promise((x) => setImmediate(x));
    };
  // ---- actors ----
  const acknowledged: { account: string; id: string; position: number; txId: string; doc: string; keys?: string }[] = [];
  type Refusal = { id: string; account: string; message: string; from: number; to: number };
  const refused: Refusal[] = [];
  let publishing = true;
  let killsLeft = cfg.kills;
  let phaseTag = "", phaseKind = "1";
  const builds: string[] = [];
  const publisher = async (account: string, held: typeof hA, docs: string[], race: boolean) => {
    const proc = new Proc(db, "publisher-" + account);
    if (MIXED) {
      const b = build(r, phaseKind);
      proc.oldBuild = b.old;
      proc.permits = b.permits;
      builds.push("P" + account.slice(-1) + b.tag);
    }
    if (cfg.killPublisher && account === A) {
      proc.killAfter = 5 + r.int(60);
      proc.lostReply = r.next() < 0.5;
    }
    const a = new JoinedAccount(memStore(proc, held) as any);
    const one = async (k: number, name: string) => {
      const id = (SHARED ? "" : account + ":") + seed + ":" + k + ":" + name;
      const hook = cfg.hookSave && account === A
        ? { [cfg.hookSave]: async () => { const p = await save(new Proc(db, "hook"), A, r.int(PEOPLE), r, "hook" + seed + k); if (p) count("hookSaves"); } }
        : {};
      // [second review] Whether the account's `accountKeys` setting was on before this Publish began: before it, two
      // accounts that share a Publish ID or a definitions document share the command ID, and the second is refused
      // ("commit receipt differs from the request": a refusal, never a wrong acknowledgement or write; REVIEW.md F2).
      const from = await db.comp.currentPosition();
      const keysBefore = !MIXED || (await originAt(memStore(new Proc(db, "peek"), held) as never, from)).settings?.accountKeys === true;
      try {
        // Account B publishes with full documents unless ACT10_CROSS_DOCS=1: by reference, two accounts that share a
        // predecessor document collide on the definitions' command IDs (finding F2, cross-account.test.ts X3, X4).
        const docs = account === B && process.env.ACT10_CROSS_DOCS !== "1" && !SHARED ? { docs: "inline" } : {};
        const receipt = await a.publish(id, DOCS[name]!, validTime, "owed", undefined, { ...hook, ...docs } as never);
        acknowledged.push({ account, id, position: receipt.position, txId: receipt.txId, doc: name, keys: (proc.permits?.accountKeys ?? process.env.TX2_ACCOUNT_KEYS === "1") ? "on" : "off" });
      } catch (e: any) {
        if (e instanceof Killed) return;
        // An old build meeting the account's stored settings refuses (its exact origin check): counted, not refused.
        if (proc.oldBuild && /deep|equal/i.test(String(e?.message))) return void count("oldBuildRefused");
        // A process naming a ledger mode the stored settings forbid refuses: counted, not refused.
        if (e instanceof SettingsConflict) return void count("settingsConflict");
        if (!keysBefore && /commit receipt differs from the request/.test(String(e?.message))) return void count("crossAccountRefusedBeforeKeys");
        refused.push({ id, account, message: String(e?.message ?? e).slice(0, 200), from, to: await db.comp.currentPosition() });
        if (!(e instanceof Conflict)) violations.push("Publish " + id + " failed: " + String(e?.stack ?? e).slice(0, 400));
      }
    };
    if (race) await Promise.all(docs.map((d, k) => one(k, d)));
    else for (const [k, d] of docs.entries()) await one(k, d);
  };
  const saver = async (account: string, n: number) => {
    const proc = new Proc(db, "saver-" + account);
    for (let j = 0; j < n; j++) {
      const p = await save(proc, account, r.int(PEOPLE), r, (SHARED ? "" : account) + seed + ":" + j + ":" + phaseTag);
      if (p) count("saves" + (account === A ? "A" : "B"));
    }
  };
  let generation = 0;
  const settler = async (k: number) => {
    // Settles every owed release of A in order and records every event, restarting after a kill, until the
    // publishers are done and nothing is left.
    for (;;) {
      const proc = new Proc(db, "settler-" + k + "-" + generation++);
      if (MIXED) {
        const b = build(r, r.pick(["1", "0", "o"]));
        proc.oldBuild = b.old;
        proc.permits = b.permits;
        builds.push("S" + b.tag);
      }
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
        // A build from before the settings, or a process naming a ledger mode the stored settings forbid, refuses the
        // account; another process (the next restart) takes over.
        if (proc.oldBuild && /deep|equal/i.test(String(e?.message))) {
          count("oldBuildRefused");
          continue;
        }
        if (e instanceof SettingsConflict) {
          count("settingsConflict");
          continue;
        }
        violations.push("settler " + k + ": " + String(e?.stack ?? e).slice(0, 500));
        return;
      }
      await new Promise((x) => setImmediate(x));
    }
  };
  if (TRANSITIONS) {
    let budget = 1 + r.int(2), landed = 0;
    db.beforeCommit = async (id) => {
      const kind = /^settled-values:/.test(id) ? "values" : /^settled-notice:/.test(id) ? "notice" : /^joined:/.test(id) ? "publish" : null;
      if (!kind || budget <= 0) return;
      // Inside a frame's window the step matters when the frame read the account without frame guards: it then turns
      // them on (and half the time lands a later release too). Inside a Publish's window, any transition.
      const frame = kind !== "publish";
      if (frame && (await originAt(memStore(new Proc(db, "peek"), hA) as never, await db.comp.currentPosition())).settings?.frameGuards) return;
      if (r.next() > (frame ? 0.6 : 0.3)) return;
      budget--;
      const tp = new Proc(db, "transition-" + landed);
      let permits: Permits;
      do permits = { accountKeys: r.next() < 0.5, frameGuards: frame || r.next() < 0.7, ledgerCap: r.next() < 0.4 };
      while (!permits.accountKeys && !permits.frameGuards && !permits.ledgerCap);
      // Under ACT10_MIXED a random ledger mode or none; otherwise the schedule's (every process of it names that one).
      const ledger = MIXED ? r.pick([undefined, "whole", "parts"] as const) : cfg.ledger;
      if (ledger) permits.ledger = ledger;
      tp.permits = permits;
      try {
        await ensureSettings(memStore(tp, hA) as any);
        count("transitionStep:" + kind);
      } catch (e: any) {
        if (e instanceof SettingsConflict) return void count("transitionStepConflict");
        throw e;
      }
      if (frame && r.next() < 0.7) {
        const pid = (SHARED ? "" : A + ":") + seed + ":t" + landed++ + ":R2";
        const pp = new Proc(db, "transition-publisher");
        if (MIXED) pp.permits = NONE;
        try {
          const receipt = await new JoinedAccount(memStore(pp, hA) as any).publish(pid, DOCS.R2!, validTime, "owed");
          acknowledged.push({ account: A, id: pid, position: receipt.position, txId: receipt.txId, doc: "R2" });
          count("laterReleaseInsideFrame");
        } catch (e: any) {
          if (e instanceof SettingsConflict) return void count("transitionStepConflict");
          if (!(e instanceof Conflict)) violations.push("transition-step Publish " + pid + " failed: " + String(e?.stack ?? e).slice(0, 300));
        }
      }
    };
  }
  const settlers = Array.from({ length: cfg.settlers }, (_, k) => settler(k));
  const bDocs = SHARED && r.next() < 0.6 ? cfg.publishes : [r.pick(["L1000", "R2"])];
  const phases = MIXED ? r.pick(PHASES) : [process.env.TX2_ACCOUNT_KEYS === "1" ? "1" : "0"];
  (cfg as any).phases = phases.join("");
  const publishers = (async () => {
    for (const [n, phase] of phases.entries()) {
      phaseKind = phase;
      phaseTag = MIXED ? String(n) : "";
      // In later phases a client resends some of the earlier commands (the same ID and document).
      const again = n > 0 && r.next() < 0.6;
      await Promise.all([
        publisher(A, hA, n === 0 || again ? cfg.publishes : [r.pick(["R2", "L500"])], cfg.race),
        cfg.bPublish ? publisher(B, hB, n === 0 || again ? bDocs : [r.pick(["L1000", "R2"])], false) : Promise.resolve(),
        saver(A, cfg.saves),
        saver(B, cfg.savesB),
      ]);
    }
  })().finally(() => (publishing = false));
  await publishers;
  await Promise.all(settlers);
  if (MIXED) (cfg as any).builds = builds.join(" ");
  // A clean process finishes everything (no kills). Under ACT10_MIXED: this build, allowed nothing, naming no ledger mode.
  db.stall = undefined;
  db.beforeCommit = undefined;
  const clean = new Proc(db, "clean");
  if (MIXED) clean.permits = NONE;
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
  // As `Archive.open`: a process allowed to turn a setting on does so before it settles.
  await ensureSettings(s);
  const a = new JoinedAccount(s);
  // The settlement stores: the same database, labelled per process (bulk.ts keeps one claim registry per Node process).
  const vs = memStore(proc, held, db.scope + "-" + label + "-v") as any,
    ns = memStore(proc, held, db.scope + "-" + label + "-n") as any;
  const queue = new BulkQueue(1);
  const values = new (Archive as any)(a, vs, queue, "values", "bytes", cfg.precondition) as Archive;
  const notices = new (Archive as any)(a, ns, queue, "notices", "bytes", cfg.precondition) as Archive;
  // Under ACT10_MIXED a process names its own ledger mode or none (it then writes the stored one).
  const recorder = new RecordedNotices(notices, MIXED ? proc.permits?.ledger : cfg.ledger);
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
  acknowledged: { account: string; id: string; position: number; txId: string; doc: string; keys?: string }[],
  refused: { id: string; account: string; message: string; from: number; to: number }[], violations: string[], counts: Record<string, number>, r: Rng,
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
    const forms = ["joined:" + x.id, joinedCommandId({ held: x.account === A ? hA : hB } as never, x.id), scopedJoinedId(x.account, x.id)];
    if (!tx || !forms.includes(tx.commandId) || !tx.changes.some((c: any) => c.entityId === relName(x.account) && c.op === "assert"))
      v("acknowledged Publish " + x.id + " is not its own account's record at " + x.position + " (TX2_ACCOUNT_KEYS " + (x.keys ?? "?") + ")");
  }
  for (const [acct, held] of [[A, hA], [B, hB]] as const) {
    const st = memStore(proc, held) as any;
    const ja = new JoinedAccount(st);
    const landed = journal.filter((t) => t.actor === "lazy/join" && t.changes.some((c: any) => c.entityId === relName(acct) && c.op === "assert"));
    // [second review] One command lands at most once for one account, whatever form its ID took.
    const logical = landed.map((t) => logicalId(t.commandId));
    for (const id of new Set(logical)) if (logical.filter((x) => x === id).length > 1) v(acct + ": command " + id + " landed " + logical.filter((x) => x === id).length + " times");
    const rels = (await st.controls(head)).releases;
    const tail = (await ja.notices.observe()).value.sequence;
    if (rels.length !== landed.length || tail !== landed.length) v(acct + ": releases " + rels.length + ", tail " + tail + ", landed records " + landed.length);
    for (const t of landed) {
      const id = logicalId(t.commandId);
      if (id.includes(":base:")) continue;
      if (!acknowledged.some((x) => x.id === id) && !cfg.killPublisher) v(acct + ": Publish " + id + " landed but was not acknowledged and its process was not killed");
    }
  }
  // [second review] A settings transition of the Publish's own account (it rewrites the origin row every guarded Publish
  // is guarded on) is a rival too: a refusal with one landing while the Publish ran is counted, not broken.
  const transitions = journal.filter((t) => t.actor === "lazy/settings" && t.position > snapshot!.head);
  if (transitions.length) counts.transitions = transitions.length;
  const origins = { [A]: memStore(proc, hA).names.ORIGIN, [B]: memStore(proc, hB).names.ORIGIN };
  if (cfg.beside)
    for (const x of refused) {
      if (cfg.race || cfg.killPublisher) continue;
      if (transitions.some((t) => t.position > x.from && t.position <= x.to && t.changes.some((c: any) => c.entityId === origins[x.account])))
        counts.refusedAcrossTransition = (counts.refusedAcrossTransition ?? 0) + 1;
      else v("Publish " + x.id + " refused under the account guard with no rival Publish: " + x.message);
    }
  counts.refused = refused.length;
  counts.acknowledged = acknowledged.length;
  // -- Values: every owed release of A, against the difference over every subject's world at q - 1.
  const rels = ((await s.controls(head)).releases as any[]).filter((x) => x.storage === "owed").sort((l, r) => l.tx - r.tx);
  const roster = Array.from({ length: PEOPLE }, (_, i) => W0.placementId(i));
  const docOf = new Map<number, W0.ReleaseDoc>();
  for (const rel of rels) {
    const id = logicalId(journal.find((t) => t.position === rel.tx)!.commandId);
    docOf.set(rel.tx, DOCS[id.split(":").at(-1)!]!);
  }
  const vstore = memStore(proc, hA, db.scope + "-check-v") as any;
  const values = new (Archive as any)(a, vstore, new BulkQueue(1), "values", "bytes", cfg.precondition) as Archive;
  // [second review] A frame landing after a later release breaks the frame guards when the account's `frameGuards`
  // setting was on at that release. [Third review U5] The transition now fences what any build planned before it (the
  // progress rows and the cursor are rewritten with it), so a frame of a build from before the settings, planned before
  // the transition, landing after it is a break too (it was excused as the admitted window); counted apart.
  // [U10] Who sent a frame is the attempt that landed at its position, not the first attempt under its command ID.
  const breaks = async (position: number, later: number) => {
    if (!(await originAt(s, later)).settings?.frameGuards) return false;
    const t = journal.find((x) => x.position === position);
    const sent = db.landed.get(position);
    if (sent?.oldBuild && !(await originAt(s, sent.expected)).settings?.frameGuards)
      counts.oldBuildInFlightFrames = (counts.oldBuildInFlightFrames ?? 0) + 1;
    // [DX-ACT10, third review] ACT10_DUMP=1 (diagnostic): what landed late, who sent it, and the settings around it.
    if (process.env.ACT10_DUMP === "1")
      console.log("[act10-dump] " + JSON.stringify({ position, later, command: String(t?.commandId).slice(0, 40), sent,
        frameGuardsAtExpected: Boolean((await originAt(s, sent?.expected ?? 0)).settings?.frameGuards),
        transitions: journal.filter((x) => x.actor === "lazy/settings").map((x) => x.position),
        releases: journal.filter((x) => x.actor === "lazy/join").map((x) => [x.position, String(x.commandId).slice(-12)]),
        laterWrites: journal.filter((x) => x.position === later).flatMap((x) => x.changes.map((c: any) => c.op + " " + String(c.entityId).slice(-30) + " " + String(c.tripleId ?? ""))).slice(0, 12),
        attempts: ((db as any).attempts ?? []).filter((x: any) => x.id === String(t?.commandId).slice(0, 40)) }));
    return true;
  };
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
        if (row && row.at > later.tx) {
          counts.storedAfterSuperseded = (counts.storedAfterSuperseded ?? 0) + 1;
          // [DX-ACT8, review F5] Under the `frameGuards` setting a values frame is guarded on the notice tail it read.
          if (await breaks(row.at, later.tx)) v("release " + rel.seq + " stored by a frame that landed after a later release");
        }
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
      const paged = journal.filter((t) => t.position > rels[k + 1].tx && t.changes.some((c: any) => c.entityId === key && c.op === "assert") &&
        t.changes.some((c: any) => /answer:/.test(String(c.entityId))));
      const pages = paged.length;
      if (pages) counts.pagesAfterSuperseded = (counts.pagesAfterSuperseded ?? 0) + pages;
      let broken = 0;
      for (const t of paged) if (await breaks(t.position, rels[k + 1].tx)) broken++;
      if (broken) v("release " + rel.seq + ": " + broken + " value pages written after a later release");
    }
    if (status === "superseded") {
    } else if (status !== "stored") v("release " + rel.seq + " still " + status + " after the clean settlement");
  }
  // -- Notices: the recorded deliveries in order, and the ledgers, against a fold over every event.
  const ns = memStore(proc, hA, db.scope + "-check-n") as any;
  const recorder = new RecordedNotices(new (Archive as any)(a, ns, new BulkQueue(1), "notices", "bytes", cfg.precondition), MIXED ? undefined : cfg.ledger);
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
  // [DX-ACT8, third review U9] Each ledger with its archived retired items (the oracle's item IDs name the archive rows).
  const known = (subject: string) => (ledgers.get(subject) ?? []).map((i) => i.id);
  const stored = await readFullLedgers(ndb, roster, head, known);
  const archivedItems = [...stored.values()].reduce((n, l) => n + l.archived, 0);
  if (archivedItems) counts.archivedItems = (counts.archivedItems ?? 0) + archivedItems;
  for (const subject of roster)
    if (canonical(stored.get(subject)!.items) !== canonical(ledgers.get(subject) ?? [])) v("ledger of " + subject + " differs from the fold");
  // -- A ledger read at any position is a whole state of the fold (never half old, half new), parts or not.
  const noticeFrames = journal.filter((t) => String(t.commandId).startsWith("settled-notice:")).map((t) => t.position);
  for (const x of noticeFrames.flatMap((p) => [p - 1, p])) {
    try {
      const at = await readFullLedgers(ndb, roster, x, known);
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
