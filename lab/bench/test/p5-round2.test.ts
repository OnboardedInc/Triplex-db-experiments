import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { memoryComposition, forkMemoryScope, dropMemoryScope } from "../lib/memory.ts";
import { W0, V_W0, triplexValue, worldOf } from "../lib/w0-world.ts";
import { seedW0 } from "../lib/w0-seed.ts";
import { readW0Fingerprint, fingerprintSweep, FingerprintRefusal } from "../lib/w0-fingerprint.ts";
import { recoverSweep } from "../lib/sweep-recovery.ts";
import { subjectList, Controller, runW0Sweep } from "../lib/sweep.ts";
import { applyW0Trace, trafficArm, ratioSummary, waitUntil } from "../lib/w0-traffic.ts";
const dir = () => fs.mkdtempSync(path.join(os.tmpdir(), "p5-r2-"));
test("shared G0 reads every subject and refuses altered digest/count/binding/partial/deadline", async () => {
  const scope = randomUUID(),
    comp = memoryComposition("xtdb", scope),
    seed = await seedW0(comp, 50, path.join(dir(), "seed.ndjson")),
    basis = { position: seed.basis.tx, validAt: V_W0 };
  const expected = {
    ...(await readW0Fingerprint(comp, 50, basis, new AbortController().signal)),
    N: 50,
  };
  const input = { endpoint: `memory://${scope}`, scope, basis, expected, counts: seed.counts };
  assert.equal((await fingerprintSweep(input)).status, "complete-and-matching");
  await assert.rejects(
    fingerprintSweep({ ...input, expected: { ...expected, worlds: "sha256:" + "0".repeat(64) } }),
    FingerprintRefusal,
  );
  await assert.rejects(
    fingerprintSweep({ ...input, counts: { ...seed.counts, position: 1 } }),
    FingerprintRefusal,
  );
  await assert.rejects(
    fingerprintSweep(input, async () => ({
      endpoint: "other",
      scope,
      comp,
      close: async () => {},
    })),
    /binding/,
  );
  await assert.rejects(
    fingerprintSweep(input, async () => ({
      endpoint: input.endpoint,
      scope,
      comp: {
        ...comp,
        sweepPage: async () => ({
          rows: [],
          position: basis.position,
          epoch: "empty",
          roundTrips: 1,
        }),
      },
      close: async () => {},
    })),
    /mismatch/,
  );
  await assert.rejects(
    fingerprintSweep({ ...input, deadlineMs: 5 }, async () => ({
      endpoint: input.endpoint,
      scope,
      comp: { ...comp, sweepPage: () => new Promise(() => {}) },
      close: async () => {},
    })),
    /deadline|aborted/,
  );
});
test("COW offline arms preserve source and sibling facts across scalar retirement and insertion", async () => {
  const scope = randomUUID(),
    source = memoryComposition("xtdb", scope);
  const r = await source.transact(
    [
      {
        op: "assert",
        entityId: "pl:a",
        attribute: "weeklyMinutes",
        value: triplexValue("weeklyMinutes", 2400),
        validFrom: 0,
      },
    ],
    {},
  );
  assert.ok(r.ok);
  const a = forkMemoryScope(scope, scope + ":a"),
    b = forkMemoryScope(scope, scope + ":b");
  await a.transact(
    [
      { op: "retract", id: r.value.triples[0].id },
      {
        op: "assert",
        entityId: "pl:a",
        attribute: "weeklyMinutes",
        value: triplexValue("weeklyMinutes", 3000),
        validFrom: 0,
      },
    ],
    {},
  );
  for (const c of [source, b])
    assert.equal(
      worldOf("pl:a", (await c.sweepPage(["pl:a"], { position: 1, validAt: V_W0 })).rows).facts[0]
        .v,
      2400,
    );
  assert.equal((await source.storeCounts()).assertions, 1);
  dropMemoryScope(scope + ":a");
  dropMemoryScope(scope + ":b");
});
test("G4 ten actual abrupt controller exits resume a 650-subject sweep without visible duplicates", async () => {
  const scope = randomUUID(),
    comp = memoryComposition("xtdb", scope);
  for (const s of subjectList(650)) {
    const r = await comp.transact(
      [
        {
          op: "assert",
          entityId: s,
          attribute: "weeklyMinutes",
          value: triplexValue("weeklyMinutes", 2400),
          validFrom: 0,
        },
      ],
      {},
    );
    assert.ok(r.ok);
  }
  const activation = await comp.transact(
    [
      {
        op: "assert",
        entityId: "p5:tenant",
        attribute: "p5/activation",
        value: { type: "string", value: W0.R2.hash },
        validFrom: V_W0,
      },
    ],
    {},
  );
  assert.ok(activation.ok);
  const result = await recoverSweep({
    comp,
    scope,
    subjects: subjectList(650),
    basis: { position: activation.value.position, validAt: V_W0 },
    activations: [
      { tx: activation.value.position, from: W0.POPULATION_VALID_TIME, release: W0.R2.hash },
    ],
    cursor: path.join(dir(), "cursor.json"),
    sweepId: "g4-" + scope,
    seed: "actual-stops",
  });
  assert.equal(result.status, "PASS");
  assert.equal(result.processes.filter((p) => p.stopped && p.signal === "SIGKILL").length, 10);
  assert.equal(result.complete, true);
  assert.equal(result.retries, 5);
  assert.equal(result.referencePublication, false);
  assert.equal(result.publications, 11);
});
test("controller counts consecutive breaches during hold; stopped limit resumes after guard", () => {
  const c = new Controller(4),
    s = { queueMs: 1, baselineP99: 10, readRatio: 1.51, commitRatio: 1 };
  assert.equal(c.update(s, 0), 2);
  assert.equal(c.update(s, 100), 0);
  assert.equal(c.update({ ...s, readRatio: 1 }, 1200), 1);
});
test("mapped scalar commands replace atomically and resend resolves the original position", async () => {
  const comp = memoryComposition("xtdb", randomUUID());
  const ev: any = {
    seq: 1,
    subject: 0,
    kind: "person",
    atMs: 1,
    facts: 5,
    correction: false,
    ackLoss: true,
    resend: false,
  };
  const a = await applyW0Trace(comp, ev),
    b = await applyW0Trace(comp, { ...ev, resend: true });
  assert.equal(b.duplicate, true);
  assert.equal(a.receipt.position, b.receipt.position);
  const c = await applyW0Trace(comp, { ...ev, seq: 2 });
  const world = worldOf(
    W0.placementId(0),
    (await comp.sweepPage([W0.placementId(0)], { position: c.receipt.position, validAt: V_W0 + 2 }))
      .rows,
  );
  assert.equal(world.facts.filter((f) => f.a === "weeklyMinutes").length, 1);
  assert.equal(world.facts.find((f) => f.a === "weeklyMinutes")!.v, 1200);
});
test("ratio computation refuses no samples; insufficient command/round evidence stays INCONCLUSIVE", () => {
  const arm = {
    read: { p99: 10 },
    commit: { p99: 20, count: 10 },
    trace: { durationS: 100 },
    windowValid: true,
    sweepWallMs: 50,
  };
  const rounds = Array.from({ length: 8 }, () => ({
    kind: "burst",
    aa: false,
    baseline: arm,
    sweep: { ...arm, read: { p99: 12 } },
  }));
  const r = ratioSummary(rounds, "ratios");
  assert.equal(r.groups.burst.read.status, "HOLDS");
  assert.equal(r.groups.burst.commit.status, "INCONCLUSIVE");
  assert.equal(r.groups.burst.read.geometricMean, 1.2);
  assert.throws(() =>
    ratioSummary([{ kind: "steady", baseline: arm, sweep: { ...arm, read: { p99: NaN } } }], "bad"),
  );
});
test("64 live readers overlap real mapped writer progress and controller-fed sweep", async () => {
  const scope = randomUUID(),
    comp = memoryComposition("xtdb", scope);
  await seedW0(comp, 50, path.join(dir(), "seed.ndjson"));
  const result = await trafficArm({
    comp,
    scope,
    N: 50,
    dir: dir(),
    id: "traffic",
    seed: "traffic-test",
    durationS: 2,
    traceOffsetS: 120,
    workers: 2,
    controllerOn: true,
    sweep: true,
    release: "R2",
    baseline: { read: 50, commit: 50 },
  });
  assert.equal(result.readers, 64);
  assert.ok(result.read.count > 64);
  assert.equal(result.trace.committed, result.trace.offered);
  assert.ok(result.trace.committed > 0);
  assert.equal(result.sweepComplete, true);
  assert.ok(result.controller.windows.length > 0);
});

