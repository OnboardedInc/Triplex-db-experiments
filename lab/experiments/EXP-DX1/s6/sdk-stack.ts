// [DX-S6] The SDK end to end under faults (F1), on the PostgreSQL stack (s6/stack-run.sh): TriplesLive over the
// Datomic adapter with orderedSaves, saveSizeRule, severalOwners and creationSaves, through a proxy per write gateway
// that drops connections (a lost request, or a lost reply after the gateway answered), while the stack script stops
// (SIGTERM), kills (SIGKILL) and pauses (SIGSTOP, a forced deref timeout) the transactor and kills the gateways.
// Every save's outcome as the SDK reported it is then checked against the store: no stored save reported failed, no
// unstored save reported stored, every reported receipt is the stored one, positions contiguous, and every subject
// reads back exactly the saves reported stored. Then, quiet: constraint attacks (a unique rule on an attribute two
// creations write at once, a reference-target rule whose target is retired at once, a rule changed by a release
// between read and commit, with and without the precondition). Times are diagnostic.
//   node sdk-stack.mjs <gateway url,gateway url> <work dir> <seconds> <saves>
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, writeFileSync, appendFileSync } from "node:fs";
import http from "node:http";
import { core, datomic, Effect, openProduct, type ProductStore } from "../s2/product.ts";

