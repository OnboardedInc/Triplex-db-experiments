import { qleverLatencyReceipt, requireQleverConnectionMode } from "../../receipts/latency.mjs";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { encodedRowFields } from "../../../packages/qlever/dist/index.js";
import { deltaCount } from "./delta-count.mjs";
const out = process.argv[2],
  seedDir = process.argv[3],
  arm = process.argv[4];
if (!out || !["M", "U"].includes(arm) || fs.existsSync(out))
  throw Error("new output, seed dir, M|U required");
fs.mkdirSync(out, { recursive: true });
const dockerHost = "unix:///Users/sam/.colima/triplex2/docker.sock";
process.env.DOCKER_HOST = dockerHost;
const docker = (args) =>
  execFileSync("docker", ["--host", dockerHost, ...args], {
    encoding: "utf8",
    maxBuffer: 32 << 20,
  });
const hash = (x) => createHash("sha256").update(x).digest("hex");
const save = (name, x) => fs.writeFileSync(path.join(out, name), JSON.stringify(x, null, 2));
const owner = JSON.parse(
  fs.readFileSync("/Users/sam/projects/triplex-db-2/lab/locks/qlever-s1/owner.json"),
);
if (owner.holder !== "CX-QG1") throw Error("not owned");
const inspect = JSON.parse(docker(["inspect", "tx2-qlever-s1"]))[0];
const binding = qleverLatencyReceipt({
  qleverConnectionMode: "keep-alive",
  owner,
  containerId: inspect.Id,
  image: inspect.Image,
  config: inspect.Config.Labels["tx2.config-sha256"],
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sources: Object.fromEntries(
    ["grid.mjs", "delta-count.mjs", "p4-sample.ts", "../../receipts/latency.mjs"].map((f) => [
      f,
      hash(fs.readFileSync(new URL(f, import.meta.url))),
    ]),
  ),
});
binding.serializerSha256 = hash(fs.readFileSync("packages/qlever/dist/rdf.js"));
binding.lockSha256 = hash(fs.readFileSync("pnpm-lock.yaml"));
binding.nodeVersion = process.version;
binding.seedManifestSha256 = hash(fs.readFileSync(`${seedDir}/manifest.json`));
save("binding.json", binding);
let serial = 0;
async function req(params, accept = "application/qlever-results+json") {
  const id = ++serial,
    at = new Date().toISOString(),
    t = performance.now();
  const r = await fetch("http://127.0.0.1:7071/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: accept },
    body: new URLSearchParams({ ...params, timeout: "300s" }),
    signal: AbortSignal.timeout(310000),
  });
  const raw = await r.text();
  fs.writeFileSync(path.join(out, `${id}.response`), raw);
  save(`${id}.request.json`, qleverLatencyReceipt({ writer: "qg1-request/1",
    qleverConnectionMode: "keep-alive",
    at,
    params,
    ms: performance.now() - t,
    status: r.status,
    sha256: hash(raw),
  }));
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }
  if (r.status !== 200) throw Error(`request ${id} HTTP ${r.status}: ${raw.slice(0, 300)}`);
  return qleverLatencyReceipt({ writer: "qg1-request/1", qleverConnectionMode: "keep-alive", id, ms: performance.now() - t, data });
}
const seed = JSON.parse(fs.readFileSync(`${seedDir}/manifest.json`));
const graph = seed.seedManifest.graphIri;
let first;
const baseIds = [];
for await (const line of readline.createInterface({
  input: fs.createReadStream(`${seedDir}/seed.nq.gz`).pipe(zlib.createGunzip()),
})) {
  const m = /^(<urn:triplex:assertion:([^>]+)>) <urn:triplex:field:id>/.exec(line);
  if (m) {
    baseIds.push(m[2]);
    if (!first) first = m[1];
  }
}
if (baseIds.length < 1000) throw Error("no base assertion ids");
let k = 0,
  rowIndex = 0;