test("paused workers exit when the admitted worker drains remaining pages", async () => {
  const scope = randomUUID(),
    comp = memoryComposition("xtdb", scope);
  for (const s of subjectList(650))
    await comp.transact(
      [
        {
          op: "assert",
          entityId: s,
          attribute: "weeklyMinutes",
          value: triplexValue("weeklyMinutes", 2400),
          validFrom: 0,
        },
      ],
      {},
    );
  const controller = new Controller(2);
  controller.limit = 1;
  const result = await runW0Sweep({
    comp,
    composition: "memory",
    lane: "xtdb",
    scope,
    subjects: subjectList(650),
    basis: { position: 650, validAt: V_W0 },
    sweepId: scope,
    cursor: path.join(dir(), "cursor.json"),
    workers: 2,
    controller,
    signal: AbortSignal.timeout(5000),
    onPage: async () => {},
  });
  assert.equal(result.complete, true);
  assert.equal(result.published.length, 11);
});

test("fractional offer deadlines are checked against the monotonic clock", async () => {
  let now = 0,
    calls = 0;
  await waitUntil(
    1.5,
    () => now,
    async (ms) => {
      calls++;
      now += Math.floor(ms);
    },
  );
  assert.ok(now >= 1.5);
  assert.equal(calls, 2);
});
test("G4 refuses publication without activation records", async () => {
  const scope = randomUUID();
  await assert.rejects(
    recoverSweep({
      comp: memoryComposition("xtdb", scope),
      scope,
      subjects: subjectList(650),
      basis: { position: 0, validAt: V_W0 },
      cursor: path.join(dir(), "missing.json"),
      sweepId: scope,
      seed: "missing",
    }),
    /activation/,
  );
});
test("steady scheduled commands never record negative offer-to-ACK latency", async () => {
  const scope = randomUUID(),
    comp = memoryComposition("xtdb", scope);
  await seedW0(comp, 50, path.join(dir(), "seed.ndjson"));
  const d = dir();
  const r = await trafficArm({
    comp,
    scope,
    N: 50,
    dir: d,
    id: "steady",
    seed: "steady-offer-1",
    durationS: 5,
    traceOffsetS: 0,
    workers: 1,
    controllerOn: false,
    sweep: false,
    release: "R1",
  });
  assert.ok(r.commit.count > 0);
  for (const line of fs.readFileSync(r.rawWrites, "utf8").trim().split("\n")) {
    const x = JSON.parse(line);
    assert.ok(x.ackAtMs >= x.scheduledAtMs);
  }
});
