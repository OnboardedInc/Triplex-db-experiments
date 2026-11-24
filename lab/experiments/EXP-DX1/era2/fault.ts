// [DX-ERA2] Removal on request in ONE account while every other account saves, reads and writes settlement-shaped
// frames, all in ONE Datomic database. Counts per account what a removal elsewhere does to them: saves refused or
// replayed, saves delayed (counted retries), frames refused (client recheck and gateway ticket check), reads refused
// or re-run. Counts are results; every time is diagnostic (Mac, lab VM shared with other builders).
//   node --experimental-transform-types lab/experiments/EXP-DX1/era2/fault.ts OUT WRITE_URL READ_URL
// Environment (all optional): ERA2_ACCOUNTS (10), ERA2_SUBJECTS (3 per other account), ERA2_REMOVAL_RATE (1/s),
// ERA2_SECONDS (30), ERA2_SAVE_RATE (40/s over the other accounts), ERA2_SAME_RATE (4/s in the removal account),
// ERA2_READERS (4 loops), ERA2_FRAME_RATE (4/s), ERA2_SEALED (0), ERA2_PER_ACCOUNT (0: the database stays in the
// database-wide mode; 1: it is moved to per-account removal sequences before the first save), ERA2_LABEL.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import {
  DatomicClient,
  DatomicHttpError,
  DatomicTransportError,
  orderedSaveIdentity,
  withDatomicErasureSequence,
} from "../../../../packages/datomic/dist/index.js";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { command } from "../w1/group/workload.ts";

const [out, writeUrl, readUrl] = process.argv.slice(2);
assert(out && writeUrl && readUrl, "usage: fault.ts OUT WRITE_URL READ_URL");
fs.mkdirSync(out, { recursive: true });
const env = (k: string, d: number) => Number(process.env[k] ?? d);
const ACCOUNTS = env("ERA2_ACCOUNTS", 10), SUBJECTS = env("ERA2_SUBJECTS", 3);
const REMOVAL_RATE = env("ERA2_REMOVAL_RATE", 1), SECONDS = env("ERA2_SECONDS", 30);
const SAVE_RATE = env("ERA2_SAVE_RATE", 30), SAME_RATE = env("ERA2_SAME_RATE", 4);
const READERS = env("ERA2_READERS", 3), FRAME_RATE = env("ERA2_FRAME_RATE", 4);
const SEALED = process.env.ERA2_SEALED === "1", PER_ACCOUNT = process.env.ERA2_PER_ACCOUNT === "1";
const LABEL = process.env.ERA2_LABEL ?? "cell";
// ERA2_REMOVAL_ACCOUNTS (1): removals go round-robin over accounts 0..K-1 ("removal accounts"); the rest are "other".
const K = env("ERA2_REMOVAL_ACCOUNTS", 1);
const isRemoval = (a: number) => a < K;
let QUIET = -1;
const RUN = randomUUID().slice(0, 8);
const VALID_AT = 1_800_000_000_000;
// ERA2_DB: adopt an existing protected database (the server run) instead of creating one; ERA2_SSN: its protected
// attribute; ERA2_REMOVAL_KEYS: comma-separated account keys for the removal accounts (for example a deep account).
const ADOPT = process.env.ERA2_DB;
const SSN = process.env.ERA2_SSN ?? ":person/ssn";
const REMOVAL_KEYS = (process.env.ERA2_REMOVAL_KEYS ?? "").split(",").filter(Boolean);
const QUIET_RATE = env("ERA2_QUIET_RATE", 1);
const FIELDS = Array.from({ length: 6 }, (_, i) => ":task/field-" + i);
const log = (kind: string, data: object = {}) => {
  const line = JSON.stringify({ kind, label: LABEL, at: new Date().toISOString(), ...data });
  console.log(line.length > 3000 ? line.slice(0, 3000) + "..." : line);
  fs.appendFileSync(path.join(out, "fault.jsonl"), line + "\n");
};
const now = () => performance.now();
const sha = (x: unknown) => createHash("sha256").update(JSON.stringify(x)).digest("hex");
const key = (a: number) => (a < REMOVAL_KEYS.length ? REMOVAL_KEYS[a]! : "era2-a" + String(a).padStart(4, "0"));
// Subject IDs carry the run, so a run on an adopted database never meets an earlier run's subjects.
const subject = (a: number, i: number) => "acct/" + key(a) + "/era2-" + RUN + "/" + i;
// A settlement-shaped document lives outside the account's prefix, as the held notices do (notice:v1:<hash>:...).
const notice = (a: number, n: number) => "notice:v1:" + sha(["era2", key(a)]).slice(0, 24) + ":" + n;
const ssnValue = (a: number, i: number, v: number) => "SSN-" + RUN + "-" + key(a) + "-" + i + "-v" + v;

