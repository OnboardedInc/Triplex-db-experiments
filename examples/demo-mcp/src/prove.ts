// [DX-CON1] The console's proving run on the 1 billion database, headless on the rented machine itself (no Mac tunnel):
// every tool through the same local functions the MCP server and the web app use, each row of DESIGN.md table 10.4
// timed against its prediction, G13 measured (transactionsForEntity on an ordinary and on a heavily saved entity),
// and every changed value read back twice: by the tool, and independently with plain SDK rows at the receipt position.
// Writes one JSON and one Markdown result. Times are the gateways' own (x-tx2-gateway-micros), plus wall time here.
// Usage: node src/prove.ts --out DIR [--account account-003] [--subject 50000] [--heavy 0] [--far 87002] [--no-entity-route]
//        (child mode, used by the run itself: --child walk)
// Why: the things only 1 billion records can show (cold reads, a release commit on the general writer at that size,
// an entity journal on a heavily saved entity) must be measured before the servers go. Rejected: running the proof
// from the Mac through the tunnel (round trips of 40 to 70 ms per request would hide the store's own times).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EntityId, Triples } from "@triplex-build/triplex";
import { DatomicClient } from "@triplex-build/triplex-datomic";
import { Effect } from "effect";
import { Config } from "./config.ts";
import { guardCounts } from "./guard.ts";
import { Demo, loadConnection } from "./store.ts";
import { adaptExample } from "./query.ts";
import { runTool } from "./tools.ts";

const arg = (name: string, fallback?: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const conn = loadConnection();
const demo = new Demo(conn);
const round = (n: number) => Math.round(n * 100) / 100;
const p50 = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)]! : NaN; };

// ---- child: the first full configuration walk in a fresh process ---------------------------------------------------
if (process.argv.includes("--child")) {
  const c = new Config(demo.writer, demo.scope, demo.db);
  const walk = await demo.measure(async () => ({ discovery: await c.discover(true), position: 0 }));
  const checksMs: number[] = [];
  for (let i = 0; i < 20; i++) {
    const t = await demo.measure(async () => ({ d: await c.discover(), position: 0 }));
    checksMs.push(t.timing.serverMs ?? NaN);
  }
  console.log("CHILD " + JSON.stringify({ walk: { serverMs: walk.timing.serverMs, roundTripMs: walk.timing.roundTripMs, requests: walk.timing.requests, reads: walk.discovery.reads, ids: Object.fromEntries(Object.entries(walk.discovery.ids).map(([k, v]) => [k, v.length])) }, checkP50: p50(checksMs), checkMax: Math.max(...checksMs), checkRequests: 1 }));
  c.close();
  demo.close();
  process.exit(0);
}

const outDir = arg("--out");
assert(outDir, "Give --out DIR");
mkdirSync(outDir, { recursive: true });
const account = arg("--account", "account-003")!;
const subject = Number(arg("--subject", conn.kind === "1b" ? "50000" : "5"));
const heavySubject = Number(arg("--heavy", "0"));
const far = Number(arg("--far", conn.kind === "1b" ? "87002" : String(Math.max(1, Math.floor(conn.sealed.head / 3)))));
const started = new Date();
const plain = new DatomicClient(conn.readUrl, 60_000);
const ns = conn.roster.find((r) => r.account === account)!.namespace;
const pad8 = (n: number) => String(n).padStart(8, "0");
const ids = { root: `${ns}pl:${pad8(subject)}`, task: `${ns}i9:${pad8(subject)}`, heavyTask: `${ns}i9:${pad8(heavySubject)}` };

