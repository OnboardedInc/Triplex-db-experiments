import { setImmediate as nextTurn } from "node:timers/promises";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { Replica, RecentReads } from "../../../../packages/datomic/dist/index.js";
import { fixture, fixtureRows, firstValid, person, seedHead } from "../thin1/population.ts";
import { prepareEntity, ReplicaReader } from "../../../bench/lib/replica-reads.ts";
import { measurementWindow } from "../thin1/measure.ts";
const [name, file] = process.argv.slice(2);
assert(global.gc && ["bounded", "unbounded"].includes(name!) && file);
const size = 48000,
  p = seedHead(size),
  v = firstValid + 1000,
  attempt = randomUUID(),
  source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const binding = createHash("sha256")
  .update(
    JSON.stringify([
      source,
      attempt,
      name,
      size,
      process.version,
      fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8"),
      ...[
        "lab/experiments/EXP-DX1/int1/moving.ts",
        "packages/datomic/dist/replica/Replica.js",
        "packages/datomic/dist/replica/RecentReads.js",
        "lab/bench/lib/replica-reads.ts",
      ].map((f) => createHash("sha256").update(fs.readFileSync(f)).digest("hex")),
    ]),
  )
  .digest("hex");
const lease = measurementWindow(binding, "guest-moving-fixture");
const data = fixture(size),
  copy = new Replica(data.source, v, "touched", name === "bounded" ? 2 << 20 : Infinity),
  index = new RecentReads(),
  reader = new ReplicaReader(undefined, index, 1 << 20);
copy.onUpdate = (d) => {
  index.apply(d);
  reader.notify(d.reset);
};
copy.onAdmission = (at, entries) =>
  index.admit(at, new Map([...entries].map(([id, e]) => [id, prepareEntity(id, e)])));
let reads = 0;
const samples = [];
try {
  await lease.checkpoint();
  await copy.bootstrap([], p);
  for (let offset = 0; offset < size * 2; offset++) {
    const i = offset % size;
    if (offset % 32 === 0) await nextTurn();
    const before = index.pull(person(i), { recordedPosition: p, validAt: v });
    if (!before) assert(await copy.admit(person(i), p, v));
    const got = await reader.pullAt(person(i), { recordedPosition: p, validAt: v }, async () => {
      throw Error("Missing read after admission");
    });
    const rows = got.triples;
    const intent = fixtureRows(i, Math.floor(i / 32) + 1);
    assert.deepEqual(
      rows
        .map((r) =>
          JSON.stringify([r.id, r.entityId, r.attribute, r.value, r.validFrom, r.recordedAt]),
        )
        .sort(),
      intent
        .map((r) =>
          JSON.stringify([
            r.id,
            r.entityId,
            r.attribute,
            r.value,
            r.validFrom,
            r.publicMetadata.recordedAt,
          ]),
        )
        .sort(),
    );
    reads++;
    if (reads % 2000 === 0) {
      await lease.checkpoint();
      await nextTurn();
      global.gc();
      await nextTurn();
      global.gc();
      const { rss, heapUsed, arrayBuffers } = process.memoryUsage();
      samples.push({ reads, rss, heapUsed, arrayBuffers, packed: copy.bytes, ...copy.retention });
      if (name === "bounded") assert(copy.retention.bytes <= 2 << 20);
    }
  }
  assert.equal(reads, 96000);
  assert(name === "unbounded" || copy.retention.evictions > 50);
  fs.writeFileSync(
    file,
    JSON.stringify({ binding, source, attempt, size, name, reads, samples }, null, 2) + "\n",
    { flag: "wx" },
  );
} finally {
  lease.release();
  await copy.stop();
}