const [targetsArg, work, secondsArg, savesArg] = process.argv.slice(2);
assert(targetsArg && work && secondsArg && savesArg, "usage: sdk-stack <urls> <work> <seconds> <saves>");
const targets = targetsArg.split(",");
const seconds = Number(secondsArg), wanted = Number(savesArg);
const drop = Number(process.env.S6_DROP ?? "0.02");
const log = (tag: string, m: unknown) => { const line = `DX-S6_${tag} ${JSON.stringify(m)}`; console.log(line); appendFileSync(`${work}/driver.log`, line + "\n"); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- a proxy per gateway that drops connections
const dropped = { request: 0, reply: 0 };
let dropping = false;
async function proxy(target: string): Promise<string> {
  const t = new URL(target);
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const roll = Math.random();
      const writes = req.method === "POST" && /\/(transact|fence|erase|protection)$/.test(req.url ?? "");
      if (dropping && writes && roll < drop / 2) { dropped.request++; req.socket.destroy(); return; }
      const out = http.request({ host: t.hostname, port: t.port, method: req.method, path: req.url, headers: req.headers }, (answer) => {
        const back: Buffer[] = [];
        answer.on("data", (c) => back.push(c));
        answer.on("end", () => {
          if (dropping && writes && roll < drop) { dropped.reply++; req.socket.destroy(); return; }
          res.writeHead(answer.statusCode ?? 502, answer.headers);
          res.end(Buffer.concat(back));
        });
        answer.on("error", () => req.socket.destroy());
      });
      out.on("error", () => req.socket.destroy());
      out.end(Buffer.concat(chunks));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  return `http://127.0.0.1:${(server.address() as any).port}`;
}

// ---------------------------------------------------------------- stores (two per gateway, each through its proxy)
const scopeName = `s6-stack-${process.env.S6_SEED ?? "31"}`;
const options = { orderedSaves: true, saveSizeRule: true, severalOwners: true, creationSaves: true, resolutionTimeoutMs: 90_000 };
const urls = await Promise.all(targets.flatMap((t) => [proxy(t), proxy(t)]));
const stores: ProductStore[] = [];
for (const u of urls) stores.push(await openProduct(u, scopeName, options));
const db = stores[0]!.db;
const direct = new datomic.DatomicClient(targets[0]!);
log("READY", { db, stores: stores.length, drop });
writeFileSync(`${work}/ready`, db + "\n");

// ---------------------------------------------------------------- values of every type
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function valueOf(kind: number, tag: string): any {
  switch (kind % 6) {
    case 0: return { type: "string", value: hash(tag).slice(0, 40) };
    case 1: return { type: "boolean", value: hash(tag).charCodeAt(0) % 2 === 0 };
    case 2: return { type: "datetime", value: 1_700_000_000_000 + (parseInt(hash(tag).slice(0, 8), 16) % 1_000_000) * 1000 };
    case 3: return { type: "json", value: { tag, n: parseInt(hash(tag).slice(0, 6), 16), nested: [1, "two", { three: true }] } };
    case 4: return { type: "blob", value: "sha256:" + hash(tag), mimeType: "application/pdf", size: 1024 + (parseInt(hash(tag).slice(0, 4), 16) % 4096), filename: `${tag}.pdf` };
    default: return { type: "number", value: parseInt(hash(tag).slice(0, 6), 16) / 7 };
  }
}
const same = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------- the model: live facts the SDK reported stored
type Live = { id: string; value: any };
const model = new Map<string, Map<string, Live>>();
const uncertain = new Set<string>();
function remember(result: any, retracted: readonly string[]) {
  const gone = new Set(retracted);
  for (const attrs of model.values()) for (const [a, l] of attrs) if (gone.has(l.id)) attrs.delete(a);
  for (const t of result.triples) {
    const attrs = model.get(t.entityId) ?? new Map<string, Live>();
    model.set(t.entityId, attrs);
    attrs.set(t.attribute, { id: t.id, value: t.value });
  }
}
function update(owner: string, attribute: string, value: any, entityType: string) {
  const prior = model.get(owner)?.get(attribute);
  return [...(prior ? [{ op: "retract", id: prior.id }] : []), { op: "assert", entityId: owner, attribute, value, entityType, validFrom: 0 }];
}

type Result = { command: string; kind: string; worker: number; outcome: "ok" | "failed" | "unknown"; error?: string;
  position?: number; txId?: string; owners: string[]; ms: number };
const results: Result[] = [];
const classify = (cause: unknown) => {
  const text = JSON.stringify(cause) ?? String(cause);
  if (/TransactionOutcomeUnknown/.test(text)) return "TransactionOutcomeUnknown";
  if (/"notApplied":true/.test(text)) return "OperationNotApplied";
  if (/ConstraintViolationError/.test(text)) return "ConstraintViolation";
  if (/TransactionConflictError/.test(text)) return "TransactionConflict";
  if (/serialization-conflict/.test(text)) return "SerializationConflict";
  const code = text.match(/"code":"([A-Za-z]+)"/)?.[1];
  return code ? `WriteError:${code}` : `WriteError:${text.slice(0, 160)}`;
};
async function save(store: ProductStore, worker: number, kind: string, ops: any[], meta: Record<string, unknown> = {}) {
  const command = `${kind}-${worker}-${randomUUID()}`;
  const owners = [...new Set(ops.filter((o) => o.op === "assert").map((o) => o.entityId as string))];
  const retracted = ops.filter((o) => o.op === "retract").map((o) => o.id as string);
  const started = performance.now();
  const exit = await store.exit(Effect.flatMap(core.Triples, (s: any) => s.transact(ops, { commandId: command, ...meta })));
  const ms = Math.round((performance.now() - started) * 10) / 10;
  if (exit._tag === "Success") {
    remember(exit.value, retracted);
    const r: Result = { command, kind, worker, outcome: "ok", position: exit.value.position, txId: exit.value.txId, owners, ms };
    results.push(r); return r;
  }
  const error = classify(exit.cause);
  const outcome = error === "TransactionOutcomeUnknown" ? "unknown" : "failed";
  if (outcome === "unknown") for (const o of owners) uncertain.add(o);
  const r: Result = { command, kind, worker, outcome, error, owners, ms };
  results.push(r); return r;
}

// ---------------------------------------------------------------- the faulted phase
const workers = Number(process.env.S6_WORKERS ?? "8");
const deadline = Date.now() + seconds * 1000;
let n = 0;
dropping = true;
writeFileSync(`${work}/faulting`, "1\n");
await Promise.all(Array.from({ length: workers }, async (_, w) => {
  const store = stores[w % stores.length]!;
  const subject = (k: number) => `acct/s6/subject/w${w}-${k}`;
  const profile = (k: number) => `acct/s6/profile/w${w}-${k}`;
  let i = 0;
  while (Date.now() < deadline && n < wanted) {
    const k = i % 6, tag = `${w}/${i}`, pick = i % 20;
    i++; n++;
    if (uncertain.has(subject(k))) continue;
    let ops: any[], kind: string;
    if (pick < 8) { kind = "one-owner"; ops = update(subject(k), `:s/f${i % 3}`, valueOf(i, tag), "subject"); }
    else if (pick < 11) { kind = "wide"; ops = Array.from({ length: 10 }, (_, j) => update(subject(k), `:s/w${j}`, valueOf(i + j, tag + j), "subject")).flat(); }
    else if (pick < 15) {
      if (uncertain.has(profile(k))) continue;
      kind = "two-owner"; ops = [...update(subject(k), ":s/f0", valueOf(i, tag), "subject"), ...update(profile(k), ":p/f0", valueOf(i + 1, tag + "p"), "profile")];
    } else if (pick < 18) {
      kind = "creation"; const e = `acct/s6/enrolment/w${w}-${i}`;
      ops = [{ op: "assert", entityId: e, attribute: ":e/subject", value: { type: "ref", value: subject(k) }, entityType: "enrolment", validFrom: 0 },
             { op: "assert", entityId: e, attribute: ":e/status", value: valueOf(i, tag), entityType: "enrolment", validFrom: 0 }];
    } else {
      kind = "general"; const many = [0, 1, 2, 3, 4].map((j) => subject((k + j) % 6));
      if (many.some((o) => uncertain.has(o))) continue;
      ops = many.flatMap((o, j) => update(o, ":s/g", valueOf(i + j, tag + "g" + j), "subject"));
    }
    await save(store, w, kind, ops);
  }
}));
dropping = false;
writeFileSync(`${work}/faults-done`, "1\n");
log("FAULTED_PHASE", { attempted: results.length, outcomes: count(results.map((r) => r.outcome)),
  errors: count(results.filter((r) => r.error).map((r) => r.error!)), kinds: count(results.map((r) => r.kind)), dropped });
function count(xs: readonly string[]) { const m: Record<string, number> = {}; for (const x of xs) m[x] = (m[x] ?? 0) + 1; return m; }

// ---------------------------------------------------------------- wait for the stack to be quiet, then verify
for (let i = 0; !existsSync(`${work}/quiet`); i++) { if (i > 1200) throw new Error("stack never quiet"); await sleep(250); }
await sleep(2000);
const stored = new Map<string, { position: number; txId: string }>();
const positions: number[] = [];
let fences = 0;
for (let from = "0"; ;) {
  const page = await direct.log(db, from, 1000);
  for (const row of page.rows) {
    if (row.kind !== "commit") { fences++; continue; }
    const tx = row.transaction as any;
    for (const p of tx.positions) positions.push(Number(p));
    for (const c of tx.commandIds) stored.set(c, { position: Number(tx.positions[0]), txId: tx.txIds[0] });
  }
  if (page.rows.length === 0 || page.nextT === from) break;
  from = page.nextT;
}
const sorted = [...positions].sort((a, b) => a - b);
const contiguous = sorted.every((p, i) => p === i + 1);
const ours = new Set(results.map((r) => r.command));
const violations = {
  reportedStoredButAbsent: results.filter((r) => r.outcome === "ok" && !stored.has(r.command)).map((r) => r.command),
  receiptDiffers: results.filter((r) => r.outcome === "ok" && stored.has(r.command)
    && (stored.get(r.command)!.position !== r.position || stored.get(r.command)!.txId !== r.txId)).map((r) => r.command),
  reportedFailedButStored: results.filter((r) => r.outcome === "failed" && stored.has(r.command)).map((r) => `${r.command} ${r.error}`),
  storedUnknownCommand: [...stored.keys()].filter((c) => !ours.has(c) && /^(one-owner|wide|two-owner|creation|general)-/.test(c)),
};
// Every subject reads back exactly the saves reported stored.
let readbackOwners = 0; const readbackDiffs: string[] = [];
for (const [owner, attrs] of model) {
  if (uncertain.has(owner)) continue;
  readbackOwners++;
  const rows = await direct.rows(db, { entityIds: [owner] });
  const live = new Map(rows.filter((r: any) => r.retracted_at === null).map((r: any) => [r.attribute, r.id]));
  for (const [a, l] of attrs) if (live.get(a) !== l.id) readbackDiffs.push(`${owner} ${a}`);
  for (const a of live.keys()) if (!attrs.has(a)) readbackDiffs.push(`${owner} ${a} (extra)`);
}
const verdict = {
  attempted: results.length, storedCommits: stored.size, skippedLogEntries: fences, positions: positions.length, contiguous,
  outcomes: count(results.map((r) => r.outcome)), unknownStored: results.filter((r) => r.outcome === "unknown" && stored.has(r.command)).length,
  violations: Object.fromEntries(Object.entries(violations).map(([k, v]) => [k, { count: v.length, first: v.slice(0, 5) }])),
  readbackOwners, readbackDiffs: readbackDiffs.slice(0, 10), readbackDiffCount: readbackDiffs.length,
  p50ms: quantile(results.filter((r) => r.outcome === "ok").map((r) => r.ms), 0.5),
  p99ms: quantile(results.filter((r) => r.outcome === "ok").map((r) => r.ms), 0.99),
};
function quantile(xs: number[], q: number) { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; }
log("VERIFY", verdict);
writeFileSync(`${work}/results.json`, JSON.stringify({ verdict, results }, null, 0) + "\n");
const faultOk = contiguous && Object.values(violations).every((v) => v.length === 0) && readbackDiffs.length === 0;

// ---------------------------------------------------------------- constraint attacks, quiet
const [A, B] = [stores[0]!, stores[stores.length - 1]!];
const rules = {
  unique: { _tag: "Unique", v: 1, entityType: "badge", attribute: ":b/code" },
  target: { _tag: "ReferenceTarget", v: 1, entityType: "enrolment", attribute: ":e/subject", targetEntityType: "subject" },
};
const attacks: Record<string, unknown> = {};
{ // A unique rule on an attribute two creations write at once (each creates its own badge entity).
  const pairs = [];
  for (let i = 0; i < 20; i++) {
    const code = { type: "string", value: `code-${i}-${randomUUID().slice(0, 6)}` };
    const make = (s: ProductStore, who: string) => save(s, 100, "unique", [{ op: "assert", entityId: `acct/s6/badge/${who}-${i}`, attribute: ":b/code", value: code, entityType: "badge", validFrom: 0 }],
      { enforce: { constraints: [rules.unique] } });
    const [x, y] = await Promise.all([make(A, "x"), make(B, "y")]);
    pairs.push([x.outcome, y.outcome, x.error ?? null, y.error ?? null]);
  }
  const exactlyOne = pairs.filter((p) => (p[0] === "ok") !== (p[1] === "ok")).length;
  attacks.unique = { pairs: pairs.length, exactlyOneCommitted: exactlyOne, outcomes: count(pairs.map((p) => p.slice(0, 2).join("/"))),
    errors: count(pairs.flatMap((p) => p.slice(2).filter((e): e is string => e !== null))) };
}
{ // A reference-target rule whose target is retired while a creation refers to it.
  const runs = [];
  for (let i = 0; i < 20; i++) {
    const t = `acct/s6/subject/target-${i}-${randomUUID().slice(0, 6)}`;
    const seeded = await save(A, 101, "target-seed", [{ op: "assert", entityId: t, attribute: ":s/name", value: { type: "string", value: t }, entityType: "subject", validFrom: 0 }]);
    assert.equal(seeded.outcome, "ok");
    const fact = model.get(t)!.get(":s/name")!;
    const e = `acct/s6/enrolment/target-${i}`;
    const [refer, retire] = await Promise.all([
      save(A, 101, "refer", [{ op: "assert", entityId: e, attribute: ":e/subject", value: { type: "ref", value: t }, entityType: "enrolment", validFrom: 0 }], { enforce: { constraints: [rules.target] } }),
      save(B, 101, "retire-target", [{ op: "retract", id: fact.id }], { enforce: { constraints: [rules.target] } }),
    ]);
    const rows = await direct.rows(db, { entityIds: [t, e] });
    const targetLive = rows.some((r: any) => r.entity_id === t && r.retracted_at === null);
    const refLive = rows.some((r: any) => r.entity_id === e && r.retracted_at === null);
    runs.push({ refer: refer.outcome, retire: retire.outcome, referError: refer.error, retireError: retire.error, dangling: refLive && !targetLive });
  }
  attacks.referenceTarget = { runs: runs.length, dangling: runs.filter((r) => r.dangling).length,
    outcomes: count(runs.map((r) => `${r.refer}/${r.retire}`)), errors: count(runs.flatMap((r) => [r.referError, r.retireError].filter((x): x is string => !!x))) };
}
{ // A rule changed by a release between the save's read of the definitions and its commit.
  const D = "acct/s6/definitions/release";
  const publish = async (version: number) => save(A, 102, "release", update(D, ":def/rules", { type: "json", value: { version, unique: version > 1 } }, "definitions"));
  const out: Record<string, unknown> = {};
  for (const precondition of [true, false]) {
    assert.equal((await publish(1)).outcome, "ok");
    // The save reads the release in force (no unique rule yet) and names the definitions it read as a precondition:
    // the complete live fact set of D (EntityState), which TriplesLive checks and puts in the save's conflict set.
    const read = [...model.get(D)!.values()].map((l) => l.id);
    const code = { type: "string", value: `release-${precondition}-${randomUUID().slice(0, 6)}` };
    assert.equal((await save(A, 102, "unique-seed", [{ op: "assert", entityId: `acct/s6/badge/seed-${precondition}`, attribute: ":b/code", value: code, entityType: "badge", validFrom: 0 }])).outcome, "ok");
    assert.equal((await publish(2)).outcome, "ok"); // the release adds the unique rule before the save commits
    const r = await save(B, 102, "under-old-release", [{ op: "assert", entityId: `acct/s6/badge/late-${precondition}`, attribute: ":b/code", value: code, entityType: "badge", validFrom: 0 }],
      precondition ? { preconditions: [{ _tag: "EntityState", entityId: D, tripleIds: read }] } : {});
    out[precondition ? "withPrecondition" : "staleDefinitions"] = { outcome: r.outcome, error: r.error };
  }
  attacks.releaseBetweenReadAndCommit = out;
}
log("CONSTRAINTS", attacks);
const u = attacks.unique as any, rt = attacks.referenceTarget as any, rel = attacks.releaseBetweenReadAndCommit as any;
const constraintsOk = u.exactlyOneCommitted === u.pairs && rt.dangling === 0 && rel.withPrecondition.outcome === "failed"
  && /TransactionConflict|SerializationConflict/.test(rel.withPrecondition.error ?? "");
log("DONE", { faultOk, constraintsOk });
for (const s of stores) await s.close();
direct.close();
process.exit(faultOk && constraintsOk ? 0 : 1);