type Timing = { serverMs: number | null; roundTripMs: number; requests: number; consoleMs?: number; calls: { route: string; serverMs: number | null }[] };
const calls: { step: string; tool: string; input: object; ok: boolean; serverMs: number | null; roundTripMs: number | null; requests: number | null; consoleMs?: number; error?: string }[] = [];
const checks: { check: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, passed: unknown, detail?: string) => {
  const ok = passed === true;
  checks.push({ check: name, ok, ...(detail ? { detail } : {}) });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " -- " + detail : ""}`);
};
const recordedExamples = new Map<string, { input: object; output: unknown; at: string }>();
const trim = (v: unknown, depth = 0): unknown =>
  Array.isArray(v) ? [...v.slice(0, 5).map((x) => trim(x, depth + 1)), ...(v.length > 5 ? [`... ${v.length - 5} more`] : [])]
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !(k === "calls" && depth > 0)).map(([k, x]) => [k, depth > 6 ? "..." : trim(x, depth + 1)]))
  : typeof v === "string" && v.length > 300 ? v.slice(0, 300) + "..." : v;
async function tool(step: string, name: string, input: object): Promise<Record<string, any>> {
  try {
    const out = (await runTool(name, input, "proof", demo)) as Record<string, any>;
    if (!recordedExamples.has(name)) recordedExamples.set(name, { input, output: trim(out), at: new Date().toISOString() });
    const t = out["timing"] as Timing;
    calls.push({ step, tool: name, input, ok: true, serverMs: t?.serverMs ?? null, roundTripMs: t?.roundTripMs ?? null, requests: t?.requests ?? null, ...(t?.consoleMs !== undefined ? { consoleMs: t.consoleMs } : {}) });
    console.log(`  ${step}: ${name} store ${t?.serverMs} ms, wall ${t?.roundTripMs} ms, ${t?.requests} requests${t?.consoleMs !== undefined ? `, console ${t.consoleMs} ms` : ""}`);
    return out;
  } catch (e) {
    const error = `${(e as { code?: string }).code ?? (e as { _tag?: string })._tag ?? "Error"}: ${String((e as Error).message ?? e).slice(0, 300)}`;
    calls.push({ step, tool: name, input, ok: false, serverMs: null, roundTripMs: null, requests: null, error });
    console.log(`  ${step}: ${name} ERROR ${error}`);
    return { error };
  }
}
const writeOnly = (t: Timing) => round(t.calls.filter((c) => /transact|command|operation/.test(c.route)).reduce((n, c) => n + (c.serverMs ?? 0), 0));
const repeat = async (n: number, step: string, name: string, input: object) => {
  const out: Record<string, any>[] = [];
  for (let i = 0; i < n; i++) out.push(await tool(`${step} #${i + 1}`, name, input));
  return out;
};
const ms = (outs: Record<string, any>[], key: "serverMs" | "consoleMs" = "serverMs") => outs.map((o) => o["timing"]?.[key] as number).filter((x) => Number.isFinite(x));
/** Independent read back: plain SDK rows (no console code) at the receipt position. */
async function sdkValues(entity: string, attribute: string, position: number, validAt: number) {
  const rows = await plain.rows(conn.database, { entityIds: [entity], basis: { recordedPosition: position, validAt }, basisWaitMs: 2000 });
  return rows.filter((r) => r.attribute === attribute).map((r) => r.value_string ?? r.value_number ?? r.value_boolean ?? r.value_datetime ?? r.value_json);
}

const rows: { op: string; predicted: string; basis: string; ifFails: string; lo: number; hi: number; act: number; measured: number | null; detail: string }[] = [];
const row = (op: string, predicted: string, basis: string, ifFails: string, lo: number, hi: number, act: number, measured: number | null, detail: string) => {
  rows.push({ op, predicted, basis, ifFails, lo, hi, act, measured, detail });
  console.log(`ROW ${op}: ${measured} ms (${detail})`);
};

// ---- 0. what is connected -------------------------------------------------------------------------------------------
const summary = await tool("0 identity", "database_summary", {});
check("connected to a working copy with both pinned-read options on", conn.workingCopy && JSON.stringify((conn as { pinnedReads?: unknown }).pinnedReads) === '{"shortcut":true,"cutLookup":true}', JSON.stringify((conn as { pinnedReads?: unknown }).pinnedReads));
if (conn.kind === "1b") check("the 1 billion database at its sealed identity", conn.sealed.head === 28309866 && conn.sealed.records === 1000251169, `sealed head ${conn.sealed.head}, records at bring-up ${conn.recordsAtBringUp}`);

// ---- 1. the demo's first subject, cold then warm (demo step 1) -----------------------------------------------------
const cold = await tool("1 subject cold", "read_subject", { account, subject });
const warm = await repeat(5, "1 subject warm", "read_subject", { account, subject });
check("the subject reads the same facts cold and warm", cold["factCount"] > 0 && warm.every((w) => w["factCount"] === cold["factCount"]), `${cold["factCount"]} facts in ${cold["entities"]} entities`);

// ---- 2. a read far behind the head with the options on (10.4 row 9) ------------------------------------------------
const farReads = await repeat(21, "2 far read", "read_subject", { account, subject, basis: { position: far } });
const farWarm = ms(farReads.slice(1));
row("A read at position 87,002 with the options on", "1 to 3 ms", "p50 1.37 ms (recorded).", "Slower: the options are not on; check the profile.", 1, 3, 3, p50(farWarm),
  `p50 of 20 warm reads of subject ${subject} at position ${far}; first ${farReads[0]!["timing"]?.serverMs} ms; max ${Math.max(...farWarm)} ms`);

