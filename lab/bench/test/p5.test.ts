import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { memoryComposition } from "../lib/memory.ts";
import { seedCommands, seedW0 } from "../lib/w0-seed.ts";
import { W0, V_W0, canonical, triplexValue, worldOf, BasisNotAvailable } from "../lib/w0-world.ts";
import { runW0Sweep, subjectList, Controller } from "../lib/sweep.ts";
import {
  requireCounts,
  requireFingerprint,
  equalBytes,
  DomainOracle,
  wireRecord,
  deliveriesWire,
  emptyWireState,
} from "../lib/w0-gates.ts";
import { generateTrace } from "../lib/trace.ts";
import { mapW0Trace } from "../lib/w0-trace.ts";
const directory = () => {
  const root = "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-P5A/round3-fixtures";
  fs.mkdirSync(root, { recursive: true });
  return fs.mkdtempSync(path.join(root, "p5-test-"));
};
test("G0/G9 reject missing, altered, foreign-rung fingerprints and mismatched counts", () => {
  const fp = { basisTx: 4, facts: 10, worlds: "sha256:a", R2: "sha256:b" };
  const oracle = {
    rung: { N: 50 },
    seed: "W0-pop-1",
    sources: { a: "hash" },
    invalidWorlds: [],
    fingerprint: fp,
  };
  requireFingerprint(fp, oracle, 50);
  for (const k of Object.keys(fp))
    assert.throws(() => requireFingerprint({ ...fp, [k]: "changed" }, oracle, 50));
  assert.throws(() => requireFingerprint(fp, oracle, 1000));
  assert.throws(() => requireFingerprint(fp, { ...oracle, sources: {} }, 50));
  requireCounts({ position: 1, assertions: 2 }, { position: 1, assertions: 2 });
  assert.throws(() => requireCounts({ position: 1 }, { position: 2 }));
  assert.throws(() => requireCounts({}, {}));
  assert.throws(() => equalBytes("gate", "", "missing"));
});
test("integer mapping rejects floats and keeps safe cents exact", () => {
  assert.equal(triplexValue("payRateCents", Number.MAX_SAFE_INTEGER).value, "9007199254740991");
  for (const n of [1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => triplexValue("payRateCents", n));
});
test("G7 future/invalid/time-shaped bases refused, including empty page", async () => {
  const c = memoryComposition("xtdb", randomUUID());
  for (const b of [
    { position: 1, validAt: V_W0 },
    { position: -1, validAt: V_W0 },
    { position: 0.5, validAt: V_W0 },
    { position: 0, validAt: NaN },
    { position: 0, validAt: V_W0, recordedAt: 1 },
  ])
    await assert.rejects(c.sweepPage([], b), BasisNotAvailable);
});
test("reference seeder preserves every population world and dense command positions; dirty scope refused", async () => {
  const c = memoryComposition("xtdb", randomUUID()),
    dir = directory();
  const seed = await seedW0(c, 50, path.join(dir, "seed.ndjson"));
  assert.equal(seed.commands, W0.populationBasis(W0.rung(50)).tx);
  for (const p of W0.population(W0.rung(50)))
    assert.equal(
      canonical(
        worldOf(
          p.world.subject,
          (await c.sweepPage([p.world.subject], { position: seed.commands, validAt: V_W0 })).rows,
        ),
      ),
      p.json,
    );
  await assert.rejects(seedW0(c, 50, path.join(dir, "dirty.ndjson")), /fresh/);
  assert.equal([...seedCommands(50)].length, seed.commands);
});
test("G3 Q89i byte identity after retroactive retirement; latest sees change", async () => {
  const c = memoryComposition("xtdb", randomUUID());
  const first = await c.transact(
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
  assert.ok(first.ok);
  const b = { position: 1, validAt: V_W0 };
  const before = worldOf("pl:a", (await c.sweepPage(["pl:a"], b)).rows);
  await c.transact(
    [
      { op: "retract", id: first.value.triples[0].id },
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
  const after = worldOf("pl:a", (await c.sweepPage(["pl:a"], b)).rows);
  assert.equal(canonical(after), canonical(before));
  assert.equal(
    worldOf("pl:a", (await c.sweepPage(["pl:a"], { position: 2, validAt: V_W0 })).rows).facts[0].v,
    3000,
  );
  assert.equal(Object.keys(after.facts[0]).sort().join(","), "a,e,tx,v");
});
test("G4 ten publication-before-checkpoint interruptions resume with deduplicated outbox", async () => {
  const comp = memoryComposition("xtdb", randomUUID()),
    dir = directory(),
    scope = "test";
  const seed = await seedW0(comp, 50, path.join(dir, "seed.ndjson"));
  const options = {
    comp,
    composition: "memory",
    lane: "xtdb" as const,
    scope,
    subjects: subjectList(50),
    basis: { position: seed.commands, validAt: V_W0 },
    sweepId: "resume",
    cursor: path.join(dir, "cursor.json"),
    workers: 1,
  };
  let deliveries: string | undefined,
    retries = 0;
  // [EXP-P5] Why: the critical recovery edge is an ACK before durable cursor; ten new worker lifetimes force that edge. Rejected: only resuming a fully complete cursor (never exercises publication retry).
  for (let i = 0; i < 10; i++)
    await assert.rejects(
      runW0Sweep({
        ...options,
        onPage: async (records) => {
          const result = await comp.publishOutbox(records.map((r) => r.record));
          if (i === 0) {
            assert.equal(result.retry, false);
            deliveries = canonical(result.deliveries);
          } else {
            assert.equal(result.retry, true);
            assert.equal(canonical(result.deliveries), deliveries);
            retries++;
          }
          throw new Error("injected stop after publication ACK");
        },
      }),
      /injected stop/,
    );
  const result = await runW0Sweep({
    ...options,
    onPage: async (records) => {
      const r = await comp.publishOutbox(records.map((r) => r.record));
      assert.equal(r.retry, true);
      assert.equal(canonical(r.deliveries), deliveries);
    },
  });
  assert.equal(result.complete, true);
  assert.equal(retries, 9);
  await assert.rejects(
    runW0Sweep({
      ...options,
      basis: { ...options.basis, position: seed.commands - 1 },
      onPage: async () => {},
    }),
    /binding/,
  );
});
test("G2/G5 independent domain output and outbox; retry returns same delivery bytes", async () => {
  const oracle = new DomainOracle(),
    comp = memoryComposition("xtdb", randomUUID());
  try {
    const pl = W0.population(W0.rung(50)).next().value!,
      B = W0.populationBasis(W0.rung(50));
    const r = W0.sweepSubject(pl.world, W0.R2, B);
    assert.ok(!("error" in r));
    assert.equal(
      W0.outputJson(r.output),
      await oracle.call("evaluate", { world: pl.world, basis: B, release: "R2" }),
    );
    const expected = JSON.parse(
      await oracle.call("publish", {
        state: emptyWireState(),
        evaluations: [wireRecord(r.record)],
      }),
    );
    const actual = await comp.publishOutbox([r.record]);
    assert.equal(
      canonical(deliveriesWire(actual.deliveries)),
      canonical(deliveriesWire(expected.deliveries)),
    );
    const retry = await comp.publishOutbox([r.record]);
    assert.equal(retry.retry, true);
    assert.equal(canonical(retry.deliveries), canonical(actual.deliveries));
  } finally {
    oracle.close();
  }
});
test("controller bound constants: decrease, half/hold, stop after two breached windows and resume", () => {
  const c = new Controller(8);
  const signal = { queueMs: 0, baselineP99: 20, readRatio: 1, commitRatio: 1 };
  assert.equal(c.update({ ...signal, queueMs: 6 }, 0), 6);
  assert.equal(c.update({ ...signal, readRatio: 1.41 }, 100), 3);
  assert.equal(c.update(signal, 200), 3);
  assert.equal(c.update({ ...signal, commitRatio: 1.51 }, 1100), 1);
  assert.equal(c.update({ ...signal, commitRatio: 1.51 }, 2200), 0);
  assert.equal(c.update(signal, 3300), 1);
  assert.throws(() => c.update({ ...signal, baselineP99: 0 }, 3400));
});
test("trace mapper frozen schedule, exact sizes and no shared writes", () => {
  for (const ev of generateTrace({ seed: "p5-test", subjects: 1000, durationS: 181 })) {
    const mapped = mapW0Trace(ev),
      S = W0.placementId(ev.subject);
    assert.equal(mapped.rows.length, ev.facts);
    assert.ok(mapped.rows.every(([e]) => e === S || e.startsWith(S + "/")));
    assert.equal(mapped.commandId, mapW0Trace({ ...ev, resend: !ev.resend }).commandId);
  }
});

import { evaluateW0, publishW0, loadW0Pins } from "../lib/evaluate.ts";
test("W0 seams require actual accepted pins", async () => {
  const world = W0.population(W0.rung(50)).next().value!.world;
  const B = { position: W0.populationBasis(W0.rung(50)).tx, validAt: V_W0 };
  await assert.rejects(evaluateW0(world, "R2", B, null), /pin/);
  await assert.rejects(publishW0(memoryComposition("xtdb", randomUUID()), [], null), /pin/);
  assert.equal((await loadW0Pins()).w0Version, "W0-1.1.2");
});
