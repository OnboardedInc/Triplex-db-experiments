import fs from "node:fs";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { Replica, decodeSweepRows } from "../../../../packages/datomic/dist/index.js";
import { evaluateAll } from "../../../bench/lib/w0-replica.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import {
  W0,
  canonical,
  worldOf,
  worldCanonical,
  worldSha256,
  reachableRows,
} from "../../../bench/lib/w0-world.ts";

// [DX-R2] Why: a recording can prove packed-input/evaluator equality and byte geometry while engine admission waits.
// Rejected: labelling historical input replay as fresh bootstrap, feed latency, or post-publication database verification.
const directory = process.argv[2],
  N = Number(process.argv[3] ?? 10000);
assert(directory && Number.isSafeInteger(N) && N > 0);
const requests = fs
  .readdirSync(directory)
  .filter((n) => /^request-\d+\.json$/.test(n))
  .map((name) => ({
    n: Number(name.match(/\d+/)![0]),
    body: JSON.parse(fs.readFileSync(`${directory}/${name}`, "utf8")),
  }))
  .sort((a, b) => a.n - b.n);
const pages = requests.filter((r) => r.body.rowPage && !r.body.need).slice(0, Math.ceil(N / 64));
assert.equal(pages.length, Math.ceil(N / 64));
const basis = pages[0]!.body.basis;
assert(pages.every((p) => canonical(p.body.basis) === canonical(basis)));
const subjects: string[] = pages.flatMap((p) => p.body.roots);
assert.equal(subjects.length, N);
assert.equal(new Set(subjects).size, N);
const lookup = new Map(pages.map((p) => [JSON.stringify(p.body.roots), p.n]));
const read = (n: number) =>
  JSON.parse(gunzipSync(fs.readFileSync(`${directory}/response-${n}.json.gz`)).toString("utf8"));
const replica = new Replica(
  {
    head: async () => basis.recordedPosition,
    async page(roots) {
      const n = lookup.get(JSON.stringify(roots));
      assert.notEqual(n, undefined);
      return read(n!);
    },
    async feed() {
      throw new Error("No feed in historical bootstrap replay");
    },
  },
  basis.validAt,
);
(globalThis as any).gc?.();
const initialHeap = process.memoryUsage().heapUsed;
await replica.bootstrap(subjects, basis.recordedPosition);
(globalThis as any).gc?.();
const view = await replica.snapshotAt(basis.recordedPosition),
  image = view.sharedImage();
const bootstrap = {
  initialHeap,
  heapDelta: process.memoryUsage().heapUsed - initialHeap,
  logicalBytes: replica.bytes,
  slabBytes: image.shared!.buffers.reduce((n, b) => n + b.byteLength, 0),
  indexBytes: image.shared!.index.byteLength,
  entities: new DataView(image.shared!.index).getUint32(4, true),
};
console.log(
  JSON.stringify({
    kind: "historical-input-geometry",
    classification: "HISTORICAL_INPUT_DIAGNOSTIC",
    N,
    basis,
    bootstrap,
  }),
);
const result = await evaluateAll({ replica, subjects, releases: W0.R2, view, workers: 3 });
const oracle = new DomainOracle();
let checked = 0;
try {
  for (const page of pages) {
    const rows = decodeSweepRows(read(page.n), page.body.roots, basis);
    assert(rows);
    for (const subject of page.body.roots) {
      const world = worldOf(subject, reachableRows([subject], rows));
      assert.equal(worldCanonical(worldOf(subject, view.world(subject))), worldCanonical(world));
      const record = result.records[checked++]!;
      assert.equal(record.subject, subject);
      assert.equal(record.worldSha256, worldSha256(world));
      const expected = W0.sweepSubject(world, W0.R2, {
        tx: basis.recordedPosition,
        validTime: W0.POPULATION_VALID_TIME,
      });
      if ("error" in expected) throw new Error(expected.error);
      assert.equal(canonical(record.candidates[0]!.record), canonical(expected.record));
      assert.equal(canonical(record.candidates[0]!.output), canonical(expected.output));
      const independent = await oracle.call("evaluate", {
        world,
        release: "R2",
        basis: { tx: basis.recordedPosition, validTime: W0.POPULATION_VALID_TIME },
      });
      assert.equal(W0.outputJson(record.candidates[0]!.output), independent);
    }
  }
  assert.equal(checked, N);
  (globalThis as any).gc?.();
  console.log(
    JSON.stringify({
      kind: "historical-scale-equality",
      classification: "HISTORICAL_INPUT_DIAGNOSTIC",
      N,
      worlds: checked,
      outputs: checked,
      records: checked,
      pythonOutputs: checked,
      bootstrap,
      finalHeap: process.memoryUsage().heapUsed,
      processPeakRss: process.resourceUsage().maxRSS * 1024,
      freshEngine: false,
      feedChecked: false,
      publishedStatesChecked: false,
    }),
  );
} finally {
  await oracle.close();
  await replica.stop();
}
