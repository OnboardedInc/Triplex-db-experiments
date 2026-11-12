import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { stripTypeScriptTypes } from "node:module";
import * as api from "../../../../packages/datomic/dist/index.js";
import { decodeReplicaRows } from "../../../../packages/datomic/dist/replica/decodeRows.js";
import { decodeEntity, reachResponse } from "../../../../packages/datomic/dist/reach.js";
import { ReplicaReader, prepareEntity } from "../../../bench/lib/replica-reads.ts";
import { observe } from "../../../bench/lib/observe.ts";

// [DX-R3] Why: run the old and corrected production readers/checkers on the same recorded cut, without an engine lease.
// Rejected: presenting a single-thread quiescent recording rate as the live 10k concurrent-reader ladder.
const source = (file: string) => execFileSync("git", ["show", `794b034b:${file}`], { encoding: "utf8" });
const moduleUrl = (code: string) => "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(code, { mode: "transform" })).toString("base64");
const oldPackedUrl = moduleUrl(source("packages/datomic/src/replica/packed.ts"));
const oldPacked = await import(oldPackedUrl);
const oldRecent = await import(moduleUrl(source("packages/datomic/src/replica/RecentReads.ts").replaceAll('"./packed.js"', JSON.stringify(oldPackedUrl))));
const oldObserveUrl = new URL("../../../bench/lib/observe.ts", import.meta.url).href;
const oldObserve = observe;
(globalThis as any).__DXR3_RATE_API = { ...api, RecentReads: oldRecent.RecentReads, unpackEntity: oldPacked.unpackEntity };
const oldReader = await import(moduleUrl(source("lab/bench/lib/replica-reads.ts")
  .replace('"effect"', JSON.stringify(import.meta.resolve("effect")))
  .replace('"./triplex.ts"', JSON.stringify(new URL("../../../bench/lib/triplex.ts", import.meta.url).href))
  .replace('"./observe.ts"', JSON.stringify(oldObserveUrl))
  .replace('const api = await import(pathToFileURL(`${REPO}/packages/datomic/dist/index.js`).href);', 'const api = globalThis.__DXR3_RATE_API;')));
delete (globalThis as any).__DXR3_RATE_API;
const directory = process.argv[2], count = Number(process.env.DX_R3_OFFLINE_READS ?? 200000);
if (!directory || !Number.isSafeInteger(count) || count < 1000) throw Error("Usage: full-row-rate.ts <recorded-pages>");
const requests = fs.readdirSync(directory).filter(name => /^request-\d+\.json$/.test(name))
  .map(name => ({ n: Number(name.match(/\d+/)![0]), body: JSON.parse(fs.readFileSync(`${directory}/${name}`, "utf8")) })).sort((a,b) => a.n-b.n);
const basis = requests.find(x => x.body.rowPage && !x.body.need)!.body.basis;
const entities = new Map<string, ReturnType<typeof decodeEntity>>();
const bodies = new Map<string, { revision: number; rows: ReturnType<typeof decodeReplicaRows> }>();
const roots = new Set<string>();
for (const { n, body } of requests) if (body.rowPage && !body.need && body.basis.recordedPosition === basis.recordedPosition) {
  for (const root of body.roots) roots.add(root);
  const wire = JSON.parse(gunzipSync(fs.readFileSync(`${directory}/response-${n}.json.gz`)).toString());
  for (const [id, revision, rows] of wire.entities) if (!entities.has(id)) {
    entities.set(id, decodeEntity(id, revision, rows)); bodies.set(id, { revision, rows: decodeReplicaRows(id, revision, rows, basis.recordedPosition) });
  }
}
assert.equal(roots.size, 1000);
const before = new oldReader.ReplicaReader(), after = new ReplicaReader();
for (const [reader, pack, prepare] of [[before, oldPacked.packEntity, oldReader.prepareEntity], [after, api.packEntity, prepareEntity]] as const) {
  reader.apply({ reset: true, valid: true, position: basis.recordedPosition,
    changes: [...bodies].map(([id, { revision, rows }]) => [id, undefined, prepare(id, pack(revision, rows))]) });
}
const rootList = [...roots];
const expectations = rootList.map(root => {
  const triples = reachResponse(root, entities, basis).triples;
  const result = { triples, entities: 0, depth: 0, roundTrips: 1, route: "source", language: "recorded", waitedMs: 0 };
  return [oldObserve(result), observe(result)];
});
for (const [reader, check, arm] of [[before, oldObserve, 0], [after, observe, 1]] as const) {
  for (let i=0; i<rootList.length; i++) assert.deepEqual(check(await reader.pullAt(rootList[i], basis, async () => { throw Error("fallback"); })), expectations[i]![arm]);
  const cpu = process.cpuUsage(), start = performance.now();
  for (let i=0; i<count; i++) {
    const k = i % rootList.length, result = await reader.pullAt(rootList[k], basis, async () => { throw Error("fallback"); });
    const actual = check(result), expected = expectations[k]![arm];
    if (actual.digest !== expected.digest || actual.stamp !== expected.stamp || actual.facts !== expected.facts || actual.stamps !== expected.stamps || actual.bytes !== expected.bytes) throw Error(`Wrong offline read ${arm}/${i}`);
    if ((i + 1) % 256 === 0) await new Promise<void>(resolve => setImmediate(resolve));
  }
  const elapsed = performance.now()-start, used = process.cpuUsage(cpu);
  console.log(JSON.stringify({ kind: "offline-recorded-reader-rate", arm: arm === 0 ? "794b034b-full-row-check" : "p8-full-row-memo", reads: count, differences: 0,
    wallMs: elapsed, readsPerS: count*1000/elapsed, clientCpuMsPerPull: (used.user+used.system)/1000/count,
    subjects: roots.size, position: basis.recordedPosition, memory: process.memoryUsage(), note: "single host thread, yield every 256 reads, quiescent historical W0 cut, no engine, no writer, not the 10k ladder" }));
}