const writer = new DatomicClient(writeUrl, 120_000);
const framer = new DatomicClient(writeUrl, 120_000);
const reader = new DatomicClient(readUrl, 120_000);
let db: string;
if (ADOPT) db = ADOPT;
else {
  const name = "dx-era2-" + randomUUID();
  const created = await writer.create(String(runtimeApi.DatabaseScope.test(name)), "lean", true, 35_000);
  assert(created.created && created.strictRecordClocks);
  db = created.db;
  await writer.declareProtection(db, [SSN], SEALED);
}
assert((await writer.erasureFrontier(db)).protected, "the database has no removal policy");
let mode: unknown = "database-wide";
const moveStarted = now();
if (PER_ACCOUNT) mode = await writer.request("POST", `/v2/db/${db}/removal-per-account`, {});
const moveMs = now() - moveStarted;
log("scope", { db, adopted: Boolean(ADOPT), sealed: SEALED, perAccount: PER_ACCOUNT, mode, moveMs: Math.round(moveMs), accounts: ACCOUNTS, run: RUN });

type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];
type Subject = { a: number; i: number; id: string; rows: Map<string, Row>; values: Map<string, string>; pos: number; busy: boolean; v: number; unresolved?: boolean; contested?: boolean };
const subjects = new Map<string, Subject>();
// Per account. "Refused" counts saves (reads, frames) refused at least once because of the removal frontier: the SDK
// replays a CasConflict (counted as a replay) and returns a 503 or an ErasureFrontierChanged to the caller, who sends
// the save again (here after 10 ms); the attempt counters count every refused attempt, delayMs the time from the first
// refusal to the acknowledgement.
type Counts = {
  saves: number; acked: number; subjectWriter: number; generalWriter: number; savesRefused: number; replays: number;
  unavailable: number; frontierChanged: number; errors: number; delayMs: number; maxAttempts: number;
  reads: number; readsRefused: number; readUnavailable: number; readOther: number;
  frames: number; framesAcked: number; framesRefused: number; frameRecheck: number; frameRefused: number; frameUnavailable: number;
};
const zero = (): Counts => ({ saves: 0, acked: 0, subjectWriter: 0, generalWriter: 0, savesRefused: 0, replays: 0,
  unavailable: 0, frontierChanged: 0, errors: 0, delayMs: 0, maxAttempts: 0, reads: 0, readsRefused: 0,
  readUnavailable: 0, readOther: 0, frames: 0, framesAcked: 0, framesRefused: 0, frameRecheck: 0, frameRefused: 0,
  frameUnavailable: 0 });
const BACKOFF = env("ERA2_BACKOFF_MS", 10), INFLIGHT = env("ERA2_INFLIGHT", 6);
const counts = new Map<number, Counts>(Array.from({ length: ACCOUNTS }, (_, a) => [a, zero()]));
// Saves of the removal account's subjects that are about to be removed count apart ("contested"): those are the saves
// a removal must refuse when they straddle it (any rule).
const contested = zero();
// Acknowledged save latencies (request to acknowledgement, retries included), per class; diagnostic on the Mac.
const latency = { quiet: [] as number[], other: [] as number[], removal: [] as number[] };
const C = (a: number, s?: Subject) => (s?.contested ? contested : counts.get(a)!);
const codeOf = (e: unknown) => e instanceof DatomicHttpError ? e.status + " " + e.code : e instanceof DatomicTransportError ? "transport" : String(e);
const codes = new Map<string, number>();
const bump = (k: string) => codes.set(k, (codes.get(k) ?? 0) + 1);

