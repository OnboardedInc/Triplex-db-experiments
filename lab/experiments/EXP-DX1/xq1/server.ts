import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { scaleHost, startScaleStack } from "../scale1/bench.ts";
import { launchProfile } from "../jvm1/launch.mjs";
import { stackOptions, writeDiagnostics } from "../v01/profile.ts";
import { cleanSource, verifyBuild } from "../v01/source.ts";
import { claimPgdata, inspectPgdata } from "../v01/pgdata.ts";

// [DX-XQ4] Server runners for questions across subjects (design 2026-11-24, section 11): S-1 `backfill` builds the
// commit-time index on a copy of the sealed 1 billion database and checks it against brute force on samples; S-3
// `bench` times the design's five questions; `verify` is the S-2 pair's preflight (the copy holds the declaration and
// every epoch). Each runs one stack (scale1/bench.ts startScaleStack, `server` profile) on one private PostgreSQL copy
// with TX2_CROSS_INDEX=1 on both gateways, on a bare-metal host only. Nothing here was run on a server when written.
// Rejected: declaring or backfilling inside the scorecard (a measured arm starts from the sealed backfilled copy).
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    commit: { type: "string" }, declaration: { type: "string" }, out: { type: "string" },
    "aged-bundle": { type: "string" }, "aged-bundle-sha256": { type: "string" },
    "pgdata-source": { type: "string" }, pgdata: { type: "string" },
    "verify-samples": { type: "string", default: "1000" },
    reader: { type: "string", default: "tuned" }, questions: { type: "string", default: "q1,q2,q3,q4,q5" },
    accounts: { type: "string", default: "3,4" }, pins: { type: "string", default: "head,epoch" },
    valid: { type: "string", default: "now,minus30d" }, "cold-and-warm": { type: "boolean", default: false },
    "quiet-account": { type: "string", default: "7" }, "batch-datoms": { type: "string", default: "4000" },
  },
});
const mode = positionals[0];
assert(mode === "backfill" || mode === "bench" || mode === "verify", "server.ts backfill|bench|verify ...");
assert(values.commit && values.out && values["pgdata-source"] && values.pgdata, "Give --commit, --out, --pgdata-source and --pgdata");
const out = path.resolve(values.out);
assert(!fs.existsSync(out), "Use a new --out directory");
scaleHost.physical();
const source = cleanSource(values.commit);
verifyBuild(source, process.env.DX_V01_BUILD_RECEIPT);
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
const write = (name: string, value: unknown) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const declarationText = values.declaration ? fs.readFileSync(values.declaration, "utf8") : undefined;
const declaration = declarationText ? JSON.parse(declarationText) : undefined;
assert(mode !== "backfill" || declaration, "backfill needs --declaration");

// The database and its roster come from AGE1's handoff bundle (pinned by its digest).
let database: string;
let accountNames: string[];
if (values["aged-bundle"]) {
  const bytes = fs.readFileSync(values["aged-bundle"]);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), values["aged-bundle-sha256"], "AGE1 handoff digest differs");
  const bundle = JSON.parse(bytes.toString());
  database = bundle.database;
  accountNames = bundle.roster.map((r: { account: string }) => r.account);
} else {
  database = process.env.DX_XQ4_DATABASE ?? "";
  accountNames = (process.env.DX_XQ4_ACCOUNTS ?? "").split(",").filter(Boolean);
}
assert(/^s2-[A-Za-z0-9_-]+$/.test(database) && accountNames.length >= 1, "Unknown database or roster");

const [copy] = inspectPgdata(values["pgdata-source"], [values.pgdata], out);
assert(copy);
const attempt = randomUUID(), slot = "tx2-dxscale1-xq4-" + attempt.slice(0, 12);
const stackDir = path.join(out, "stack");
fs.mkdirSync(stackDir);
fs.writeFileSync(path.join(stackDir, "attempt.json"), JSON.stringify({ source, slot, nonce: attempt, tag: "stack" }));
const policy = launchProfile("server", values.reader === "tuned" ? { readTuned: true, readCacheMiB: 3072 } : {});
claimPgdata(copy, source, slot, attempt);
write("input.json", { mode, source, database, declaration, attempt, slot, copy, policy, values, startedAt: new Date().toISOString() });