const rowFor = (i) => {
  const id =
    arm === "M"
      ? `zz-qg1-${String(i).padStart(10, "0")}`
      : Buffer.from(baseIds[(i * 7919) % baseIds.length], "base64url").toString() +
        `:qg1:${String(i).padStart(10, "0")}`;
  return {
    id,
    entity_id: `qg1:entity:${arm === "M" ? i : (i * 7919) % 4000}`,
    attribute: ":qg1/value",
    value_type: "string",
    value_string: `value-${i}`,
    value_number: null,
    value_boolean: null,
    value_datetime: null,
    value_json: null,
    recorded_at: 1700000000000 + i,
    recorded_position: i + 1,
    valid_from: 1700000000000,
    valid_to: null,
    created_by: null,
    retracted_at: null,
    retracted_position: null,
    retract_tx_id: null,
    entity_type: null,
    schema_version: null,
    tx_id: null,
  };
};
// [EXP-QG1] Why: use rdf.ts:encoded base64url for the public adapter identity.
// Rejected: percent encoding (would measure a different assertion-IRI layout).
const assertion = (id) => `<urn:triplex:assertion:${Buffer.from(id).toString("base64url")}>`;
const queries = {
  base: `SELECT ?p ?o WHERE { GRAPH ${graph} { ${first} ?p ?o } }`,
  delta: `SELECT ?p ?o WHERE { GRAPH ${graph} { ${assertion(rowFor(0).id)} ?p ?o } }`,
  predicate: `SELECT ?s ?o WHERE { GRAPH ${graph} { ?s <urn:triplex:field:attribute> ":placement/status" ; <urn:triplex:field:id> ?o } } LIMIT 20`,
  object: `SELECT ?s ?p WHERE { GRAPH ${graph} { ?s ?p ":placement/status" } } LIMIT 20`,
  join: `SELECT ?s ?v WHERE { GRAPH ${graph} { ?s <urn:triplex:field:attribute> ":placement/status" ; <urn:triplex:field:scalar_lexical> ?v OPTIONAL { ?s <urn:triplex:field:retracted_position> ?rp } } } LIMIT 20`,
  c8base: fs.readFileSync(new URL("./queries/c8-base.rq", import.meta.url), "utf8"),
  c8edge: fs.readFileSync(new URL("./queries/c8-edge.rq", import.meta.url), "utf8"),
};
// [EXP-QG1] Why: retain paired query bytes; the full control creates a fresh fixture.
// Rejected: treating an empty old-graph response as successful C8 acceptance.
const summaries = [];
async function state(label) {
  const stats = await req({ cmd: "stats" });
  docker(["cp", "tx2-qlever-s1:/data/triplex.update-triples", `${out}/${label}.update-triples`]);
  const count = deltaCount(`${out}/${label}.update-triples`);
  const rss = Number(
    docker([
      "exec",
      "tx2-qlever-s1",
      "sh",
      "-c",
      "awk '/VmRSS/{print $2*1024}' /proc/1/status",
    ]).trim(),
  );
  if (rss > 3 * 1024 ** 3) throw Error("R35 RSS stop at 3GiB");
  return { baseTriples: stats.data["num-triples-normal"], deltaTriples: count, rss };
}
async function measure(label) {
  // [EXP-QG1] Why: persist an N=0 envelope with an empty update. Rejected: assuming
  // an absent file proves zero changes (it could also mean persistence is disabled).
  await req({ update: "INSERT DATA {}" });
  const before = await state(label + "-before"),
    results = {};
  for (const [name, query] of Object.entries(queries)) {
    results[name] = [];
    for (const cache of ["cold", "warm"]) {
      if (cache === "cold") await req({ cmd: "clear-cache" });
      const r = await req({ query });
      results[name].push(qleverLatencyReceipt({ writer: "qg1-sample/1",
        qleverConnectionMode: r.qleverConnectionMode,
        cache,
        id: r.id,
        ms: r.ms,
        rows: r.data?.res?.length,
        answerSha256: hash(JSON.stringify(r.data?.res)),
        tree: r.data?.runtimeInformation?.query_execution_tree,
      }));
    }
  }
  const env = {
    ...process.env,
    QLEVER_URL: "http://127.0.0.1:7071",
    QLEVER_INTEGRATION: "1",
    XTDB_INTEGRATION: "0",
  };
  delete env.C8_READERS;
  delete env.C8_LOAD_MS;
  delete env.TRIPLEX_COMMIT_ENCODING;
  const control = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules/vitest/vitest.mjs"),
      "run",
      "test/c8-reads-never-write.test.ts",
      "-t",
      "C8 on QLever",
    ],
    {
      cwd: path.resolve("packages/qualification"),
      env,
      encoding: "utf8",
      timeout: 360000,
      maxBuffer: 32 << 20,
    },
  );
  fs.writeFileSync(`${out}/${label}-c8.log`, (control.stdout ?? "") + (control.stderr ?? ""));
  const p4 = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules/tsx/dist/cli.mjs"),
      path.resolve("lab/experiments/EXP-QG1-qlever-generations/p4-sample.ts"),
      `${seedDir}/manifest.json`,
      `${out}/${label}-p4.json`,
    ],
    { env, encoding: "utf8", timeout: 300000, maxBuffer: 8 << 20 },
  );
  fs.writeFileSync(`${out}/${label}-p4.log`, (p4.stdout ?? "") + (p4.stderr ?? ""));
  const after = await state(label + "-after");
  const summary = qleverLatencyReceipt({ writer: "qg1-cell/1",
    qleverConnectionMode: "keep-alive",
    label,
    arm,
    binding,
    before,
    after,
    results,
    p4: { connectionMode: requireQleverConnectionMode(env.TRIPLEX_QLEVER_CONNECTION_MODE ?? "keep-alive"), status: p4.status, signal: p4.signal, error: p4.error?.message },
    c8: {
      status: control.status,
      signal: control.signal,
      error: control.error?.message,
      testSha256: hash(fs.readFileSync("packages/qualification/test/c8-reads-never-write.test.ts")),
      readers: 8,
      loadMs: 8000,
    },
    touchedBlockDelta: {
      status: "UNAVAILABLE exact counters; runtime estimate gauge retained, includes base rows",
    },
    verdict: "DIAGNOSTIC: no production performance admission or P4/Q89i qualification",
  });
  save(`${label}.json`, summary);
  summaries.push(summary);
  save("summary.json", summaries);
  console.log(
    JSON.stringify(qleverLatencyReceipt({
      qleverConnectionMode: "keep-alive",
      label,
      arm,
      delta: before.deltaTriples.total,
      c8: control.status,
      baseMs: results.base[0].ms,
      joinMs: results.join[0].ms,
    })),
  );
}
for (const target of [0, 10000, 30000, 100000, 300000, 1000000, 1500000]) {
  // [EXP-QG1] Why: label the injected target separately from C8 writer changes.
  // Rejected: calling the observed engine delta exactly N after controls mutate it.
  while (k < target) {
    let triples = [],
      n = 0;
    while (n < 25000 && k < target) {
      const r = rowFor(rowIndex++);
      const fields = encodedRowFields(r);
      for (const [p, o] of fields)
        triples.push(`${assertion(r.id)} <urn:triplex:field:${p}> ${o} .`);
      n += fields.length;
      k += fields.length;
    }
    const r = await req({ update: `INSERT DATA { GRAPH ${graph} { ${triples.join("\n")} } }` });
    if (r.data?.operations?.[0]?.["delta-triples"]?.after == null)
      throw Error("missing update delta counts");
    const fillRss = Number(
      docker([
        "exec",
        "tx2-qlever-s1",
        "sh",
        "-c",
        "awk '/VmRSS/{print $2*1024}' /proc/1/status",
      ]).trim(),
    );
    if (fillRss > 3 * 1024 ** 3) throw Error("R35 fill RSS stop at 3GiB");
  }
  await measure(`N${target}`);
}
// [EXP-QG1] Why: a literal guarded update exercises F05 without IRI()/BIND
// construction. Rejected: treating any successful rebuild as proof of this update.
await req({
  update: 'INSERT DATA { GRAPH <urn:qg1:f05> { <urn:qg1:f05> <urn:qg1:marker> "before" } }',
});
await req({
  update:
    'DELETE { GRAPH <urn:qg1:f05> { <urn:qg1:f05> <urn:qg1:marker> "before" } } INSERT { GRAPH <urn:qg1:f05> { <urn:qg1:f05> <urn:qg1:marker> "after" } } WHERE { GRAPH <urn:qg1:f05> { <urn:qg1:f05> <urn:qg1:marker> "before" } }',
});
const f05query = "SELECT ?v WHERE { GRAPH <urn:qg1:f05> { <urn:qg1:f05> <urn:qg1:marker> ?v } }";
const f05before = await req({ query: f05query });
const before = await req({ query: queries.join });
const rebuilt = await req({ cmd: "rebuild-index" });
const after = await req({ query: queries.join });
const f05after = await req({ query: f05query });
save("f05.json", qleverLatencyReceipt({ writer: "qg1-f05/1", qleverConnectionMode: "keep-alive",
  before: f05before,
  after: f05after,
  expected: "after",
  observedContentMatches:
    JSON.stringify(f05before.data?.res) === JSON.stringify(f05after.data?.res) &&
    f05after.data?.res?.length === 1 &&
    f05after.data.res[0][0] === '"after"',
  verdict: "DIAGNOSTIC: literal guarded update/rebuild sample only",
}));
save("rebuild.json", {
  before,
  rebuilt,
  after,
  sampledIdentity: JSON.stringify(before.data?.res) === JSON.stringify(after.data?.res),
  verdict: "DIAGNOSTIC only",
});
await measure("rebuilt");
