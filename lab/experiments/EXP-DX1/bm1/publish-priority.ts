
import { execFileSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rates = [3.5, 23.5, 39.4];
const spacing = 5000;
const fileHash = (file: string) => sha256(readFileSync(file));
const sourcePin = "0196b9952e496c883a24b9ed05ef17fa886dfb00";
const revision = () => execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const driver = () => ({
  runner: fileHash(import.meta.filename),
  clock: fileHash(fileURLToPath(new URL("../../actv-delta/bm1-priority-clock.ts", import.meta.url))),
});
const load = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const cellFiles = ["plan.json", "schedule.json", "observed.json", "deadline-checkpoint.json",
  "screen.json", "reads.ndjson.gz", "replay-inputs.json", "verified.json"];
type Campaign = Awaited<ReturnType<typeof begin>>;

function begin(root: string, n: number, count: number, ownerPath: string) {
  assert.equal(revision(), sourcePin);
  assert.equal(execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" }), "");
  const owner = load(ownerPath);
  assert(owner.source === sourcePin && owner.mode === "exclusive" && owner.endpoint === process.env.DATOMIC_URL);
  const attempt = { source: sourcePin, nonce: randomUUID(), identity: fileHash(ownerPath) };
  const input = { attempt, n, count, issuedAt: Date.now(), timeOrigin: performance.timeOrigin,
    scope: "lazy-bm1-priority-" + attempt.nonce, rates, spacing, driver: driver(),
    gatewayAttempt: process.env.TX2_WRITE_OPTIONS_ATTEMPT };
  assert(input.gatewayAttempt);
  save(join(root, "inputs.json"), input);
  return input;
}

async function verifySeed(target: Target) {
  const { store, fixture } = target;
  const native = createHash("sha256");
  let facts = 0;
  for (let start = 0; start < fixture.n; start += 32) {
    const people = Array.from({ length: Math.min(32, fixture.n - start) }, (_, i) => start + i);
    const rows = await store.rows(people.map(ids.placement), fixture.cut, valid);
    const groups = new Map<number, WorldRow[]>();
    for (const row of rows) {
      const person = subjectOf(row.entityId);
      assert(person !== null && people.includes(person));
      const group = groups.get(person) ?? [];
      group.push(row);
      groups.set(person, group);
    }
    for (const person of people) {
      const group = groups.get(person)!;
      compareSource(group, authoredSeed(person, fixture.seedPosition(person)));
      native.update(canonical(group.map((r) =>
        canonical([r.entityId, r.attribute, r.value, r.position, r.validFrom, r.validTo ?? null])).sort()) + "\n");
      facts += group.length;
    }
    if (start && start % 1600 === 0) console.log(JSON.stringify({ verifiedPeople: start, facts }));
  }
  assert.equal(facts, fixture.facts);
  return { n: fixture.n, facts, cut: fixture.cut, roster: fixture.rosterHash,
    authored: fixture.sourceHash, native: native.digest("hex") };
}

async function produce(root: string, n: number, count: number, ownerPath: string) {
  const input = begin(root, n, count, ownerPath);
  const { attempt, scope } = input;
  const target = await setup(scope, n, input.gatewayAttempt!, "joined-target");
  const ref = new Reference();
  try {
    const native = await liveGateway(scope, input.gatewayAttempt!);
    save(join(root, "native-options.json"), { attempt, native });
    const fixture = target.fixture;
    save(join(root, "seed-loaded.json"), { attempt, scope, n, facts: fixture.facts, cut: fixture.cut,
      roster: fixture.rosterHash, at: Date.now() });
    const census = await verifySeed(target);
    save(join(root, "seed-verified.json"), { attempt, scope, ...census, at: Date.now() });
    console.log(JSON.stringify({ seedVerified: n, factCount: census.facts }));
    const files = ["inputs.json", "seed-loaded.json", "seed-verified.json", "native-options.json"];
    for (const [index, rate] of rates.entries()) {
      console.log(JSON.stringify({ rate, plannedOffers: count }));
      const folder = "cell-" + index;
      await block(join(root, folder), attempt, target, [], "priority", rate, spacing, count, index, ref);
      files.push(...cellFiles.map((file) => folder + "/" + file));
      files.push(...Array.from({ length: count }, (_, offer) => folder + "/offer-" + offer + ".json"));
    }
    assert.equal(revision(), sourcePin);
    assert.deepEqual(driver(), input.driver);
    assert.equal(fileHash(ownerPath), attempt.identity);
    save(join(root, "measurements.json"), { attempt, scope,
      files: Object.fromEntries(files.map((file) => [file, fileHash(join(root, file))])),
    });
  } finally {
    ref.oracle.close();
    await target.store.close();
  }
}

// [DX-BM1] Why: regrade the small and full saved rows against the raw schedule and authored inputs.
// Rejected: interpreting archive creation, a missing offer, a different run's proof or a later release as success.
async function collectPriority(root: string, n: number, count: number, ownerPath: string) {
  const input: Campaign = load(join(root, "inputs.json"));
  const sealed = load(join(root, "measurements.json"));
  const { attempt, scope } = input;
  assert.equal(revision(), sourcePin);
  assert.deepEqual(input.driver, driver());
  assert.equal(attempt.source, sourcePin);
  assert.equal(attempt.identity, fileHash(ownerPath));
  assert.equal(scope, "lazy-bm1-priority-" + attempt.nonce);
  assert.deepEqual([input.n, input.count, input.rates, input.spacing], [n, count, rates, spacing]);
  assert.deepEqual(sealed.attempt, attempt);
  assert.equal(sealed.scope, scope);
  const files = ["inputs.json", "seed-loaded.json", "seed-verified.json", "native-options.json"];
  for (const i of rates.keys()) files.push(...cellFiles.map((f) => "cell-" + i + "/" + f),
    ...Array.from({ length: count }, (_, k) => "cell-" + i + "/offer-" + k + ".json"));
  assert.deepEqual(Object.keys(sealed.files).sort(), files.toSorted());
  for (const file of files) {
    const path = join(root, file);
    assert.equal(fileHash(path), sealed.files[file]);
    assert(statSync(path).mtimeMs >= input.issuedAt - 1000);
  }
  const seed = load(join(root, "seed-verified.json"));
  const loaded = load(join(root, "seed-loaded.json"));
  const native = load(join(root, "native-options.json"));
  for (const record of [seed, loaded, native]) assert.deepEqual(record.attempt, attempt);
  assert.equal(seed.scope, scope);
  assert.equal(loaded.scope, scope);
  assert.deepEqual([seed.n, seed.facts, seed.cut, seed.roster], [n, loaded.facts, loaded.cut, loaded.roster]);
  assert(seed.facts > n && /^[0-9a-f]{64}$/.test(seed.native));
  assert(input.issuedAt <= loaded.at && loaded.at <= seed.at);
  assert(native.native.options.livePriority && native.native.strictRecordClocks && native.native.commitFunctionInstalled);
  assert.equal(native.native.attempt, input.gatewayAttempt);
  const ref = new Reference();
  try {
    const summaries = [];
    for (const [index, rate] of rates.entries()) {
      const folder = join(root, "cell-" + index);
      const plan = load(join(folder, "plan.json"));
      const schedule = load(join(folder, "schedule.json"));
      const observed = load(join(folder, "observed.json"));
      const graded = load(join(folder, "verified.json"));
      for (const record of [plan, schedule, observed, graded]) {
        assert.deepEqual(record.attempt, attempt);
        assert.equal(record.scope, scope);
      }
      assert.deepEqual([schedule.rate, schedule.policy, schedule.spacing, schedule.schedule.length],
        [rate, "priority", spacing, count]);
      assert.deepEqual([graded.rate, graded.policy, graded.spacing, graded.count], [rate, "priority", spacing, count]);
      assert(plan.baseline >= seed.cut && input.timeOrigin + plan.opened >= seed.at - 1);
      const compressed = readFileSync(join(folder, "reads.ndjson.gz"));
      assert.equal(observed.raw, sha256(compressed));
      const reads: RawDecision[] = gunzipSync(compressed).toString().trim().split("\n").map((row) => JSON.parse(row));
      const proof = new Map<string, string>();
      for (const batch of load(join(folder, "replay-inputs.json"))) {
        const accept = [...graded.receiptChecks].reverse().find((r) => r.cut + 1 <= batch.basis.tx);
        assert.deepEqual(batch.document, accept?.marker.document ?? W0.R1.doc);
        assert(batch.basis.tx >= plan.baseline && batch.basis.validTime === valid && batch.old === null && batch.fold === false);
        const expected = JSON.parse(await ref.oracle.call("check", batch));
        assert.equal(expected.length, batch.worlds.length);
        for (const answer of expected) proof.set(batch.basis.tx + "/" + answer.subject, answer.json);
      }
      for (const read of reads) assert.equal(read.raw, proof.get(read.position + "/" + read.id));
      const offers: Entry[] = observed.offers;
      assert.equal(offers.length, count);
      const receiptMap = new Map(graded.receiptChecks.map((check) => [check.id, check]));
      let previous = W0.R1.doc;
      for (const [order, row] of schedule.schedule.entries()) {
        const offer = offers[order]!;
        const ingress = load(join(folder, "offer-" + order + ".json"));
        assert.deepEqual([row.order, row.id, row.scheduled], [order, offer.id, offer.scheduled]);
        assert.equal(row.scheduled, schedule.schedule[0].scheduled + spacing * order);
        assert.deepEqual(ingress, { ...row, ingress: offer.ingress, mode: "record", policy: "priority",
          rate, doc: offer.doc, observation: { attempts: [] } });
        assert(reads.filter((r) => r.offer === order).every((r) => r.id === W0.placementId(n - 1 - order)));
        if (offer.ack) {
          const witness: any = receiptMap.get(offer.id);
          assert(witness && witness.tx === offer.ack.txId && witness.cut === offer.ack.position - 1);
          assert.equal(witness.receipt, sha256(canonical(witness.marker)));
          assert.deepEqual(witness.marker.document, offer.doc);
          assert.deepEqual(witness.marker.old, previous);
          previous = offer.doc;
        } else assert(!receiptMap.has(offer.id));
      }
      assert.equal(plan.saves.length, 1);
      assert.equal(observed.saves.length, 1);
      const saves: SaveReceipt[] = observed.saves[0];
      assert.deepEqual(saves.map((r) => r.scheduled), plan.saves[0].offers.filter((at) => at < observed.stop));
      assert.equal(new Set(saves.map((r) => r.txId)).size, saves.length);
      assert.deepEqual(graded.screen.saves, [screenSaves(plan.saves[0].offers, saves, graded.screen.interval, graded.screen.observedAt)]);
      const clock = scoreClock(offers, reads, paths, "record");
      assert.deepEqual([clock.offers, clock.misses, clock.stale], [graded.schedule, graded.missed, graded.stale]);
      const queue = offers.map((o) => ({ id: o.id, scheduled: o.scheduled, error: o.error ?? null,
        waitingSaves: o.observation.turn?.waitingSaves ?? null,
        waitingForSavesMs: o.observation.turn?.waitingForSavesMs ?? null,
        stage: o.observation.attempts.at(-1) ?? null, durableClock: o.receiptClock ?? null,
      }));
      const treatment = observed.treatment;
      const deadlineTarget = treatment.end + 1000;
      const during = saves.filter((r) => r.scheduled >= treatment.start && r.scheduled < treatment.end);
      summaries.push({ rate, offered: count, missed: clock.misses, stale: clock.stale, first:
        distribution(clock.offers.flatMap((o) => o.firstReadMs === null ? [] : [o.firstReadMs])),
        durable: distribution(clock.offers.flatMap((o) => o.lastOwedMs === null ? [] : [o.lastOwedMs])),
        saveOnlyScreen: graded.screen.saves[0], offers: clock.offers, queue,
        live: { offered: during.length, drained: during.length,
          pendingAtWindowEndPlusOneSec: during.filter((r) => r.ack > deadlineTarget).length,
          ackLatency: distribution(during.map((r) => r.ack - r.scheduled)) },
      });
    }
    return { attempt, scope, seed, loadMinutes: (loaded.at - input.issuedAt) / 60000,
      verifyMinutes: (seed.at - loaded.at) / 60000, cells: summaries };
  } finally {
    ref.oracle.close();
  }
}

const [phase, root, population, repeats] = process.argv.slice(2);
const n = Number(population), count = Number(repeats);
const ownerPath = process.env.TRIPLEX_LAB_SLOT_OWNER!;
assert(root && ownerPath && ((n === 64 && count === 2) || (n === 25000 && count === 30)));
if (phase === "order") {
  const binding = begin(root, n, count, ownerPath);
  await gate(root, binding.attempt, binding.gatewayAttempt);
} else if (phase === "produce") {
  await produce(root, n, count, ownerPath);
} else {
  assert.equal(phase, "collect");
  save(join(root, "collected.json"), await collectPriority(root, n, count, ownerPath));
}