// A commit whose acknowledgement was lost is resolved as the product does: ask whether the operation committed, and
// call it absent only after the transactor's own deadline (10 s) has passed with no receipt.
const resolutions = { unknown: 0, committed: 0, absent: 0, lookupErrors: 0 };
async function resolve(id: string) {
  resolutions.unknown++;
  const started = now();
  for (;;) {
    const o = await writer.operation(db, id).catch((e) => { resolutions.lookupErrors++; return undefined; });
    if (o?.status === "committed") { resolutions.committed++; return Number(o.position!.v); }
    if (o?.status === "absent" && now() - started > 12_000) { resolutions.absent++; return undefined; }
    if (now() - started > 120_000) throw new Error("operation " + id + " never resolved");
    await sleep(250);
  }
}

// One commit per subject's save. Replays (CasConflict) and waits (503) are counted against the save's account.
async function save(s: Subject, attrs: string[], tag: string, seed = false) {
  const c = C(s.a, s);
  if (!seed) c.saves++;
  const id = "era2/" + RUN + "/" + tag;
  const facts = attrs.map((a) => {
    const v = a === SSN ? ssnValue(s.a, s.i, ++s.v) : sha([id, a]).slice(0, 40);
    return { e: s.id, a, v: { type: "string" as const, value: v } };
  });
  const old = attrs.flatMap((a) => (s.rows.has(a) ? [s.rows.get(a)!] : []));
  const token = orderedSaveIdentity().token;
  const input = {
    ...command(id, facts, old as never, true, false, orderedSaveIdentity(token)),
    live: old.map((r) => r.id),
    ...(seed ? {} : { sourceK: s.pos }),
    groupAccount: key(s.a),
    writeClass: "live" as const,
  };
  const started = now();
  let firstRefusal: number | undefined;
  const refused = () => { if (!seed && firstRefusal === undefined) { firstRefusal = now(); c.savesRefused++; } };
  for (let attempt = 1; ; attempt++) {
    try {
      const ack: any = await writer.transact(db, input);
      if (!seed) {
        c.acked++;
        (s.a === QUIET ? latency.quiet : isRemoval(s.a) ? latency.removal : latency.other).push(now() - started);
        if (ack.subjectSave) c.subjectWriter++; else c.generalWriter++;
        c.maxAttempts = Math.max(c.maxAttempts, attempt);
        if (firstRefusal !== undefined) c.delayMs += now() - firstRefusal;
      }
      s.pos = Number(ack.position.v);
      break;
    } catch (e) {
      const code = codeOf(e);
      bump((seed ? "seed " : "save ") + code);
      if (now() - started > 120_000) { c.errors++; log("save-failed", { id, account: s.a, code, message: String((e as Error).message).slice(0, 300) }); throw e; }
      if (e instanceof DatomicHttpError && e.code === "CasConflict") { refused(); if (!seed) c.replays++; continue; }
      if (e instanceof DatomicHttpError && e.code === "ErasureFrontierUnavailable") { refused(); if (!seed) c.unavailable++; await sleep(BACKOFF); continue; }
      if (e instanceof DatomicHttpError && e.code === "ErasureFrontierChanged") { refused(); if (!seed) c.frontierChanged++; await sleep(BACKOFF); continue; }
      if (e instanceof DatomicTransportError || (e instanceof DatomicHttpError && ["OutcomeUnknown", "OperationDuplicate", "CommandConflict"].includes(e.code))) {
        const p = await resolve(id);
        if (p !== undefined) { if (!seed) c.acked++; s.pos = p; break; }
        continue;
      }
      // Anything else (a transactor restarting, a gateway reconnecting): the outcome is unknown until the lookup says.
      if (!seed) c.errors++;
      log("save-error", { id, account: s.a, code, message: String((e as Error).message).slice(0, 300) });
      const p = await resolve(id).catch(() => undefined);
      if (p !== undefined) { s.pos = p; if (!seed) c.acked++; break; }
      await sleep(250);
    }
  }
  for (const f of facts) s.values.set(f.a, f.v.value);
  for (const r of input.rows) if (r.entity_id === s.id && input.newIds.includes(r.id)) s.rows.set(r.attribute, r);
}

