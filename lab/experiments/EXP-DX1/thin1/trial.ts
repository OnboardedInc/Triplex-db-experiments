import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  RecentReads,
  Replica,
  type ReplicaSnapshot,
} from "../../../../packages/datomic/dist/index.js";
import { canonicalWorld } from "../../../bench/lib/canonical.ts";
import type { Basis } from "../../../bench/lib/composition.ts";
import { buildCase, checkWithOracle, type OracleSampleRead } from "../../../bench/lib/oracle.ts";
import {
  BootstrapStatsSlabs,
  prepareEntity,
  ReplicaReader,
} from "../../../bench/lib/replica-reads.ts";
import { ThinRoster, rosterDigest } from "../../../bench/lib/thin-activation.ts";
import { touchedPull } from "../../../bench/lib/touched-reads.ts";
import { W0, worldOf } from "../../../bench/lib/w0-world.ts";
import { nativeReader } from "./native-reader.ts";
import { nativeMetrics } from "./native-metrics.ts";
import { IntentLog } from "./intent-log.ts";
import { firstValid, person, seedHead, seedPosition, width } from "./population.ts";
import { trialStore } from "./trial-store.ts";
import { sampleObjectCache } from "./cache-metrics.ts";
import { checkEntry } from "./entry-check.ts";
import { measurementWindow } from "./measure.ts";
import { domainCheck } from "./domain-check.ts";

const [kind, mode, rung, dir = ""] = process.argv.slice(2),
  size = Number(rung);
assert(
  (kind === "fixture" || kind === "live") &&
    (mode === "all" || mode === "touched") &&
    Number.isSafeInteger(size) &&
    size >= 50 &&
    size <= 4_000_000 &&
    size % 50 === 0 &&
    dir,
);
assert(global.gc, "Run with --expose-gc");
fs.mkdirSync(dir);
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const source = git("rev-parse", "HEAD"),
  attempt = randomUUID(),
  scope = "dxthin-" + attempt;
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const files = git(
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "--",
  "packages/datomic/src",
  "packages/w0/src",
  "lab/bench/lib",
  "lab/experiments/EXP-DX1/thin1",
  "lab/oracles/replay",
  "lab/oracles/domain",
  "lab/world/W0/releases",
).split("\n");
const built = ["datomic", "w0", "core", "qualification"].flatMap((pkg) => {
  const base = "packages/" + pkg + "/dist";
  return fs
    .readdirSync(path.join(root, base), { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".js"))
    .map((file) => base + "/" + file);
});
const inputs = Object.fromEntries(
  [...files.filter((f) => /\.(ts|mjs|py|json)$/.test(f)), ...built]
    .sort()
    .map((f) => [f, sha(fs.readFileSync(path.join(root, f)))]),
);
const stack =
  kind === "live" ? JSON.parse(fs.readFileSync(process.env.DX_THIN_STACK!, "utf8")) : undefined;
if (stack) {
  assert.equal(stack.writeUrl, process.env.DATOMIC_URL);
  assert.equal(stack.readUrl, process.env.DATOMIC_READ_URLS);
  assert.deepEqual(
    stack.containers.map((c: { name: string }) => c.name).sort(),
    stack.managed
      ? ["tx2-datomic-s1", "tx2-datomic-s2"]
      : ["gw-r", "gw-w", "pg", "tx"].map((role) => stack.prefix + "-" + role).sort(),
  );
  assert(
    stack.containers.every((c: { id: string }) =>
      (stack.managed ? /^(?:[a-f0-9]{12}|[a-f0-9]{64})$/ : /^[a-f0-9]{64}$/).test(c.id),
    ),
  );
}
const slot = stack?.prefix ?? "guest-wire-fixture";
const binding = sha(
  JSON.stringify([source, inputs, slot, stack?.containers, attempt, scope, size, mode]),
);
const save = (name: string, data: unknown) =>
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
save("inputs.json", {
  source,
  inputs,
  slot,
  containers: stack?.containers,
  scope,
  attempt,
  binding,
  size,
  mode,
  kind,
  node: process.version,
  guestBoot:
    process.platform === "linux"
      ? fs.readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim()
      : null,
});
const base = seedHead(size),
  active = size / 50,
  end = base + active,
  validAt = firstValid + 1000;
