import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import { setImmediate as nextTurn } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import {
  batchSize,
  clock,
  firstValid,
  fixture,
  fixtureRows,
  intent,
  person,
  seedHead,
  seedPosition,
  txId,
  width,
} from "./population.ts";
import { RecentReads, Replica } from "../../../../packages/datomic/dist/index.js";
import { BootstrapStatsSlabs, prepareEntity } from "../../../bench/lib/replica-reads.ts";
import { FullRowModel } from "../../../bench/lib/full-row-model.ts";

const [role, rung, output] = process.argv.slice(2);
const size = Number(rung);
assert(
  ["reader", "touched-reader", "current-map", "model"].includes(role!) &&
    Number.isSafeInteger(size) &&
    size > 0 &&
    size % 50 === 0 &&
    output,
);
assert(global.gc, "Use --expose-gc");
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const inputs = Object.fromEntries(
  [
    "lab/experiments/EXP-DX1/thin1/population.ts",
    "lab/experiments/EXP-DX1/thin1/profile.ts",
    "lab/bench/lib/full-row-model.ts",
    "lab/bench/lib/replica-reads.ts",
    "lab/bench/lib/canonical.ts",
    "packages/datomic/dist/replica/Replica.js",
    "packages/datomic/dist/replica/RecentReads.js",
    "packages/datomic/dist/replica/packed.js",
    "packages/datomic/dist/replica/sharedIndex.js",
  ].map((path) => [path, sha(fs.readFileSync(root + path))]),
);
const snapshot = () => {
  for (let i = 0; i < 3; i++) global.gc!();
  const { rss, heapUsed, arrayBuffers } = process.memoryUsage();
  return { rss, heapUsed, arrayBuffers };
};
const base = seedHead(size),
  touched = size / 50;
const initial = snapshot();
const measurements: Record<string, unknown> = { initial };
if (role === "current-map") {
  const data = fixture(size),
    replica = new Replica(data.source, firstValid + 1000);
  await replica.bootstrap(
    Array.from({ length: size }, (_, n) => person(n)),
    base,
  );
  const cut = await replica.snapshotAt(base),
    index = new RecentReads(),
    seedEntries = cut.image().entities.map(([id, e]) => [id, undefined, e] as const);
  await nextTurn();
  measurements.packedOnly = snapshot();
  // [DX-THIN1] Why: stage the actual current Map against the same already-resident packed backing.
  // Rejected: counting the backing slabs twice or assigning the replica's entire RSS to Map nodes.
  index.apply({
    position: base,
    valid: true,
    reset: true,
    changes: seedEntries,
  });
  await nextTurn();
  measurements.withCurrentMap = snapshot();
  replica.onUpdate = (update) => index.apply(update);
  data.writes(touched);
  while (replica.position < base + touched) await replica.followOnce();
  measurements.withHistory = { ...snapshot(), historyBytes: index.historyBytes };
  assert.equal(
    index.pull(person(0), { recordedPosition: base + touched, validAt: firstValid + 1000 })?.rows
      .length,
    width + 1,
  );
  const activeCut = await replica.snapshotAt(base + touched),
    activeIndex = new RecentReads(),
    activeEntries = activeCut.image().entities.map(([id, e]) => [id, undefined, e] as const);
  await nextTurn();
  measurements.activePackedOnly = snapshot();
  activeIndex.apply({
    position: base + touched,
    valid: true,
    reset: true,
    changes: activeEntries,
  });
  await nextTurn();
  measurements.activeWithCurrentMap = snapshot();
  assert.equal(
    activeIndex.pull(person(0), { recordedPosition: base + touched, validAt: firstValid + 1000 })
      ?.rows.length,
    width + 1,
  );
  assert(replica.bytes > 0 && cut.bytes > 0 && activeCut.bytes > 0 && index.historyBytes > 0);
  assert.equal(seedEntries.length, 4 * size);
  assert.equal(activeEntries.length, seedEntries.length);
} else if (role !== "model") {
  const sparse = role === "touched-reader";
  const data = fixture(size),
    index = new RecentReads(),
    replica = new Replica(data.source, firstValid + 1000, sparse ? "touched" : "all");
  replica.onAdmission = (p, entries) =>
    index.admit(p, new Map(Array.from(entries, ([id, e]) => [id, prepareEntity(id, e)])));
  let stats = 0;
  replica.onUpdate = (delta) => {
    const slabs = delta.reset ? new BootstrapStatsSlabs() : undefined;
    index.apply(delta, (id, entity) => {
      const prepared = prepareEntity(id, entity, slabs);
      if (delta.reset) stats += prepared.additionalBytes;
      return prepared;
    });
  };
  await replica.bootstrap(sparse ? [] : Array.from({ length: size }, (_, i) => person(i)), base);
  const readMemory = () => ({
    ...snapshot(),
    packedBytes: replica.bytes,
    historyBytes: index.historyBytes,
    requests: data.requests(),
  });
  measurements.seed = {
    ...readMemory(),
    seedPreparedBytes: stats,
    seedSharedIndexBytes: (await replica.snapshotAt(base)).sharedImage().shared!.index.byteLength,
  };
  for (let n = 0; n < touched; n++) {
    if (sparse) assert(await replica.admit(person(n * 50), base, firstValid + 1000));
    assert.equal(
      index.pull(person(n * 50), { recordedPosition: base, validAt: firstValid + 1000 })?.rows
        .length,
      width,
    );
  }
  data.writes(touched);
  while (replica.position < base + touched) await replica.followOnce();
  measurements.touched = readMemory();
  assert.equal(
    index.pull(person(0), { recordedPosition: base + touched, validAt: firstValid + 1000 })?.rows
      .length,
    width + 1,
  );
} else {
  const model = new FullRowModel(true);
  for (let lo = 0; lo < size; lo += batchSize) {
    const p = seedPosition(lo),
      people = Array.from({ length: Math.min(batchSize, size - lo) }, (_, n) => lo + n);
    model.add(
      people.flatMap((i) => intent(i)),
      {
        position: p,
        instant: clock(p),
        txId: txId(p),
        triples: people.flatMap((i) => fixtureRows(i, p)),
      },
      "import",
    );
  }
  measurements.seed = snapshot();
  for (let n = 0; n < touched; n++) {
    const i = n * 50,
      p = base + n + 1;
    model.add(
      intent(i, true),
      { position: p, instant: clock(p), txId: txId(p), triples: fixtureRows(i, p, true) },
      "import",
    );
  }
  measurements.touched = snapshot();
  assert.equal(model.summary(0, clock(base + touched), firstValid + 1000).facts, width + 1);
}
// [DX-THIN1] Why: retain separate post-GC resident and logical bytes with run, build and guest identities.
// Rejected: calling a fixture a live storage measurement or interpreting allocator high water as retained facts.
const result = {
  kind: "thin-wire-fixture-component-measurement",
  attempt: randomUUID(),
  source: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  inputs,
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  boot:
    process.platform === "linux"
      ? fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim()
      : null,
  role,
  size,
  seedFacts: width * size,
  touched,
  afterFacts: width * size + touched,
  measurements,
};
fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify({ role, size, measurements }));