// ---- 3. configuration before any release, then the first release (10.4 rows 1 and 3) ------------------------------
const before = await tool("3 types before", "list_entity_types", {});
const firstRelease = await tool("3 first release", "define_entity_type", {
  name: "Review",
  attributes: [
    { key: ":review/outcome", valueType: "enumOf", enumValues: ["approved", "rejected", "pending"], required: true },
    { key: ":review/note", valueType: "text" },
    { key: ":review/of", valueType: "ref", refTarget: "Subject", required: true },
    { key: ":review/decided-on", valueType: "date" },
  ],
  label: "reviews-1",
});
check("define_entity_type Review committed a release and moved test and live", typeof firstRelease["release"]?.id === "string" && firstRelease["refs"]?.live?.id === firstRelease["release"]?.id, firstRelease["error"] ?? `${firstRelease["release"]?.label}, receipt position ${firstRelease["receipt"]?.position}`);
const secondName = before["types"]?.some((t: any) => t.name === "Vehicle") || firstRelease["error"] ? `Vehicle${Date.now() % 100000}` : "Vehicle";
const second = await tool("3 second release", "define_entity_type", {
  name: secondName,
  attributes: [{ key: ":vehicle/plate", valueType: "text", required: true }, { key: ":vehicle/depot", valueType: "text" }],
  label: "vehicles-1",
});
row("Commit a release with one new type", "30 to 120 ms warm; up to 500 ms as the first write", "Correction 46 ms, retirement 32 ms, first save 448 ms (recorded).", "Over 1 s: commit the first release before Ben arrives.", 30, 120, 1000,
  second["timing"] ? writeOnly(second["timing"]) : null,
  `warm (Vehicle): the commit and live-move transactions ${second["timing"] ? writeOnly(second["timing"]) : "-"} ms, whole tool ${second["timing"]?.serverMs} ms over ${second["timing"]?.requests} requests; first (Review, the first write of the run${before["release"] ? "" : " and the first release"}): transactions ${firstRelease["timing"] ? writeOnly(firstRelease["timing"]) : "-"} ms, whole tool ${firstRelease["timing"]?.serverMs} ms`);

// ---- 4. the walk in a fresh process, and the configuration check (10.4 rows 1 and 2) -------------------------------
const childOut = execFileSync(process.execPath, [import.meta.filename, "--child"], { encoding: "utf8", env: process.env });
const child = JSON.parse(childOut.split("\n").find((l) => l.startsWith("CHILD "))!.slice(6));
row("Configuration check (two ref entities by ID, write gateway)", "1 to 5 ms warm", "A warm entity read is under 2 ms (recorded).", "Over 50 ms: check every 10 s, not before every read.", 1, 5, 50, child.checkP50,
  `p50 of 20 checks in a fresh process after its walk, one request each; max ${child.checkMax} ms`);
row("First full configuration walk after a start", "60 to 300 ms", "20 to 40 small entities in four to six batched reads; about 30 ms for a cold read (recorded).", "Over 1 s: the sidebar's slow state covers it once per start.", 60, 300, 1000, child.walk.serverMs,
  `fresh process, ${child.walk.reads} batched reads, ${JSON.stringify(child.walk.ids)} IDs, wall ${child.walk.roundTripMs} ms`);

// ---- 5. creating entities (10.4 row 4; demo step 5) -----------------------------------------------------------------
const creates: Record<string, any>[] = [];
for (const [i, n] of [subject, 7, subject + 1, subject + 2, subject + 3].entries())
  creates.push(await tool(`5 create #${i + 1}`, "create_entity", { type: "Review", account, attributes: { ":review/outcome": "pending", ":review/of": `${ns}pl:${pad8(n)}`, ":review/note": `proof ${i}` }, validFrom: "2026-11-09T00:00:00Z" }));
const createMs = creates.map((c) => (c["timing"] ? writeOnly(c["timing"]) : NaN)).filter(Number.isFinite);
row("Create an entity", "20 to 80 ms", "As above; the counter adds one replaced fact.", "Over 300 ms: look at the precondition read.", 20, 80, 300, p50(createMs),
  `p50 of ${createMs.length} creates, the transaction alone; whole tool p50 ${p50(ms(creates))} ms; numbers ${creates.map((c) => c["number"]).join(", ")}`);
