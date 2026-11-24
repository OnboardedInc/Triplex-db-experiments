// [DX-XQ10] The agreement gate at 1 billion records on one deep account: the index (find) against the slow exact route
// (sweep) for the same questions, pinned to one position and one valid time, through the SDK's one call (askAll with
// the route forced, then auto). For the day a server is rented (xq10/QUESTIONS-CONNECTED.md, the server list, run G).
//   node --no-warnings --experimental-transform-types lab/experiments/EXP-DX1/xq10/server.ts READY_FILE NEW_OUT [ACCOUNT] [QUESTION_URL]
// READY_FILE: demo/server-up.sh's ready file of a stack on the backfilled copy with DX_CROSS_INDEX=1, DX_SWEEP=1,
// DX_SWEEP_SHAPES=all, DX_SWEEP_PERMITS=6, DX_SWEEP_PER_ACCOUNT=6. Each sweep of a kind is split into parts by the next
// character after the kind's common ID prefix, run at once and pinned to the same position; the parts' listed IDs must
// add up to the ID list route's count of the kind (else the split missed IDs and the run stops).
// Counts are the result; times are measurements only on a server with its own cores.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REPO = path.resolve(import.meta.dirname, "../../../..");
const datomic: any = await import(pathToFileURL(path.join(REPO, "packages", "datomic", "dist", "index.js")).href);
const [readyFile, out, accountArg, questionArg] = process.argv.slice(2);
assert(readyFile && out && !fs.existsSync(out), "usage: server.ts READY_FILE NEW_OUT [ACCOUNT] [QUESTION_URL]");
fs.mkdirSync(out, { recursive: true });
const ready = JSON.parse(fs.readFileSync(readyFile, "utf8"));
const db: string = ready.database ?? ready.db;
const readUrl: string = ready.readUrl ?? ready.urls?.read;
assert(db && readUrl, "the ready file names the database and the read URL");
const account = accountArg ?? "account-003";
const client = new datomic.DatomicClient(readUrl, 900_000, undefined, questionArg ? { questionReaderUrl: questionArg } : {});
const log = (kind: string, data: object) => {
  const line = JSON.stringify({ kind, at: new Date().toISOString(), ...data });
  console.log(line);
  fs.appendFileSync(path.join(out, "agreement.jsonl"), line + "\n");
};

const decl = await client.indexDeclaration(db);
const epoch = Math.max(...Object.values(decl.epochs as Record<string, { position: number }>).map((e) => e.position));
const head = Number((await client.basis(db)).position.v);
assert(head >= epoch, `the head ${head} is before the index's epoch ${epoch}: backfill first`);
const now = Date.now(), valid = [now, now - 30 * 86_400_000];
log("start", { db: db.slice(0, 12), account, head, epoch, declared: decl.declaration?.attributes?.map((a: any) => a.attribute) });

// The kind's common ID prefix (first and last ID of the kind), then one part per next character.
async function parts(kind: { prefix: string; shape?: string }) {
  const first = await client.listIds(db, { account, prefix: kind.prefix, ...(kind.shape ? { shape: kind.shape } : {}), limit: 1, basis: { recordedPosition: head } });
  const last = await client.listIds(db, { account, prefix: kind.prefix, ...(kind.shape ? { shape: kind.shape } : {}), limit: 1, order: "desc", basis: { recordedPosition: head } });
  // The kind's exact number of IDs at the head (the ID list route's count, followed to the end).
  let total = 0, cursor: string | undefined;
  for (;;) {
    const page = await datomic.listIdsPage(client, db, { account, prefix: kind.prefix, ...(kind.shape ? { shape: kind.shape } : {}), result: "count",
      bounds: { entries: 1_000_000, ms: 1000 }, ...(cursor ? { cursor } : { basis: { recordedPosition: head } }) });
    total = page.count ?? total;
    if (!page.next) break;
    cursor = page.next;
  }
  const base = `acct/${account}/`;
  const a = String(first.ids[0] ?? "").slice(base.length), b = String(last.ids[0] ?? "").slice(base.length);
  let common = 0;
  while (common < Math.min(a.length, b.length) && a[common] === b[common]) common++;
  const stem = a.slice(0, common);
  const next = "0123456789";
  return { stem, prefixes: stem.length > kind.prefix.length || stem === kind.prefix ? [...next].map((c) => stem + c) : [kind.prefix], total };
}

