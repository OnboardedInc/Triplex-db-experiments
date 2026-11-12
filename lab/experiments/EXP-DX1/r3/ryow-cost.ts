import fs from "node:fs";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { packEntity } from "../../../../packages/datomic/dist/index.js";
import { decodeReplicaRows } from "../../../../packages/datomic/dist/replica/decodeRows.js";
import { decodeEntity, reachResponse } from "../../../../packages/datomic/dist/reach.js";
import { ReplicaReader, prepareEntity, replicaReply, restoreReplicaReply } from "../../../bench/lib/replica-reads.ts";
import { readObservation } from "../../../bench/lib/read-observation.ts";
import { observe } from "../../../bench/lib/observe.ts";
// [DX-R3-P8] Why: isolate the shipped full-public-reply and internal-observation costs on identical recorded worlds.
// Rejected: blaming replication for writer-side clone/Option restoration, or using an unchecked synthetic digest.
const dir = process.argv[2]; if (!dir) throw Error("Usage: ryow-cost.ts <recorded pages>");
const requests = fs.readdirSync(dir).filter(n => /^request-\d+\.json$/.test(n)).map(n => ({ n: n.match(/\d+/)![0], body: JSON.parse(fs.readFileSync(`${dir}/${n}`, "utf8")) }));
const basis = requests.find(x => x.body.rowPage && !x.body.need)!.body.basis;
const roots = new Set<string>(), entities = new Map<string, ReturnType<typeof decodeEntity>>();
const packed = new Map<string, ReturnType<typeof packEntity>>();
for (const { n, body } of requests) if (body.rowPage && !body.need && body.basis.recordedPosition === basis.recordedPosition) {
  for (const root of body.roots) roots.add(root);
  const page = JSON.parse(gunzipSync(fs.readFileSync(`${dir}/response-${n}.json.gz`)).toString());
  for (const [id, revision, rows] of page.entities) if (!entities.has(id)) {
    entities.set(id, decodeEntity(id, revision, rows));
    packed.set(id, prepareEntity(id, packEntity(revision, decodeReplicaRows(id, revision, rows, basis.recordedPosition))));
  }
}
const reader = new ReplicaReader();
reader.apply({ reset: true, valid: true, position: basis.recordedPosition, changes: [...packed].map(([id, p]) => [id, undefined, p]) });
const rootList = [...roots], count = 2000;
const expected = new Map(rootList.map(root => [root, observe({ ...reachResponse(root, entities, basis), entities: 0, depth: 0, roundTrips: 1, route: "recorded", language: "gateway", waitedMs: 0 })]));
for (const arm of ["public-world-reply", "internal-observation"] as const) {
  const cpu = process.cpuUsage(), start = performance.now();
  const costs = { serve: 0, followerReply: 0, writerRestore: 0, check: 0 };
  for (let i = 0; i < count; i++) {
    const root = rootList[i % rootList.length]!;
    let t = performance.now();
    const result = await reader.pullAt(root, basis, async () => { throw Error("fallback"); });
    costs.serve += performance.now() - t; t = performance.now();
    const wire = structuredClone(arm === "public-world-reply" ? replicaReply(result) : readObservation(result));
    costs.followerReply += performance.now() - t; t = performance.now();
    const actual = arm === "public-world-reply" ? observe(restoreReplicaReply(wire as any)) : (wire as ReturnType<typeof readObservation>).observed;
    costs.writerRestore += performance.now() - t; t = performance.now();
    assert.deepEqual(actual, expected.get(root));
    costs.check += performance.now() - t;
  }
  const used = process.cpuUsage(cpu);
  console.log(JSON.stringify({ kind: "recorded-ryow-reply-cost", arm, reads: count, subjects: roots.size, position: basis.recordedPosition,
    differences: 0, cpuMsPerRead: (used.user + used.system) / 1000 / count, wallMs: performance.now() - start,
    stagesWallMsPerRead: Object.fromEntries(Object.entries(costs).map(([k, v]) => [k, v / count])),
    note: "single host process, quiescent recorded worlds; clone simulates worker boundary, not a native ladder" }));
}