check("five creates: five numbers, read backs match", creates.every((c) => c["readbackMatches"] === true) && new Set(creates.map((c) => c["number"])).size === 5);
const review = creates[0]!;
const sdkOutcome = review["entity"] ? await sdkValues(review["entity"], ":review/outcome", review["position"], Date.now()) : [];
check("independent read back of a create (plain SDK rows at the receipt position)", JSON.stringify(sdkOutcome) === '["pending"]', JSON.stringify(sdkOutcome));

// ---- 6. questions (10.4 rows 5, 6, 7; demo steps 2 and 3) ------------------------------------------------------------
const notComplete = { find: ["?task"], where: [["?placement", ":placement/task", "?task"], ["not", ["?task", ":task/status", "complete"]]] };
const qs = await repeat(10, "6 one-subject question", "query", { query: notComplete, from: { subject: { account, subject } } });
row("A question on one subject", "1.84 ms for the pull, warm; under 10 ms in the console", "Recorded pull; evaluation measured on the Mac.", "Console over 50 ms: keep the in-memory copy between runs at one position.", 0.5, 10, 50, p50(ms(qs, "consoleMs")),
  `console p50 ${p50(ms(qs, "consoleMs"))} ms; pull (store) p50 ${p50(ms(qs))} ms over ${qs[0]?.["timing"]?.requests} requests; ${qs[0]?.["total"]} bindings`);
const storeOrdinary = await repeat(10, "6 store ordinary", "query", { query: { find: ["?status"], where: [[ids.task, ":task/status", "?status"]] }, from: "store" });
row("A store-source question on an ordinary entity", "5 to 40 ms over three requests", "53.84 ms on the small database, including opening the scope.", "Over 200 ms: label it.", 5, 40, 200, p50(ms(storeOrdinary.slice(1))),
  `p50 of 9 after the first (${storeOrdinary[0]?.["timing"]?.serverMs} ms), ${storeOrdinary[1]?.["timing"]?.requests} requests (basis, snapshot, q, release)`);
const storeHeavy = await repeat(4, "6 store heavy", "query", { query: { find: ["?status"], where: [[ids.heavyTask, ":task/status", "?status"]] }, from: "store" });
row("A store-source question on a heavily saved entity", "0.2 to 5 s", "It reads the full history: 225 ms warm, 4.4 s cold (recorded).", "Keep the label.", 200, 5000, Infinity, storeHeavy[0]?.["timing"]?.serverMs ?? null,
  `first ${storeHeavy[0]?.["timing"]?.serverMs} ms, then ${ms(storeHeavy.slice(1)).join(", ")} ms (${ids.heavyTask})`);
const examples = JSON.parse(readFileSync(join(import.meta.dirname, "../../../demo/console/questions.json"), "utf8")) as { name: string; query: object; from: object | string; basis?: object; explain?: boolean; expect?: string }[];
const people = conn.roster.find((r) => r.account === account)!.people;
for (const original of examples) {
  const ex = adaptExample(original, account, subject, conn.sealed.head, people);
  const out = await tool(`6 example: ${ex.name}`, "query", { query: ex.query, from: ex.from, ...(ex.basis ? { basis: ex.basis } : {}), ...(ex.explain ? { explain: true } : {}) });
  check(`example question runs as designed: ${ex.name}`, ex.expect === "refused" ? String(out["error"]).startsWith("QueryRefused") : !out["error"], out["error"] ?? `${out["total"]} bindings`);
}

// ---- 7. G13: an entity's journal, newest 20 (10.4 row 8) ------------------------------------------------------------
async function journal(entity: string) {
  const t = await demo.measure(async () => ({ page: await demo.read(Effect.flatMap(Triples, (s) => s.transactionsForEntity(EntityId.make(entity), { limit: 20 }))), position: 0 }));
  return { serverMs: t.timing.serverMs, roundTripMs: t.timing.roundTripMs, requests: t.timing.requests, transactions: t.page.transactions.length, changes: t.page.transactions.reduce((n, x) => n + x.changes.length, 0) };
}
// --no-entity-route: on the lean layout the gateway's entity-transactions route walks the whole position index under the
// single journal permit (journal.clj entity-positions), so at 1 billion it does not answer and blocks every journal read
// behind it (seen 2026-11-23: no answer in 40 s, the gateways had to be restarted). The console builds an entity's journal
// from bounded feed pages instead (change_feed with entity, timed in section 10b).
const skipEntityRoute = process.argv.includes("--no-entity-route");
const none = { serverMs: null, roundTripMs: null, requests: 0, transactions: 0, changes: 0 };
const g13 = skipEntityRoute
  ? { skipped: "not run (--no-entity-route): the lean-layout entity-transactions route reads every transaction", ordinary: none, ordinaryWarm: none, created: none, heavy: none, heavyWarm: none }
  : { ordinary: await journal(ids.task), ordinaryWarm: await journal(ids.task), created: await journal(review["entity"] ?? ids.task), heavy: await journal(ids.heavyTask), heavyWarm: await journal(ids.heavyTask) };