type Answer = Record<string, any>;
async function post(base: string, route: string, body: unknown, timeoutMs = 600_000): Promise<{ status: number; body: Answer; ms: number }> {
  const t0 = performance.now();
  const r = await fetch(new URL(`/${route}`, base), {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
  });
  return { status: r.status, body: await r.json() as Answer, ms: performance.now() - t0 };
}
async function get(base: string, route: string) {
  const r = await fetch(new URL(route, base), { signal: AbortSignal.timeout(30_000) });
  return { status: r.status, body: await r.json() as Answer };
}
const ok = (what: string, r: { status: number; body: Answer }) => {
  assert.equal(r.status, 200, `${what}: ${JSON.stringify(r.body)}`);
  return r.body;
};
const day = 86_400_000;

/** Every page of a question (bounded pages, cursor), with the time and work of each page. */
async function allPages(base: string, q: Answer, bounds: Answer = { entries: 1_000_000, ms: 1000, segments: 4096 }) {
  const pages: Answer[] = [];
  let cursor: string | null = null, ids: string[] = [], last: Answer = {};
  do {
    const r = await post(base, `v2/db/${database}/find`, { ...q, ...(cursor ? { cursor } : {}), bounds, limit: q.limit ?? 1000 });
    last = ok("find", r);
    pages.push({ ms: r.ms, examined: last.examined, segments: last.segmentsLoaded, stopped: last.stopped, queryMicros: last.queryMicros });
    ids = ids.concat(last.ids ?? []);
    cursor = last.next;
  } while (cursor && q.result !== "ids-first-page");
  return { ids, last, pages, ms: pages.reduce((a, p) => a + p.ms, 0) };
}

/** The design's five questions for one account. */
function questions(account: string, basis: Answer) {
  return {
    q1: { account, basis, where: [{ attribute: ":person/custom-background", op: "eq", value: { type: "string", value: "pending" } }], result: "count" },
    q1page: { account, basis, where: [{ attribute: ":person/custom-background", op: "eq", value: { type: "string", value: "pending" } }], result: "ids", limit: 50 },
    q2: { account, basis, where: [{ attribute: ":person/custom-start", op: "range", from: { type: "string", value: "2026-11-02" }, toExclusive: { type: "string", value: "2026-11-04" } }], result: "count" },
    q3page: { account, basis, from: { prefix: "pl:", shape: "{8 digits}" }, result: "ids", limit: 100 },
    q3: { account, basis, from: { prefix: "pl:", shape: "{8 digits}" }, result: "count" },
    q4page: { account, basis, where: [{ attribute: ":task/status", op: "eq", value: { type: "string", value: "complete" } },
      { attribute: ":task/progress", op: "range", from: { type: "integer", value: "10" } }], result: "ids", limit: 50 },
    q4: { account, basis, where: [{ attribute: ":task/status", op: "eq", value: { type: "string", value: "complete" } },
      { attribute: ":task/progress", op: "range", from: { type: "integer", value: "10" } }], result: "count" },
    q5: { account, basis, where: [{ attribute: ":task/status", op: "exists" }], result: "countByValue", of: ":task/status" },
  } as Record<string, Answer>;
}

/** Brute force on sampled subjects: their own rows (and their profiles' and tasks' rows) through the read route. */
async function sampleCheck(base: string, position: number, validAt: number, samples: number) {
  const results: Answer[] = [];
  for (const account of accountNames) {
    const subjects = Array.from({ length: samples }, (_, k) => `acct/${account}/pl:${String((k * 7919 + 13) % 100_000).padStart(8, "0")}`);
    const rowsOf = async (ids: string[]) => {
      const r = ok("read", await post(base, `v1/db/${database}/read`, { entityIds: ids, basis: { recordedPosition: position, validAt } }));
      return r.rows as Answer[];
    };
    const value = (row: Answer, k: string) => row[k]?.v ?? row[k];
    // Subjects' rows give their profile and their placements' tasks; then those entities' rows.
    const subjectRows: Answer[] = [];
    for (let i = 0; i < subjects.length; i += 64) subjectRows.push(...await rowsOf(subjects.slice(i, i + 64)));
    const profiles = [...new Set(subjectRows.filter((r) => value(r, "attribute") === ":person/profile").map((r) => value(r, "value_string") as string))];
    const profileRows: Answer[] = [];
    for (let i = 0; i < profiles.length; i += 64) profileRows.push(...await rowsOf(profiles.slice(i, i + 64)));
    const pending = new Set(profileRows.filter((r) => value(r, "attribute") === ":person/custom-background" && value(r, "value_string") === "pending").map((r) => value(r, "entity_id")));
    const startIn = new Set(profileRows.filter((r) => value(r, "attribute") === ":person/custom-start" && value(r, "value_string") >= "2026-11-02" && value(r, "value_string") < "2026-11-04").map((r) => value(r, "entity_id")));
    const qs = questions(account, { recordedPosition: position, validAt });
    const found1 = new Set((await allPages(base, { ...qs.q1page, result: "ids", limit: 1000 })).ids);
    const found2 = new Set((await allPages(base, { ...qs.q2, result: "ids" })).ids);
    const mismatch1 = profiles.filter((p) => found1.has(p) !== pending.has(p)).length;
    const mismatch2 = profiles.filter((p) => found2.has(p) !== startIn.has(p)).length;
    results.push({ account, sampledSubjects: subjects.length, sampledProfiles: profiles.length, q1Mismatch: mismatch1, q2Mismatch: mismatch2,
      q1Found: found1.size, q2Found: found2.size });
  }
  return { results, differences: results.reduce((a, r) => a + r.q1Mismatch + r.q2Mismatch, 0) };
}

