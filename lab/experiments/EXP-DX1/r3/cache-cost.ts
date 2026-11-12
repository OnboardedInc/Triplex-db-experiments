import assert from "node:assert/strict";
import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import * as api from "../../../../packages/datomic/dist/index.js";
import { decodeReplicaRows } from "../../../../packages/datomic/dist/replica/decodeRows.js";
import { decodeEntity, reachResponse } from "../../../../packages/datomic/dist/reach.js";
import { ReplicaReader, prepareEntity } from "../../../bench/lib/replica-reads.ts";
import { CutCache } from "../../../bench/lib/cut-cache.ts";
import { observe } from "../../../bench/lib/observe.ts";

// [DX-R3-P9] Why: vary only the existing cache budget against identical recorded full-row worlds and cut churn.
// Rejected: changing production cache behavior before the native writer-arm table, or calling this a 10k live result.
const directory = process.argv[2];
if (!directory || !global.gc) throw Error("Use node --expose-gc --experimental-strip-types cache-cost.ts <recorded-pages>");
console.log(JSON.stringify({kind:"cache-cost-input",directory}));
const count = Number(process.env.DX_R3_CACHE_READS ?? 100000);
assert(Number.isSafeInteger(count) && count > 0);
const requests = fs.readdirSync(directory).filter(name => /^request-\d+\.json$/.test(name))
  .map(name => ({ n: Number(name.match(/\d+/)![0]), body: JSON.parse(fs.readFileSync(`${directory}/${name}`, "utf8")) })).sort((a,b) => a.n-b.n);
const basis = requests.find(x => x.body.rowPage && !x.body.need)!.body.basis;
const entities = new Map<string, ReturnType<typeof decodeEntity>>(), packed = new Map<string, api.PackedEntity>(), roots = new Set<string>();
for (const { n, body } of requests) if (body.rowPage && !body.need && body.basis.recordedPosition === basis.recordedPosition) {
  for (const root of body.roots) roots.add(root);
  const wire = JSON.parse(gunzipSync(fs.readFileSync(`${directory}/response-${n}.json.gz`)).toString());
  for (const [id, revision, rows] of wire.entities) if (!entities.has(id)) {
    entities.set(id, decodeEntity(id, revision, rows));
    packed.set(id, prepareEntity(id, api.packEntity(revision, decodeReplicaRows(id, revision, rows, basis.recordedPosition))));
  }
}
const rootList = [...roots]; assert.equal(rootList.length, 1000);
const expected = rootList.map(root => observe({ triples: reachResponse(root, entities, basis).triples,
  entities: 0, depth: 0, roundTrips: 1, route: "recorded", language: "recorded", waitedMs: 0 }));
const seedPosition = basis.recordedPosition;
const fallback = async (): Promise<never> => { throw Error("unexpected recorded fallback"); };
for (const mib of (process.env.DX_R3_CACHE_MIBS ?? "32,0,8,16,64,0,32").split(",").map(Number)) {
  assert(Number.isSafeInteger(mib) && mib >= 0 && mib <= 512);
  const reader = new ReplicaReader();
  reader.apply({ reset: true, valid: true, position: seedPosition, changes: [...packed].map(([id, value]) => [id, undefined, value]) });
  const cache = new CutCache(mib * 1024 ** 2);
  // [DX-R3-P9] Why: inject an existing cache implementation only in this measurement process.
  // Rejected: adding a runtime strategy or changing the live reader's defaults before bisection.
  (reader as any).worlds = cache;
  global.gc();
  const before = process.memoryUsage(), cpu = process.cpuUsage(), start = performance.now();
  let random = 0x31f9a121, current = seedPosition;
  const next = () => { random ^= random << 13; random ^= random >>> 17; random ^= random << 5; return random >>> 0; };
  for (let i=0; i<count; i++) {
    if (i % 512 === 0) { current++; reader.apply({ reset: false, valid: true, position: current, changes: [] }); }
    const rootIndex = next() % rootList.length;
    const position = next()%100 < 80 ? current : seedPosition + next()%(current-seedPosition+1);
    const result = await reader.pullAt(rootList[rootIndex]!, { ...basis, recordedPosition: position }, fallback);
    const actual = observe(result), want = expected[rootIndex]!;
    if (actual.digest !== want.digest || actual.stamp !== want.stamp || actual.facts !== want.facts || actual.bytes !== want.bytes || actual.stamps !== want.stamps) throw Error(`Wrong cache-cost read ${mib}/${i}`);
    if ((i+1)%256===0) await new Promise<void>(resolve => setImmediate(resolve));
  }
  const elapsed = performance.now()-start, used = process.cpuUsage(cpu);
  cache.releasePromotions(); await new Promise<void>(resolve=>setImmediate(resolve)); global.gc();
  const after = process.memoryUsage(), retainedEntries=cache.diagnostics.entries;
  const stats={...cache.diagnostics}; cache.clear();
  await new Promise<void>(resolve=>setImmediate(resolve)); global.gc();
  const cleared=process.memoryUsage();
  console.log(JSON.stringify({ kind: "recorded-cache-cost", cacheMiB: mib, subjects: rootList.length, reads: count, differences: 0,
    cutUpdates: current-seedPosition, readsPerS: count*1000/elapsed, cpuMsPerRead: (used.user+used.system)/1000/count,
    cache: stats, heapDeltaBytes: after.heapUsed-before.heapUsed,
    measuredCacheHeapBytes: after.heapUsed-cleared.heapUsed, measuredHeapPerEntry: retainedEntries ? (after.heapUsed-cleared.heapUsed)/retainedEntries : null,
    note: "recorded 1k worlds; unrelated empty position advances; one host thread; no native writer; not a concurrency ladder or a 10k performance claim" }));
  cache.clear();
}