row("An entity's journal, newest 20", "20 to 300 ms; unknown on a heavily saved entity", "229 ms on the small database for one transaction of 124 changes.", "Over 1 s: slow state on the Journal tab.", 20, 300, 1000, g13.ordinary.serverMs,
  `ordinary ${ids.task}: ${g13.ordinary.serverMs} ms then ${g13.ordinaryWarm.serverMs} ms (${g13.ordinary.transactions} transactions); created review ${g13.created.serverMs} ms; heavily saved ${ids.heavyTask}: ${g13.heavy.serverMs} ms cold, ${g13.heavyWarm.serverMs} ms warm (${g13.heavy.transactions} transactions, ${g13.heavy.changes} changes, ${g13.heavy.requests} requests)`);
if (!skipEntityRoute) check("G13: transactionsForEntity answers on the heavily saved entity", g13.heavy.transactions > 0, JSON.stringify(g13.heavy));

// ---- 8. changes with read back (demo step 6), history, both time axes ------------------------------------------------
const liveBefore = (await tool("8 live release", "list_entity_types", {}))["release"]?.id;
const saved = await tool("8 typed save", "save_facts", { entity: review["entity"], changes: { ":review/outcome": "approved" } });
const liveAfter = (await tool("8 live release", "list_entity_types", {}))["release"]?.id;
// On the 1 billion run nothing else moves live; on the toy another builder may, so either side of the save counts.
check("typed save_facts: read back matches, pinned to the live release", saved["readbackMatches"] === true && [liveBefore, liveAfter].includes(saved["receipt"]?.configSnapshot), saved["error"] ?? saved["receipt"]?.configSnapshot);
const savedSdk = saved["position"] ? await sdkValues(review["entity"], ":review/outcome", saved["position"], Date.now() + 1000) : [];
check("independent read back of the save", JSON.stringify(savedSdk) === '["approved"]', JSON.stringify(savedSdk));
const corrected = await tool("8 correction", "correct_past_value", { entity: review["entity"], attribute: ":review/outcome", value: "rejected", validFrom: "2026-11-16T00:00:00Z" });
const correctedSdk = corrected["position"] ? await sdkValues(review["entity"], ":review/outcome", corrected["position"], Date.parse("2026-11-17T00:00:00Z")) : [];
check("correct_past_value: read back matches (tool and SDK on 17 November)", corrected["readbackMatches"] === true && JSON.stringify(correctedSdk) === '["rejected"]', JSON.stringify(correctedSdk));
const beforeCorrection = corrected["position"] ? await sdkValues(review["entity"], ":review/outcome", corrected["position"] - 1, Date.parse("2026-11-17T00:00:00Z")) : [];
check("the belief before the correction is still readable at its position (pending on 17 November)", JSON.stringify(beforeCorrection) === '["pending"]', JSON.stringify(beforeCorrection));
const retired = await tool("8 retire", "retire_fact", { entity: review["entity"], attribute: ":review/note" });
const retiredSdk = retired["position"] ? await sdkValues(review["entity"], ":review/note", retired["position"], Date.now() + 1000) : ["?"];
check("retire_fact: gone from current reads (tool and SDK)", retired["retiredFromCurrent"] === true && retiredSdk.length === 0, JSON.stringify(retiredSdk));
const history = await tool("8 history", "field_history", { entity: review["entity"], attribute: ":review/outcome" });
check("field_history keeps the retracted assertions", history["rows"]?.some((r: any) => !r.live) === true && history["rows"]?.some((r: any) => r.live) === true, `${history["totalRows"]} rows`);
const untyped = await tool("8 untyped save", "save_facts", { account, subject, kind: "task", changes: { ":task/field-0": "reviewed by the proof" } });
const untypedSdk = untyped["position"] ? await sdkValues(ids.task, ":task/field-0", untyped["position"], Date.now() + 1000) : [];
check("untyped save on a loader-built task: read back matches (tool and SDK)", untyped["readbackMatches"] === true && JSON.stringify(untypedSdk) === '["reviewed by the proof"]', JSON.stringify(untypedSdk));
const time = await tool("8 both axes", "read_subject_at", { root: review["entity"], at: "2026-11-17T00:00:00Z", attribute: ":review/outcome", position: saved["position"] });
check("read_subject_at on the review: three views", Array.isArray(time["current"]) && Array.isArray(time["believedThen"]), JSON.stringify(time["differences"] ?? time["error"]).slice(0, 200));
const heavyHistory = await tool("8 heavy history", "field_history", { account, subject: heavySubject, kind: "task", attribute: ":task/field-0" });
check("the heavy entity's history reports the rows it read", heavyHistory["entityHistoryRows"] > 0, `${heavyHistory["entityHistoryRows"]} rows read, ${heavyHistory["totalRows"]} of :task/field-0`);