const key = (x: any) => JSON.stringify({ ids: x.ids ?? null, count: x.count ?? null, counts: x.counts ?? null });
async function sweepSplit(q: any, kind: { prefix: string; shape?: string }, p: { prefixes: string[] }) {
  const t0 = performance.now();
  const results = await Promise.all(p.prefixes.map((prefix) =>
    datomic.askAll(client, db, { ...q, from: { prefix, ...(kind.shape ? { shape: kind.shape } : {}) }, route: "sweep",
      bounds: { sweep: { subjects: 10_000, ms: 2000 } } })));
  const ms = performance.now() - t0;
  const merged: any = { ids: q.result === "ids" ? results.flatMap((r: any) => r.ids ?? []).sort() : null, count: null, counts: null };
  if (q.result === "count" || q.result === "countByValue") merged.count = results.reduce((n: number, r: any) => n + (r.count ?? 0), 0);
  if (q.result === "countByValue") {
    const m = new Map<string, any>();
    for (const r of results) for (const g of r.counts ?? []) {
      const k = JSON.stringify(g.value);
      m.set(k, { value: g.value, count: (m.get(k)?.count ?? 0) + g.count });
    }
    merged.counts = [...m.values()].sort((x, y) => (JSON.stringify(x.value ?? "￿") < JSON.stringify(y.value ?? "￿") ? -1 : 1));
  }
  return { merged, ms, listed: results.reduce((n: number, r: any) => n + r.examined.idsListed, 0), subjects: results.reduce((n: number, r: any) => n + r.examined.subjectsRead, 0),
    positions: [...new Set(results.map((r: any) => r.position))], segments: results.reduce((n: number, r: any) => n + r.examined.segmentsLoaded, 0) };
}

const S = (v: string) => ({ type: "string", value: v });
const kinds = { profiles: { prefix: "wk:" }, tasks: { prefix: "i9:" }, subjects: { prefix: "pl:", shape: "pl:{8 digits}" } };
const questions: { name: string; kind: keyof typeof kinds; q: any; valid: number[] }[] = [
  { name: "Q1 profiles with background pending", kind: "profiles", q: { where: [{ attribute: ":person/custom-background", op: "eq", value: S("pending") }], result: "count" }, valid },
  { name: "Q1 ids", kind: "profiles", q: { where: [{ attribute: ":person/custom-background", op: "eq", value: S("pending") }], result: "ids", limit: 1000 }, valid: [now] },
  { name: "Q2 profiles starting 2026-11-02 to 03", kind: "profiles", q: { where: [{ attribute: ":person/custom-start", op: "range", from: S("2026-11-02"), toExclusive: S("2026-11-04") }], result: "count" }, valid },
  { name: "Q3 subjects", kind: "subjects", q: { where: [], result: "count" }, valid },
  { name: "Q4 tasks complete with progress 10 or more", kind: "tasks", q: { where: [{ attribute: ":task/status", op: "eq", value: S("complete") }, { attribute: ":task/progress", op: "range", from: { type: "integer", value: "10" } }], result: "count" }, valid: [now] },
  { name: "Q5 tasks per status (no-value group included)", kind: "tasks", q: { where: [], result: "countByValue", of: ":task/status" }, valid: [now] },
  { name: "Q6 tasks with no status", kind: "tasks", q: { where: [{ attribute: ":task/status", op: "missing" }], result: "count" }, valid: [now] },
];
const split = new Map<string, any>();
for (const [k, kind] of Object.entries(kinds)) split.set(k, await parts(kind));
let differences = 0, compared = 0;
for (const { name, kind, q, valid: vs } of questions) for (const v of vs) {
  const base = { account, ...q, basis: { recordedPosition: head, validAt: v } };
  const from = { from: kinds[kind] };
  const t0 = performance.now();
  const index = await datomic.askAll(client, db, { ...base, ...from, route: "index", bounds: { index: { entries: 1_000_000, ms: 1000, segments: 4096 } } });
  const indexMs = performance.now() - t0;
  const auto = await datomic.askAll(client, db, { ...base, ...from, bounds: { index: { entries: 1_000_000, ms: 1000, segments: 4096 } } });
  const sweep = await sweepSplit(base, kinds[kind], split.get(kind));
  // The parts must cover the kind: every ID of the kind (its shape kept) was examined by exactly one part.
  assert.equal(sweep.subjects, split.get(kind).total, `${name}: the parts examined ${sweep.subjects} IDs, the kind has ${split.get(kind).total}`);
  const idx = { ids: index.ids ? [...index.ids].sort() : null, count: index.count ?? null, counts: index.counts ?? null };
  const same = key(idx) === key(sweep.merged) && sweep.positions.length === 1 && sweep.positions[0] === head && auto.route === "index" && key(auto) === key(index);
  compared++; if (!same) differences++;
  log("question", { name, validAt: v, same, index: { count: idx.count, ids: idx.ids?.length ?? null, groups: idx.counts?.length ?? null, ms: Math.round(indexMs), pages: index.pages, entries: index.examined.indexEntries, entityReads: index.examined.entityReads, segments: index.examined.segmentsLoaded },
    sweep: { count: sweep.merged.count, ids: sweep.merged.ids?.length ?? null, ms: Math.round(sweep.ms), parts: split.get(kind).prefixes.length, listed: sweep.listed, subjects: sweep.subjects, segments: sweep.segments },
    autoRoute: auto.route, ...(same ? {} : { indexAnswer: key(idx).slice(0, 400), sweepAnswer: key(sweep.merged).slice(0, 400) }) });
}
log("PASS?", { compared, differences, head, epoch });
client.close();
process.exitCode = differences ? 1 : 0;