const lease = measurementWindow(binding, slot);
const store = await trialStore(size, scope, kind === "live");
const log = new IntentLog(path.join(dir, "intents.sqlite"), size, scope);
const roster = new ThinRoster(path.join(dir, "roster.sqlite"), binding);
let remote: Awaited<ReturnType<typeof nativeReader>> | undefined;
let held: ReplicaSnapshot | undefined;
const costOnly = stack?.managed?.cacheDiagnostic === true;
const phase = async (name: string) => {
  global.gc!();
  fs.appendFileSync(
    path.join(dir, "phases.jsonl"),
    JSON.stringify({
      phase: name,
      binding,
      at: Date.now(),
      ...process.memoryUsage(),
      reader: await remote?.stats(),
      native: stack ? await nativeMetrics(stack) : undefined,
      objectCache: costOnly ? await sampleObjectCache(stack) : undefined,
    }) + "\n",
  );
  console.log(name);
};
const ms: Record<string, number[]> = {
  commit: [],
  firstPinnedRead: [],
  firstCurrentAdmission: [],
  residentRead: [],
  ryow: [],
  historical: [],
};
const quantiles = (xs: number[]) => {
  xs.sort((a, b) => a - b);
  return {
    n: xs.length,
    p50: xs[Math.ceil(xs.length * 0.5) - 1],
    p99: xs[Math.ceil(xs.length * 0.99) - 1],
  };
};
const copy = new Replica(
  mode === "all" ? store.inline : store.source,
  Date.parse(W0.POPULATION_VALID_TIME),
  mode,
);
const index = new RecentReads(),
  reader = new ReplicaReader(undefined, index);
copy.onUpdate = (delta) => {
  const slabs = delta.reset ? new BootstrapStatsSlabs() : undefined;
  index.apply(delta, (id, e) => prepareEntity(id, e, slabs));
  reader.notify(delta.reset);
};
copy.onAdmission = (p, entries) =>
  index.admit(p, new Map(Array.from(entries, ([id, e]) => [id, prepareEntity(id, e)])));
const scheduled = async (p: number) => {
  const indices = log.indices(p),
    ops = log.operations(p),
    start = performance.now();
  const receipt = await store.commit(p, indices, p > base, ops);
  if (p > base) ms.commit.push(performance.now() - start);
  log.record(p, ops, receipt);
};
async function drain(after: number, through: number) {
  while (after < through) {
    const limit = Math.min(16, through - after),
      page = await store.feed(after, limit);
    assert(page.length > 0 && page.length <= limit);
    for (const tx of page) {
      assert.equal(tx.position, ++after);
      log.verifyJournal(tx);
      roster.apply(binding, tx);
    }
  }
}
let reads = 0;
const samples: OracleSampleRead[] = [],
  positions: number[] = [],
  sampleInputs = new Set<number>();