// ---- 9. configuration tools, rollback (demo steps 4 and 8) -----------------------------------------------------------
const releases = await tool("9 releases", "list_releases", { compare: [firstRelease["release"]?.id, second["release"]?.id] });
check("list_releases compares the two releases", releases["difference"]?.some((d: any) => d.key === secondName) === true, JSON.stringify(releases["difference"]?.map((d: any) => d.change + " " + d.key)));
const back = await tool("9 move live back", "move_live", { snapshotId: firstRelease["release"]?.id });
const typesBack = await tool("9 types after rollback", "list_entity_types", {});
const reviewStill = review["entity"] ? await tool("9 review after rollback", "read_entity", { entity: review["entity"] }) : {};
check("rollback: Vehicle leaves the type list; the review's facts still read", Array.isArray(typesBack["types"]) && !typesBack["types"].some((t: any) => t.name === secondName) && reviewStill["factCount"] > 0, back["error"]);
const forward = await tool("9 move live forward", "move_live", { snapshotId: second["release"]?.id });
check("move_live forward", forward["after"]?.id === second["release"]?.id, forward["error"]);
await tool("9 describe", "describe_entity_type", { name: "Review" });
const listed = await tool("9 list entities", "list_entities", { type: "Review", account });
check("list_entities lists the created reviews by number", listed["created"] >= 5 && listed["entities"]?.length >= 5, `created ${listed["created"]}`);
const asSubject = review["entity"] ? await tool("9 review as subject", "read_entity", { entity: review["entity"], asSubject: true }) : {};
check("the review read as a subject reaches the worker record it points to", asSubject["subject"]?.entities > 1, `${asSubject["subject"]?.entities} entities`);

// ---- 10. the remaining tools ----------------------------------------------------------------------------------------
await tool("10", "list_accounts", {});
await tool("10", "find_subjects", { account, from: subject, count: 5 });
await tool("10", "read_many_subjects", { account, subjects: [...Array(16).keys()].map((i) => subject + i).filter((n) => n < people) });
await tool("10", "read_subject_at", { account, subject: heavySubject, at: "2025-06-01T00:00:00Z" });
const feed = await tool("10", "change_feed", { after: Number(summary["head"]), limit: 50 });
check("the change feed after the head at the start shows the proof's changes with actor proof", feed["transactions"]?.some((t: any) => t.actor === "proof") === true, `${feed["transactions"]?.length} transactions`);
await tool("10", "change_feed", { after: Math.max(0, conn.sealed.head - 5), limit: 5 });
const removal = await tool("10", "remove_on_request", { account, subject: 0 });
check("removal on request explains and changes nothing", removal["done"] === false, removal["error"]);

// ---- 10b. the feed by entity and who changed since; a derivation with reconcile (the eleventh minute) -----------------
const byEntity = await tool("10b entity journal", "change_feed", { entity: review["entity"] ?? ids.task, limit: 20 });
check("change_feed by entity lists the review's transactions newest first", byEntity["transactions"]?.length >= 4 && byEntity["transactions"].every((t: any, i: number, a: any[]) => i === 0 || a[i - 1].position > t.position), `${byEntity["transactions"]?.length} transactions`);
const since = await tool("10b who changed since", "change_feed", { after: Number(summary["head"]), summary: true });
check("who changed since the start names the subjects the proof changed", since["subjects"]?.some((x: any) => x.subject === `${account} / ${subject}`) === true, `${since["subjectsChanged"]} subjects in ${since["transactionsRead"]} transactions`);
const openTasks = { name: "open-tasks", query: { find: ["?task", "?progress"], where: [["?placement", ":placement/task", "?task"], ["?task", ":task/progress", "?progress"], ["not", ["?task", ":task/status", "complete"]]] }, identity: ["?task"] };
// The first subject from the demo's on that still has an open task (a rehearsal completes one per run).
let derivedSubject = subject;
let derived = await tool("10b derivation", "evaluate_derivation", { derivation: openTasks, account, subject });
while (!derived["candidates"]?.length && derivedSubject + 1 < people && derivedSubject < subject + 16)
  derived = await tool("10b derivation", "evaluate_derivation", { derivation: openTasks, account, subject: ++derivedSubject });
