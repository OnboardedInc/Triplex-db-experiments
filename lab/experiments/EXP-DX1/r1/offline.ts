import fs from "node:fs";
import assert from "node:assert/strict";
import { Replica, type ReplicaSource } from "../../../../packages/datomic/dist/index.js";
import { canonical, worldOf, worldCanonical, W0 } from "../../../bench/lib/w0-world.ts";
import { evaluateAll } from "../../../bench/lib/w0-replica.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
// [DX-R1] Why: replay the original raw gateway pages, compare every subject to the original slow-path bytes.
// Rejected: a synthetic 10k extrapolation labelled as a seeded database measurement.
const root =
  process.argv[2] ?? "/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-H6/recorded-pages";
const inputs = Array.from({ length: 16 }, (_, i) => ({
  request: JSON.parse(fs.readFileSync(`${root}/request-${i}.json`, "utf8")),
  response: fs.readFileSync(`${root}/response-${i}.json`, "utf8"),
}));
const byRoots = new Map(inputs.map((p) => [JSON.stringify(p.request.roots), p.response]));
const basis = inputs[0].request.basis;
const subjects: string[] = inputs.flatMap((p) => p.request.roots);
const source: ReplicaSource = {
  head: async () => basis.recordedPosition,
  page: async (roots) => JSON.parse(byRoots.get(JSON.stringify(roots))!),
  feed: async () => ({ head: basis.recordedPosition, transactions: [] }),
};
const replica = new Replica(source, basis.validAt);
const started = performance.now(),
  cpu = process.cpuUsage();
await replica.bootstrap(subjects);
const delta = process.cpuUsage(cpu);
console.log(
  JSON.stringify({
    kind: "bootstrap",
    source: "historical raw H6 recording",
    subjects: subjects.length,
    wallMs: performance.now() - started,
    cpuSeconds: (delta.user + delta.system) / 1e6,
    packedBytes: replica.bytes,
    bytesPerSubject: replica.bytes / subjects.length,
    rss: process.memoryUsage().rss,
  }),
);
let checked = 0;
for (let page = 0; page < inputs.length; page++) {
  const golden = JSON.parse(fs.readFileSync(`${root}/golden-${page}.json`, "utf8"));
  for (const r of golden) {
    assert.equal(worldCanonical(worldOf(r.subject, replica.world(r.subject))), canonical(r.world));
    checked++;
  }
}
console.log(
  JSON.stringify({
    kind: "world-equality",
    compared: checked,
    mismatches: 0,
    position: replica.position,
  }),
);
const single = await evaluateAll({
  replica,
  subjects,
  releases: W0.R2,
  position: replica.position,
});
const oracle = new DomainOracle();
try {
  let checked = 0;
  for (let page = 0; page < inputs.length; page++) {
    const golden = JSON.parse(fs.readFileSync(`${root}/golden-${page}.json`, "utf8"));
    for (const r of golden) {
      const actual = single.records[checked++].candidates[0];
      assert.equal(canonical(actual.output), canonical(r.output));
      assert.equal(canonical(actual.record), canonical(r.record));
      const expected = await oracle.call("evaluate", {
        world: r.world,
        release: "R2",
        basis: { tx: replica.position, validTime: W0.POPULATION_VALID_TIME },
      });
      assert.equal(W0.outputJson(actual.output), expected);
    }
  }
  console.log(
    JSON.stringify({
      kind: "evaluation",
      subjects: checked,
      workers: 4,
      equality: "all outputs and records; independent Python outputs",
      wallMs: single.evaluationWallMs,
      startupMs: single.startupMs,
      cpuSeconds: single.cpuSeconds,
      rate: single.subjectsPerSecond,
      rss: process.memoryUsage().rss,
    }),
  );
} finally {
  await oracle.close();
}
const variant = (id: "OT" | "PAYCHG", key: string, n: number) =>
  W0.compileRelease({
    ...W0.R2.doc,
    rules: W0.R2.doc.rules.map((r) => (r.id === id ? ({ ...r, params: { [key]: n } } as any) : r)),
  });
const multiple = await evaluateAll({
  replica,
  subjects,
  releases: [
    W0.R2,
    variant("OT", "thresholdMinutes", 2700),
    variant("PAYCHG", "thresholdCents", 700),
  ],
  position: replica.position,
});
console.log(
  JSON.stringify({
    kind: "three-candidates",
    subjects: multiple.records.length,
    wallMs: multiple.evaluationWallMs,
    ratio: multiple.evaluationWallMs / single.evaluationWallMs,
    cpuSeconds: multiple.cpuSeconds,
    rss: process.memoryUsage().rss,
  }),
);