async function pool<T>(items: T[], depth: number, f: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: depth }, async () => { while (i < items.length) await f(items[i++]!); }));
}

// ---- seed: the removal account holds one subject per planned removal plus spares; every other account SUBJECTS ----
const removals = Math.ceil(REMOVAL_RATE * SECONDS) + 2;
const spares = 8;
for (let a = 0; a < ACCOUNTS; a++) {
  const n = isRemoval(a) ? Math.ceil(removals / K) + 3 + spares : SUBJECTS;
  for (let i = 0; i < n; i++)
    subjects.set(subject(a, i), { a, i, id: subject(a, i), rows: new Map(), values: new Map(), pos: 0, busy: false, v: 0 });
}
const seedStarted = now();
await pool([...subjects.values()], 8, (s) => save(s, [...FIELDS, SSN], "seed/" + s.id, true));
const seedHead = Math.max(...[...subjects.values()].map((s) => s.pos));
log("seeded", { subjects: subjects.size, removals, head: seedHead, ms: Math.round(now() - seedStarted) });
const scan = async (url: string) => (await (await fetch(url + "/v2/admin/scan-stats")).json()) as Record<string, unknown>;
const statsBefore = { w: await scan(writeUrl), r: await scan(readUrl) };

// ---- the window ----
let stop = false;
const begun = now();
// The first other account is the quiet account: its own stream at ERA2_QUIET_RATE, never in the spread stream.
QUIET = K;
const others = [...subjects.values()].filter((s) => !isRemoval(s.a) && s.a !== QUIET);
const quietSubjects = [...subjects.values()].filter((s) => s.a === QUIET);
const spare = [...subjects.values()].filter((s) => isRemoval(s.a) && s.i >= Math.ceil(removals / K) + 3);
// The i-th removal: account i mod K, that account's subject floor(i / K).
const target = (i: number) => subject(i % K, Math.floor(i / K));
let rng = 0x9e3779b9 ^ ACCOUNTS ^ Math.round(REMOVAL_RATE * 1000);
const rnd = () => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; rng >>>= 0; return rng / 4294967296; };
const pickAttrs = (s: Subject) => {
  // 70% of saves change 1 to 3 fields (the per-subject writer), 30% 4 to 6 (the general writer); 1 save in 20 also
  // replaces the protected value.
  const width = rnd() < 0.7 ? 1 + Math.floor(rnd() * 3) : 4 + Math.floor(rnd() * 3);
  const start = Math.floor(rnd() * FIELDS.length);
  const attrs = Array.from({ length: width }, (_, k) => FIELDS[(start + k) % FIELDS.length]!);
  if (rnd() < 0.05) attrs[attrs.length - 1] = SSN;
  return attrs;
};
let saveSeq = 0;
// Saves of one field of a subject the removal loop is about to remove (its next three).
async function contestLoop(rate: number) {
  const inflight: Promise<void>[] = [];
  for (let t = -Math.log(1 - rnd()) / rate; t < SECONDS && !stop; t += -Math.log(1 - rnd()) / rate) {
    const wait = begun + t * 1000 - now();
    if (wait > 0) await sleep(wait);
    const s = subjects.get(target(Math.min(removals - 3, nextRemoval + Math.floor(rnd() * 3))))!;
    if (s.busy || s.unresolved) continue;
    s.busy = true; s.contested = true;
    inflight.push(save(s, [FIELDS[0]!], "contest/" + saveSeq++).catch(() => { s.unresolved = true; }).finally(() => { s.busy = false; }));
  }
  await Promise.all(inflight);
}
async function stream(rate: number, from: Subject[], label: string) {
  const inflight: Promise<void>[] = [];
  for (let t = -Math.log(1 - rnd()) / rate; t < SECONDS && !stop; t += -Math.log(1 - rnd()) / rate) {
    const wait = begun + t * 1000 - now();
    if (wait > 0) await sleep(wait);
    let s = from[Math.floor(rnd() * from.length)]!;
    for (let k = 0; (s.busy || s.unresolved) && k < 8; k++) s = from[Math.floor(rnd() * from.length)]!;
    if (s.busy || s.unresolved) continue;
    // Bounded in flight per stream (the toy's removal authority opens a PostgreSQL session per request beyond its 8 pooled).
    while (inflight.filter((x) => !(x as any).done).length >= INFLIGHT) await sleep(2);
    s.busy = true;
    // A save whose outcome stayed unknown leaves its subject out of later saves and of the final check (counted).
    const p: Promise<void> & { done?: boolean } = save(s, pickAttrs(s), label + "/" + saveSeq++)
      .catch(() => { s.unresolved = true; }).finally(() => { s.busy = false; p.done = true; });
    inflight.push(p);
  }
  await Promise.all(inflight);
}
let nextRemoval = 0;
const removalLatency: number[] = [];
const removalCodes = new Map<string, number>();
let removed = 0;
const removedSet = new Set<string>();
async function removalsLoop() {
  const inflight: Promise<void>[] = [];
  for (let i = 0; i < removals - 2 && !stop; i++) {
    const wait = begun + (i / REMOVAL_RATE) * 1000 - now();
    if (wait > 0) await sleep(wait);
    while (inflight.length >= 4) await Promise.race(inflight);
    nextRemoval = i;
    const p = (async () => {
      const t0 = now();
      // Retried with the same command until it answers (a stopped transactor included), as a caller would.
      for (let attempt = 0; now() - t0 < 180_000; attempt++) {
        try {
          await writer.erase(db, "era2-erase-" + RUN + "-" + i, [{ entityId: target(i), attribute: SSN }]);
          removalLatency.push(now() - t0);
          removed++;
          removedSet.add(target(i));
          return;
        } catch (e) {
          const code = codeOf(e);
          removalCodes.set(code, (removalCodes.get(code) ?? 0) + 1);
          await sleep(BACKOFF);
        }
      }
    })();
    const tracked = p.finally(() => inflight.splice(inflight.indexOf(tracked), 1));
    inflight.push(tracked);
  }
  await Promise.all(inflight);
}
const reachBefore = { ...reader.reachDiagnostics };
async function readerLoop(n: number) {
  for (let k = 0; !stop; k++) {
    const s = others[Math.floor(rnd() * others.length)]!;
    const c = C(s.a);
    c.reads++;
    for (let attempt = 0; attempt < 400; attempt++) {
      try {
        if ((k + n) % 2 === 0) await reader.rows(db, { entityIds: [s.id] });
        else await reader.reachEntities(db, [s.id], { recordedPosition: seedHead, validAt: VALID_AT });
        break;
      } catch (e) {
        const code = codeOf(e);
        bump("read " + code);
        if (e instanceof DatomicHttpError && e.code === "ErasureFrontierUnavailable") {
          if (attempt === 0) c.readsRefused++;
          c.readUnavailable++; await sleep(BACKOFF); continue;
        }
        c.readOther++;
        break;
      }
    }
    await sleep(20);
  }
}
// A settlement-shaped frame: read the removal frontier, compute for a while, check the frontier again on the client
// (as recheckErasure does), then write a notice document outside the account's prefix carrying the ticket.
async function frameLoop() {
  for (let t = 0, n = 0; t < SECONDS && !stop; t += -Math.log(1 - rnd()) / FRAME_RATE, n++) {
    const wait = begun + t * 1000 - now();
    if (wait > 0) await sleep(wait);
    const a = K + Math.floor(rnd() * (ACCOUNTS - K));
    const c = C(a);
    c.frames++;
    let frameRefusedOnce = false;
    const frameRefused = () => { if (!frameRefusedOnce) { frameRefusedOnce = true; c.framesRefused++; } };
    for (let attempt = 0; attempt < 400; attempt++) {
      try {
        const ask = PER_ACCOUNT ? `?account=${encodeURIComponent(key(a))}` : "";
        const f0: any = await framer.request("GET", `/v2/db/${db}/erasure-frontier${ask}`);
        await sleep(25 + rnd() * 50);
        const f1: any = await framer.request("GET", `/v2/db/${db}/erasure-frontier${ask}`);
        const same = PER_ACCOUNT ? f0.accountSeq === f1.accountSeq && f0.unscopedSeq === f1.unscopedSeq : f0.seq === f1.seq;
        if (!same) { frameRefused(); c.frameRecheck++; continue; }
        const id = "era2/" + RUN + "/frame/" + a + "/" + n + "/" + attempt;
        const input = { ...command(id, [{ e: notice(a, n), a: ":notice/body", v: { type: "string", value: sha([id]) } }], [], true),
          groupAccount: key(a), writeClass: "notice" as const };
        await withDatomicErasureSequence(f0.seq, () => framer.transact(db, input), false, undefined,
          PER_ACCOUNT ? [key(a)] : undefined);
        c.framesAcked++;
        break;
      } catch (e) {
        const code = codeOf(e);
        bump("frame " + code);
        if (e instanceof DatomicHttpError && e.code === "ErasureFrontierChanged") { frameRefused(); c.frameRefused++; continue; }
        if (e instanceof DatomicHttpError && e.code === "ErasureFrontierUnavailable") { frameRefused(); c.frameUnavailable++; await sleep(BACKOFF); continue; }
        log("frame-error", { a, code, message: String((e as Error).message).slice(0, 300) });
        break;
      }
    }
  }
}
// ERA2_RESTART_AT_MS with ERA2_TX_CONTAINER: restart this stack's transactor that far into the window.
const restart = (async () => {
  const at = env("ERA2_RESTART_AT_MS", 0), name = process.env.ERA2_TX_CONTAINER;
  if (!at || !name || !name.startsWith("tx2-dxera2-")) return undefined;
  await sleep(at);
  const t = now();
  execFileSync("docker", ["restart", "--time", "1", name], { stdio: "ignore" });
  log("transactor-restarted", { name, ms: Math.round(now() - t), removedBefore: removed });
  return { atMs: at, restartMs: Math.round(now() - t), removedBefore: removed };
})();
const loops = [
  restart,
  removalsLoop(),
  stream(SAVE_RATE, others, "save"),
  ...(SAME_RATE > 0 ? [stream(SAME_RATE, spare, "same")] : []),
  ...(QUIET_RATE > 0 ? [stream(QUIET_RATE, quietSubjects, "quiet")] : []),
  ...(REMOVAL_RATE > 0 && env("ERA2_CONTEST_RATE", 2) > 0 ? [contestLoop(env("ERA2_CONTEST_RATE", 2))] : []),
  ...(FRAME_RATE > 0 ? [frameLoop()] : []),
];
const readers = Array.from({ length: READERS }, (_, n) => readerLoop(n));
await Promise.all(loops);
stop = true;
await Promise.all(readers);
const windowMs = now() - begun;
const statsAfter = { w: await scan(writeUrl), r: await scan(readUrl) };