const firstOpen = derived["candidates"]?.[0]?.identity?.["?task"] as string | undefined;
if (firstOpen) {
  await tool("10b complete one task", "save_facts", { entity: firstOpen, changes: { ":task/status": "complete" } });
  const rec = await tool("10b derivation reconcile", "evaluate_derivation", { derivation: openTasks, account, subject: derivedSubject, compareToPosition: derived["position"] });
  check("derivation reconcile: the completed task is removed, the rest unchanged", rec["reconcile"]?.counts?.removed === 1 && rec["reconcile"].removed[0].identity["?task"] === firstOpen && rec["reconcile"].counts.unchanged === derived["candidates"].length - 1, JSON.stringify(rec["reconcile"]?.counts));
} else check("the subject has an open task to derive", false, JSON.stringify(derived["error"] ?? derived["candidates"]));

// ---- 11. the guard ----------------------------------------------------------------------------------------------------
const sentBefore = guardCounts.sent;
const scan = await tool("11 scan attempt", "query", { query: { find: ["?task"], where: [["?task", ":task/status", "complete"]] }, from: "store" });
const direct = await demo.reader.rows(conn.database, { pattern: { attribute: ":task/status" } }).then(() => "sent", (e: { code?: string }) => e.code ?? "error");
check("a direct row read by attribute is refused by the guard", direct === "ScanRefused", direct);
row("A read with no entity ID reaching a gateway", "Never", "The guard.", "Any such request is a defect.", 0, 0, 0, guardCounts.sent - sentBefore,
  `requests sent by a refused whole-database question and a direct read by attribute: ${guardCounts.sent - sentBefore}; guard refusals during the whole run: ${guardCounts.refused} (each one a deliberate scan attempt); ${scan["error"]?.slice(0, 40)}`);
check("no read without an entity ID was sent during the run (the one guard refusal is the deliberate one)", guardCounts.refused === 1 && guardCounts.sent - sentBefore === 0, JSON.stringify(guardCounts));
const final = await tool("11 final", "database_summary", {});

// ---- results ----------------------------------------------------------------------------------------------------------
const finished = new Date();
const verdict = (r: (typeof rows)[number]) =>
  r.measured === null || !Number.isFinite(r.measured) ? "not measured"
  : r.op.startsWith("A read with no entity") ? (r.measured === 0 ? "holds" : "DEFECT")
  : r.measured < r.lo ? "faster than predicted"
  : r.measured <= r.hi ? "within prediction"
  : r.measured <= r.act ? "slower than predicted, under the action line"
  : "ACTION: " + r.ifFails;