const options = { ...stackOptions("per-person-ordered", attempt, writeDiagnostics("per-person-ordered", process.env)),
  DX_V01_PGDATA: copy.dir, DX_V01_PGDATA_CONTROL_SHA: copy.controlSha256, DX_V01_PGDATA_FILE_ID: copy.device + ":" + copy.inode,
  DX_CROSS_INDEX: "1", DX_INDEX_QUERY_PERMITS: "1",
  ...(values.reader === "tuned" ? { DX_PINNED_SHORTCUT: "1", DX_PINNED_CUT_LOOKUP: "1", DX_RD1_READ_FILTER: "1" } : {}) };
try {
  const { engines } = startScaleStack(stackDir, slot, source, false, options, { policy });
  const w = `http://${engines["gw-w"]!.address}:8080`, r = `http://${engines["gw-r"]!.address}:8080`;
  const basis = ok("basis", await get(w, `/v1/db/${database}/basis`));
  const head = Number(basis.position.v ?? basis.position);
  write("basis.json", { basis, head });
  const pgBytes = () => Number(execFileSync("docker", ["exec", engines.pg!.id, "psql", "-XAtq", "-U", "postgres", "-d", "datomic", "-c",
    "SELECT pg_total_relation_size('datomic_kvs')"], { encoding: "utf8" }).trim());
  if (mode === "backfill") {
    const before = pgBytes();
    const declared = ok("declaration", await post(w, `v2/db/${database}/index-declaration`, declaration));
    const t0 = Date.now();
    const built = ok("backfill", await post(w, `v2/db/${database}/index-backfill`, { batchDatoms: Number(values["batch-datoms"]), expectHead: head }, 4 * 3600_000));
    const backfillSeconds = (Date.now() - t0) / 1000;
    // An indexing job absorbs the entries; then the table growth per entry is b, the stored bytes per entry.
    const t1 = Date.now();
    const indexed = ok("request-index", await post(w, `v2/db/${database}/request-index`, { waitMs: 600_000 }, 700_000));
    const indexSeconds = (Date.now() - t1) / 1000;
    const after = pgBytes();
    const t2 = Date.now();
    const check = await sampleCheck(r, head, Date.now(), Number(values["verify-samples"]));
    const dry = ok("dry run", await post(w, `v2/db/${database}/index-backfill`, { dryRun: true }, 4 * 3600_000));
    const result = { declared, built, backfillSeconds, indexed, indexSeconds, bytesBefore: before, bytesAfter: after,
      bytesPerEntry: (after - before) / Math.max(1, built.added), sample: check, sampleSeconds: (Date.now() - t2) / 1000,
      rebuildDryRun: { added: dry.added, retracted: dry.retracted },
      verdict: check.differences === 0 && dry.added === 0 && dry.retracted === 0 && backfillSeconds < 7200 ? "pass" : "fail" };
    write("backfill.json", result);
    console.log(JSON.stringify({ verdict: result.verdict, entries: built.added, backfillSeconds, indexSeconds, bytesPerEntry: result.bytesPerEntry, differences: check.differences }));
  } else if (mode === "verify") {
    const state = ok("declaration", await get(r, `/v2/db/${database}/index-declaration`));
    const expected = declaration ? JSON.stringify(declaration) : undefined;
    const codes = (state.declaration?.attributes ?? []).map((a: Answer) => a.code);
    const sealed = codes.every((c: string) => state.epochs?.[c]);
    write("verify.json", { state, sealed, matches: expected ? JSON.stringify(state.declaration) === JSON.stringify(JSON.parse(expected)) : undefined });
    assert(sealed, "The copy's declaration has a code without an epoch: run S-1 first");
    console.log("verified", JSON.stringify(state.epochs));
  } else {
    const state = ok("declaration", await get(r, `/v2/db/${database}/index-declaration`));
    const epoch = Math.max(...Object.values(state.epochs as Record<string, { position: number }>).map((e) => e.position));
    const now = Date.now();
    const pins = values.pins!.split(",").map((p) => p === "head" ? head : p === "epoch" ? epoch : Number(p));
    const valids = values.valid!.split(",").map((v) => v === "now" ? now : v === "minus30d" ? now - 30 * day : Number(v));
    const wanted = new Set(values.questions!.split(","));
    const rows: Answer[] = [];
    const accounts = values.accounts!.split(",").map((n) => accountNames[Number(n) - 1]!);
    const restartReader = () => {
      execFileSync("docker", ["restart", engines["gw-r"]!.id], { stdio: "ignore" });
      for (let i = 0; i < 180; i++) {
        try { execFileSync("docker", ["exec", engines["gw-r"]!.id, "true"]); break; } catch { /* starting */ }
      }
    };
    for (const account of accounts) for (const position of pins) for (const validAt of valids) {
      const qs = questions(account, { recordedPosition: position, validAt });
      for (const [name, q] of Object.entries(qs)) {
        if (!wanted.has(name.replace("page", ""))) continue;
        const firstPage = name.endsWith("page");
        if (values["cold-and-warm"]) {
          restartReader();
          await new Promise((done) => setTimeout(done, 15_000));
          const cold = firstPage ? await post(r, `v2/db/${database}/find`, q) : await allPages(r, q);
          rows.push({ account, position, validAt, question: name, temperature: "cold", ms: cold.ms, status: (cold as Answer).status ?? 200,
            pages: (cold as Answer).pages?.length ?? 1, last: (cold as Answer).last ?? (cold as Answer).body });
        }
        const warm: number[] = [];
        let last: Answer = {};
        for (let k = 0; k < 5; k++) {
          const run = firstPage ? await post(r, `v2/db/${database}/find`, q) : await allPages(r, q);
          warm.push(run.ms); last = (run as Answer).last ?? (run as Answer).body;
        }
        warm.sort((a, b) => a - b);
        rows.push({ account, position, validAt, question: name, temperature: "warm", medianMs: warm[2], ms: warm, count: last.count, stopped: last.stopped, examined: last.examined });
      }
    }
    // The quiet account: pinned reads of its subjects alone, then beside a cold Q4 count in the first account.
    const quiet = accountNames[Number(values["quiet-account"]) - 1]!;
    const readLoop = async (seconds: number) => {
      const lat: number[] = [], end = Date.now() + seconds * 1000;
      await Promise.all(Array.from({ length: 8 }, async (_, seat) => {
        let k = seat;
        while (Date.now() < end) {
          const id = `acct/${quiet}/pl:${String((k++ * 104729) % 100_000).padStart(8, "0")}`;
          const t = await post(r, `v1/db/${database}/read`, { entityIds: [id], basis: { recordedPosition: head } });
          if (t.status === 200) lat.push(t.ms);
        }
      }));
      lat.sort((a, b) => a - b);
      return { reads: lat.length, p50: lat[Math.floor(lat.length / 2)], p99: lat[Math.floor(lat.length * 0.99)] };
    };
    const alone = await readLoop(60);
    restartReader();
    await new Promise((done) => setTimeout(done, 15_000));
    const heavy = allPages(r, questions(accounts[0]!, { recordedPosition: head, validAt: now }).q4!);
    const beside = await readLoop(60);
    await heavy;
    write("bench.json", { pins, valids, rows, quiet: { alone, beside, ratio: beside.p99 / alone.p99 } });
    console.log(JSON.stringify({ rows: rows.length, quietRatio: beside.p99 / alone.p99 }));
  }
} finally {
  scaleHost.clean(stackDir, slot);
}
