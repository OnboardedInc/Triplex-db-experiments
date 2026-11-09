// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import { qleverLatencyReceipt } from "../../receipts/latency.mjs";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const out = process.argv[2];
if (!out || fs.existsSync(out)) throw Error("new attempt directory required");
fs.mkdirSync(out, { recursive: true });
const url = "http://127.0.0.1:7071";
const hash = (x) => createHash("sha256").update(x).digest("hex");
const save = (name, value) =>
  fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
const owner = JSON.parse(
  fs.readFileSync("/Users/sam/projects/triplex-db-2/lab/locks/qlever-s1/owner.json"),
);
if (owner.holder !== "CX-QG1") throw Error("slot not owned");
const started = new Date().toISOString();
let serial = 0;
async function request(params) {
  const id = ++serial;
  const at = new Date().toISOString(),
    start = performance.now();
  const res = await fetch(`${url}/?${new URLSearchParams(params)}`, {
    headers: { Accept: "application/qlever-results+json" },
    signal: AbortSignal.timeout(600000),
  });
  const raw = await res.text();
  fs.writeFileSync(path.join(out, `${id}.response`), raw);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  const meta = qleverLatencyReceipt({
    qleverConnectionMode: "keep-alive",
    id,
    connectionMode: "keep-alive",
    at,
    finished: new Date().toISOString(),
    ms: performance.now() - start,
    status: res.status,
    params,
    sha256: hash(raw),
  });
  save(`${id}.request.json`, meta);
  return { ...meta, data };
}
const canonical = (r) => JSON.stringify((r.data?.res ?? []).map((x) => JSON.stringify(x)).sort());
function scans(data) {
  const result = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (/IndexScan/.test(n.description ?? ""))
      result.push({
        description: n.description,
        estimate: n.estimated_size,
        rows: n.result_rows,
        ms: n.total_time,
        details: n.details,
        cache: n.cache_status,
      });
    for (const c of n.children ?? []) walk(c);
  };
  walk(data?.runtimeInformation?.query_execution_tree);
  return result;
}
const queries = {
  discover: "SELECT ?g ?s ?p ?o WHERE { GRAPH ?g { ?s ?p ?o } } LIMIT 3",
  base: "SELECT ?p ?o WHERE { <urn:triplex:bootstrap> ?p ?o }",
  c8base: fs.readFileSync(new URL("./queries/c8-base.rq", import.meta.url), "utf8"),
  c8edge: fs.readFileSync(new URL("./queries/c8-edge.rq", import.meta.url), "utf8"),
};
const beforeStats = await request({ cmd: "stats" });
const discovered = await request({ query: queries.discover });
const row = discovered.data?.res?.[0];
if (!row || row.length !== 4) throw Error("discovery returned no terms");
queries.point = `SELECT ?g ?p ?o WHERE { GRAPH ?g { ${row[1]} ?p ?o } }`;
queries.optional = `SELECT ?g ?p ?o ?q WHERE { GRAPH ?g { ${row[1]} ?p ?o OPTIONAL { ${row[1]} ${row[2]} ?q } } }`;
queries.predicate = `SELECT ?s ?o WHERE { GRAPH ${row[0]} { ?s ${row[2]} ?o } } LIMIT 10`;
queries.object = `SELECT ?s ?p WHERE { GRAPH ${row[0]} { ?s ?p ${row[3]} } } LIMIT 10`;
const measurements = {};
for (const phase of ["before", "after"]) {
  if (phase === "after") save("rebuild.json", await request({ cmd: "rebuild-index" }));
  measurements[phase] = {};
  for (const [name, query] of Object.entries(queries)) {
    await request({ cmd: "clear-cache" });
    const r = await request({ query });
    measurements[phase][name] = qleverLatencyReceipt({
      qleverConnectionMode: r.qleverConnectionMode,
      id: r.id,
      ms: r.ms,
      status: r.status,
      answer: canonical(r),
      rows: r.data?.res?.length,
      scans: scans(r.data),
    });
  }
  save(`${phase}-stats.json`, await request({ cmd: "stats" }));
  save("measurements.json", measurements);
}
// [EXP-QG1] Why: compare content only from these fresh, slot-bound responses. Rejected:
// interpreting HTTP 200 or process success as rebuild correctness or Q89i acceptance.
const equal = Object.keys(queries).every(
  (k) =>
    measurements.before[k].status === 200 &&
    measurements.after[k].status === 200 &&
    measurements.before[k].rows > 0 &&
    measurements.before[k].answer === measurements.after[k].answer,
);
save("receipt.json", qleverLatencyReceipt({
  qleverConnectionMode: "keep-alive",
  started,
  finished: new Date().toISOString(),
  owner,
  beforeStats,
  source: {
    probe: hash(fs.readFileSync(import.meta.filename)),
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  },
  baseTriples: beforeStats.data?.["num-triples-normal"],
  deltaTriples: null,
  touchedBlockDelta: { status: "estimate-only; runtime trees retained; not exact block counters" },
  sampledAnswerIdentity: equal,
  verdict: "DIAGNOSTIC: sampled identity is not the 200-read Q89i gate",
}));
console.log(JSON.stringify({ out, sampledAnswerIdentity: equal }));