// ---- checks: every other subject's final values exactly as last acknowledged; every removed value marked ----
const finalHead = Math.max(...[...subjects.values()].map((s) => s.pos));
let checked = 0, wrong = 0, unresolvedSubjects = 0;
for (const part of chunk([...subjects.values()], 50)) {
  const rows = await writer.rows(db, { entityIds: part.map((s) => s.id), basis: { recordedPosition: finalHead, validAt: VALID_AT } });
  for (const s of part) {
    if (s.unresolved) { unresolvedSubjects++; continue; }
    for (const [attr, value] of s.values) {
      const r = rows.filter((x) => x.entity_id === s.id && x.attribute === attr);
      checked++;
      if (attr === SSN && removedSet.has(s.id)) continue;
      if (r.length !== 1 || r[0]!.value_string !== value) { wrong++; if (wrong < 10) log("wrong", { s: s.id, attr, got: r, want: value }); }
    }
  }
}
// Every successful removal's subject must show the marker for its protected value.
let removedMarked = 0;
for (const part of chunk([...removedSet], 50)) {
  const rows = await writer.rows(db, { entityIds: part, basis: { recordedPosition: finalHead, validAt: VALID_AT } });
  for (const id of part) if (rows.some((r) => r.entity_id === id && r.attribute === SSN && r.value_type === "erased")) removedMarked++;
}
// The removed values through the second (read) gateway: at the old pin (rows and a Reach session that cached the
// subject before the removals), the feed and the journal pages answer none of them.
const removedValues = [...removedSet].map((id) => subjects.get(id)!.values.get(SSN)!);
const leaks: Record<string, number> = { pinnedRows: 0, reach: 0, feed: 0, journal: 0 };
const leaked = (text: string) => removedValues.filter((v) => text.includes(v)).length;
for (const part of chunk([...removedSet], 50)) {
  leaks.pinnedRows! += leaked(JSON.stringify(await reader.rows(db, { entityIds: part, basis: { recordedPosition: seedHead, validAt: VALID_AT } })));
  for (const id of part.slice(0, 10))
    leaks.reach! += leaked(JSON.stringify(await reader.reachEntities(db, [id], { recordedPosition: seedHead, validAt: VALID_AT }),
      (_k, v) => (v instanceof Map ? [...v] : v)));
}
for (let from = "0", pages = 0; pages < 200; pages++) {
  const page = await reader.log(db, from, 1000);
  leaks.feed! += leaked(JSON.stringify(page));
  if (page.nextT === from) break;
  from = page.nextT;
}
for (let after = 0, pages = 0; pages < 200; pages++) {
  const page: any = await reader.request("POST", `/v2/db/${db}/transactions`, { after, limit: 1000 });
  leaks.journal! += leaked(JSON.stringify(page));
  const last = page.transactions?.at?.(-1);
  if (!last) break;
  const next = Number(Array.isArray(last) ? last[1] : last.position);
  if (!(next > after)) break;
  after = next;
}
function chunk<T>(xs: T[], n: number) { return Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n)); }