async function read(i: number, p: number, v: number, measure: string) {
  const basis = { recordedPosition: p, validAt: v } as Basis;
  const gateway = () => store.pull(person(i), p, v),
    start = performance.now();
  const result = remote
    ? await remote.pull(person(i), p, v)
    : mode === "touched"
      ? await touchedPull(reader, copy, person(i), basis, gateway)
      : await reader.pullAt(person(i), basis, gateway);
  const actual = result.triples;
  ms[measure]!.push(performance.now() - start);
  const expected = log.rows(i, p, v);
  assert.equal(
    canonicalWorld(actual),
    canonicalWorld(expected),
    "Pinned public row or metadata differs at " + i + "/" + p,
  );
  reads++;
  if (i === 0 || i === 50 || i === size - 50) {
    samples.push({
      subject: i,
      basis: { recordedAt: log.command(p).receipt.instant, validAt: v },
      rows: actual.map((r) => [
        r.entityId,
        r.attribute,
        r.value,
        r.validFrom ?? null,
        r.validTo?._tag === "Some" ? r.validTo.value : null,
        r.id,
      ]),
    });
    positions.push(p);
    sampleInputs.add(seedPosition(i));
    if (p >= base + i / 50 + 1) sampleInputs.add(base + i / 50 + 1);
  }
}
async function execute() {
  await lease.checkpoint();
  await phase("empty");
  const seedStart = performance.now();
  for (let p = 1; p <= base; p++) {
    if (p % 16 === 1) await lease.checkpoint();
    await scheduled(p);
    if (p % 16 === 0 || p === base) await drain(roster.head, p);
  }
  const seedMs = performance.now() - seedStart;
  await phase("seeded");
  if (kind === "live" && (mode === "all" || mode === "touched"))
    remote = await nativeReader({
      scope,
      binding,
      mode,
      size,
      position: base,
      instant: log.command(base).receipt.instant,
    });
  else
    await copy.bootstrap(
      mode === "all" ? Array.from({ length: size }, (_, n) => person(n)) : [],
      base,
    );
  const seedPacked = remote ? (await remote.stats()).packed : copy.bytes;
  await phase("reader-ready");
  let capture = -1;
  for (let n = 0; n < active; n++) {
    if (n % 16 === 0) await lease.checkpoint();
    const i = n * 50,
      before = base + n,
      after = before + 1;
    const historical = Math.max(1, before - 1);
    await read(i, historical, validAt, "firstPinnedRead");
    if (n % 2 === 0) await read(i, before, validAt, "firstCurrentAdmission");
    if (n === active - 1) {
      capture = roster.head;
      assert.equal(capture, before);
      if (mode === "all") {
        if (remote) await remote.capture(capture);
        else held = await copy.snapshotAt(capture);
      }
    }
    await scheduled(after);
    await read(i, after, validAt, "ryow");
    await drain(before, after);
    if (remote) await remote.follow(after);
    else while (copy.position < after) await copy.followOnce(0, after);
    await read(i, after, validAt, n % 2 ? "firstCurrentAdmission" : "residentRead");
    await read(i, after, validAt, "residentRead");
    await read(i, historical, validAt, "historical");
    await read(i, after, firstValid + 99, "historical");
  }
  await phase("active");
  const resident = remote
    ? await remote.stats()
    : { position: copy.position, packed: copy.bytes, history: index.historyBytes };
  assert.equal(resident.position, end);
  if (costOnly) {
    assert(kind === "live" && mode === "all");
    lease.release();
    save("cache-cost.json", {
      kind: "separate native cache occupancy diagnostic",
      size,
      source,
      binding,
      slot,
      reads,
      commits: active,
      checkedJournalPositions: roster.head,
      seedPacked,
      activePacked: resident.packed,
    });
    if (size <= 10000) await checkEntry(dir!, stack, source);
    return;
  }
  await drain(0, end);
  const expected = rosterDigest(
    (function* () {
      for (let i = 0; i < size; i++) yield person(i);
    })(),
  );
  assert.equal(capture, end - 1);
  const basis = { tx: capture, validTime: W0.POPULATION_VALID_TIME };
  const outbox = fs.openSync(path.join(dir, "activation-records.jsonl"), "wx");
  const started = performance.now();
  let activation;
  try {
    activation = await roster.activate({
      binding,
      expected,
      release: W0.R2,
      basis,
      mode: mode === "all" ? "full" : "dependencies",
      world:
        mode === "touched"
          ? store.world
          : remote
            ? remote.world
            : async (id, basis) => {
                assert(
                  held &&
                    held.position === basis.tx &&
                    held.validAt === Date.parse(basis.validTime),
                );
                return worldOf(id, held.world(id));
              },
      publish: async (records) => {
        await lease.checkpoint();
        await store.publish?.(records);
        fs.writeFileSync(outbox, records.map((r) => W0.canonicalPlain(r) + "\n").join(""));
      },
    });
    fs.fsyncSync(outbox);
  } finally {
    fs.closeSync(outbox);
  }
  const activationMs = performance.now() - started;
  const verification = createHash("sha256");
  for await (const bytes of fs.createReadStream(path.join(dir, "activation-records.jsonl")))
    verification.update(bytes);
  assert.equal(verification.digest("hex"), activation.recordsSha256);
  assert.equal(activation.evaluated + activation.dismissed, size);
  assert.equal(activation.dismissed, mode === "all" ? 0 : size - (capture - base));
  await phase("activation-recorded");
  lease.release();
  let publishedReadback = 0;
  if (store.readback) {
    const cut = await store.head();
    let page: W0.EvaluationRecord[] = [];
    for await (const line of createInterface({
      input: fs.createReadStream(path.join(dir, "activation-records.jsonl")),
      crlfDelay: Infinity,
    })) {
      const record = JSON.parse(line);
      record.basis.tx = BigInt(record.basis.tx);
      page.push(record);
      if (page.length === 64) {
        await store.readback(page, cut);
        publishedReadback += page.length;
        page = [];
      }
    }
    if (page.length) {
      await store.readback(page, cut);
      publishedReadback += page.length;
    }
    assert.equal(publishedReadback, size);
  }
  const selected = [...sampleInputs].sort((a, b) => a - b).map((p) => log.command(p));
  const caseDoc = buildCase({
    caseId: "dx-thin-" + binding,
    commands: selected,
    lastPosition: end,
    reads: samples,
  });
  // [DX-THIN1] Why: query each expected entity even when the observed closure or its root was empty.
  // Rejected: letting the reader's own references choose the oracle's coverage.
  caseDoc.queries = samples.flatMap((s, n) => {
    const id = person(s.subject);
    return [id, ...[0, 1, 2].map((k) => id + "/ans:" + k)].map((e) => ({
      id: "r" + n + "|" + e,
      kind: "entityTriples",
      entityId: e,
      cut: {
        scope: "s1",
        position: positions[n],
        recordedAt: s.basis.recordedAt,
        validAt: s.basis.validAt,
      },
    }));
  });
  save("observed.json", { binding, samples, positions });
  const pin = "03d86f3346cccd6794487b77293fb56077dd020e";
  const oracleRoot = path.resolve(dir, "replay-source");
  for (const f of git("ls-tree", "-r", "--name-only", pin, "--", "lab/oracles/replay")
    .split("\n")
    .filter((f) => f.endsWith(".py"))) {
    const dest = path.join(oracleRoot, f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, execFileSync("git", ["show", pin + ":" + f], { cwd: root }), {
      flag: "wx",
    });
  }
  const oracle = checkWithOracle({ oracleRoot, dir, caseDoc, reads: samples });
  save("replay-check.json", oracle);
  assert.equal(oracle.status, "PASS");
  assert.equal(oracle.reads, samples.length);
  assert("entityQueries" in oracle);
  assert.equal(oracle.entityQueries, samples.length * 4);
  const domain = await domainCheck(root, dir, size, basis, activation.recordsSha256);
  save("result.json", {
    kind,
    source,
    binding,
    slot,
    size,
    active,
    untouched: size - active,
    seedFacts: size * width,
    seedMs,
    reads,
    ryow: active,
    feedPositions: end,
    replayedPositions: end,
    seedPacked,
    activePacked: resident.packed,
    historyBytes: resident.history,
    latencyMs: Object.fromEntries(Object.entries(ms).map(([k, v]) => [k, quantiles(v)])),
    activationMs,
    activation,
    oracle,
    replaySource: pin,
    measurement: lease.stats(),
    domain,
    publishedReadback: store.readback ? publishedReadback : null,
  });
}
try {
  await execute();
} finally {
  lease.release();
  await remote?.close();
  await copy.stop();
  roster.close();
  log.close();
  await store.close();
}