const commit = (() => { try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", cwd: import.meta.dirname }).trim(); } catch { return "unknown"; } })();
const result = {
  version: "triplex-console-proof/1", commit, kind: conn.kind, database: conn.database.slice(0, 12),
  startedAt: started.toISOString(), finishedAt: finished.toISOString(), seconds: Math.round((finished.getTime() - started.getTime()) / 1000),
  identity: { recordsAtBringUp: conn.recordsAtBringUp, sealedHead: conn.sealed.head, headAtStart: summary["head"], headAtEnd: final["head"], pinnedReads: (conn as { pinnedReads?: unknown }).pinnedReads, memory: (conn as { memory?: unknown }).memory ?? null },
  subjects: { account, subject, heavySubject, farPosition: far, ...ids },
  predictions: rows.map((r) => ({ ...r, verdict: verdict(r) })),
  g13, configurationWalk: child,
  checks, passed: checks.filter((c) => c.ok).length, failed: checks.filter((c) => !c.ok).length,
  guard: guardCounts, calls,
};
writeFileSync(join(outDir, "console-proof.json"), JSON.stringify(result, (_k, v) => (typeof v === "bigint" ? String(v) : v === Infinity ? null : v), 2) + "\n");
const md = [
  `# Triplex Console proving run (${conn.kind === "1b" ? "the 1 billion record database" : "the small database"})`,
  "",
  `Commit \`${commit}\`. Started ${started.toISOString()}, ${result.seconds} s. Records at bring-up ${conn.recordsAtBringUp.toLocaleString("en-US")}, head ${summary["head"]} to ${final["head"]}. Pinned-read options ${JSON.stringify((conn as { pinnedReads?: unknown }).pinnedReads)}. Times are the gateways' own (store time), measured on the machine itself. ${conn.kind === "1b" ? "" : "Diagnostic only: this is not the 1 billion database."}`,
  "",
  `**Checks: ${result.passed} passed, ${result.failed} failed.**`,
  "",
  "## Table 10.4: predictions and measurements",
  "",
  "| Operation | Predicted | Measured (ms) | Verdict | How it was measured | If it fails |",
  "| --- | --- | ---: | --- | --- | --- |",
  ...result.predictions.map((r) => `| ${r.op} | ${r.predicted} | ${r.measured ?? "-"} | ${r.verdict} | ${r.detail} | ${r.ifFails} |`),
  "",
  "## G13: an entity's journal",
  "",
  "| Entity | First (ms) | Again (ms) | Transactions | Changes | Requests |",
  "| --- | ---: | ---: | ---: | ---: | ---: |",
  `| ordinary task \`${ids.task}\` | ${g13.ordinary.serverMs} | ${g13.ordinaryWarm.serverMs} | ${g13.ordinary.transactions} | ${g13.ordinary.changes} | ${g13.ordinary.requests} |`,
  `| created review | ${g13.created.serverMs} | | ${g13.created.transactions} | ${g13.created.changes} | ${g13.created.requests} |`,
  `| heavily saved task \`${ids.heavyTask}\` | ${g13.heavy.serverMs} | ${g13.heavyWarm.serverMs} | ${g13.heavy.transactions} | ${g13.heavy.changes} | ${g13.heavy.requests} |`,
  "",
  "## Checks",
  "",
  ...checks.map((c) => `- ${c.ok ? "PASS" : "**FAIL**"} ${c.check}${c.detail ? `: ${String(c.detail).replaceAll("|", "/")}` : ""}`),
  "",
  "## Every call",
  "",
  "| Step | Tool | Store (ms) | Console (ms) | Wall here (ms) | Requests | Error |",
  "| --- | --- | ---: | ---: | ---: | ---: | --- |",
  ...calls.map((c) => `| ${c.step} | \`${c.tool}\` | ${c.serverMs ?? "-"} | ${c.consoleMs ?? ""} | ${c.roundTripMs ?? "-"} | ${c.requests ?? "-"} | ${c.error ? c.error.replaceAll("|", "/").slice(0, 120) : ""} |`),
  "",
].join("\n");
writeFileSync(join(outDir, "console-proof.md"), md);
// The recorded examples the Assistant page shows: the first answer of every tool, trimmed, with its date and database.
const recorded = { version: "triplex-console-examples/1", database: conn.kind === "1b" ? "the 1 billion record database" : "the small database on the Mac", commit, recordedAt: started.toISOString(),
  tools: Object.fromEntries([...recordedExamples].map(([name, e]) => [name, e])) };
writeFileSync(join(outDir, "examples.json"), JSON.stringify(recorded, (_k, v) => (typeof v === "bigint" ? String(v) : v), 2) + "\n");
writeFileSync(join(outDir, "EXAMPLES.md"), [
  `# Recorded examples (${recorded.database})`,
  "",
  `Recorded ${started.toISOString()} at commit \`${commit}\` by \`examples/demo-mcp/src/prove.ts\`, one per tool: the call and its answer, arrays cut to five entries. The same file in JSON is \`demo/console/examples.json\`, which the console's Assistant page shows with the badge "Recorded".`,
  "",
  ...[...recordedExamples].flatMap(([name, e]) => [`## \`${name}\``, "", "```json", JSON.stringify(e.input, null, 2), "```", "", "```json", JSON.stringify(e.output, (_k, v) => (typeof v === "bigint" ? String(v) : v), 2), "```", ""]),
].join("\n"));
console.log(`CONSOLE PROOF ${result.failed ? "FAILED" : "PASSED"}: ${result.passed} of ${checks.length} checks, ${result.seconds} s; results in ${outDir}/console-proof.{json,md}`);
plain.close();
demo.close();
process.exit(result.failed ? 1 : 0);