const q = (xs: number[], p: number) => { if (!xs.length) return null; const s = [...xs].sort((x, y) => x - y); return Math.round(s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)]! * 10) / 10; };
const sum = (f: (c: Counts) => number, pick: (a: number) => boolean) => [...counts].filter(([a]) => pick(a)).reduce((n, [, c]) => n + f(c), 0);
const others_ = (a: number) => !isRemoval(a), same_ = (a: number) => isRemoval(a);
const totals = (pick: (a: number) => boolean) => Object.fromEntries((Object.keys(zero()) as (keyof Counts)[]).map((k) =>
  [k, k === "maxAttempts" ? Math.max(0, ...[...counts].filter(([a]) => pick(a)).map(([, c]) => c.maxAttempts)) : Math.round(sum((c) => c[k], pick))]));
const reachDelta = Object.fromEntries(Object.entries(reader.reachDiagnostics).filter(([, v]) => typeof v === "number")
  .map(([k, v]) => [k, (v as number) - ((reachBefore as any)[k] as number)]));
const result = {
  label: LABEL, db, sealed: SEALED, perAccount: PER_ACCOUNT, accounts: ACCOUNTS, removalRate: REMOVAL_RATE, seconds: SECONDS,
  windowMs: Math.round(windowMs), moveMs: Math.round(moveMs), restart: await restart,
  latencyMs: Object.fromEntries(Object.entries(latency).map(([k, xs]) => [k, { n: xs.length, p50: q(xs, 0.5), p99: q(xs, 0.99) }])),
  removals: { planned: removals - 2, done: removed, p50: q(removalLatency, 0.5), p99: q(removalLatency, 0.99),
    errors: Object.fromEntries(removalCodes) },
  otherAccounts: totals(others_), removalAccount: totals(same_), contested,
  perAccount: Object.fromEntries(counts),
  reach: reachDelta, codes: Object.fromEntries(codes),
  checks: { checked, wrong, removedMarked, removed, unresolvedSubjects, leaks }, resolutions,
  gateway: { write: diff(statsBefore.w, statsAfter.w), read: diff(statsBefore.r, statsAfter.r) },
};
function diff(a: any, b: any) {
  const pick = (x: any) => ({ erasure: x?.erasure ?? null, routes: x?.routes ?? null });
  return { before: pick(a), after: pick(b) };
}
fs.writeFileSync(path.join(out, "result-" + LABEL + ".json"), JSON.stringify(result, null, 2) + "\n");
log("result", { ...result, perAccount: undefined, gateway: undefined });
writer.close(); framer.close(); reader.close();
const leakCount = Object.values(leaks).reduce((a, b) => a + b, 0);
if (wrong || removedMarked !== removed || leakCount) { log("FAIL", { wrong, removedMarked, removed, leaks }); process.exit(1); }
log("PASS", { checked, removed });
