import { compressTraces } from "./archive.ts";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import test from "node:test";
import { capacity } from "./bench.ts";
import { cohort, type ScopeMeasurement } from "./measurements.ts";
import { requireIdentity, DeepSeedWitness } from "../../../bench/lib/deep-profile.ts";
import { deepOwnFacts } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { randomUUID } from "node:crypto";

// [DX-SCALE1] Why: one independently pipelined database does not reserve a second shared engine heap. Rejected: allowing live traffic on a seed-only grant, or treating installed disk capacity as available space.
test("resource arithmetic reserves separate drivers, shared engines once and bounded parallel seed waves", () => {
  const GiB = 1024 ** 3,
    measured = {
      people: 100000,
      facts: 16045255,
      allocatedBytes: 12 * GiB,
      driverPeakBytes: 20 * GiB,
      seedDriverPeakBytes: 3 * GiB,
      sharedPeakBytes: 10 * GiB,
      spillBytes: 5 * GiB,
    };
  const ten = capacity(100000, 10, { memory: 40 * GiB, disk: 290 * GiB }, measured);
  assert(!ten.fitsLive && ten.fitsSeed);
  assert(ten.seedParallelism < 10 && ten.seedParallelism >= 2);
  assert.equal(ten.shared, 10 * GiB * 1.15);
  assert.equal(ten.seedScopeLimit, 10);
  const disk = capacity(100000, 10, { memory: 90 * GiB, disk: 52 * GiB }, measured, "seed");
  assert.equal(disk.seedScopeLimit, 2);
  assert(disk.fitsSeed && !disk.fitsLive);
  assert(!capacity(100000, 10, { memory: 10 * GiB, disk: 11 * GiB }, measured).fitsSeed);
});
test("a seed witness rejects a substituted value and a different run identity", () => {
  const rows = deepOwnFacts(0);
  const reply = {
    txId: "one",
    position: 1,
    instant: SEED_VALID_FROM,
    triples: rows.map((r, i) => ({
      id: `x${i}`,
      entityId: r.e,
      attribute: r.a,
      value: r.v,
      validFrom: SEED_VALID_FROM,
    })),
  };
  reply.triples[0]!.value = { type: "string", value: "substitution" };
  assert.throws(
    () => new DeepSeedWitness().observe([{ subject: 0, rows }], reply, SEED_VALID_FROM),
    /value/,
  );
  const id = {
    source: "a".repeat(40),
    slot: "tx2-dxscale1-example",
    nonce: randomUUID(),
    arm: "zero" as const,
    account: 0,
    people: 10000,
  };
  requireIdentity(id);
  assert.throws(() => requireIdentity({ ...id, people: 40 }));
  assert.throws(() => requireIdentity({ ...id, source: "unbound" }));
});

test("raw trace compression reproduces the exact bytes and keeps baseline inputs", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scale1-archive-"));
  try {
    const source = Buffer.from('{"event":1}\n');
    fs.writeFileSync(path.join(dir, "trace.jsonl"), source);
    fs.writeFileSync(path.join(dir, "baseline.json"), "{}");
    const seals = await compressTraces(dir);
    assert.equal(seals.length, 1);
    assert.deepEqual(execFileSync("zstd", ["-dc", path.join(dir, "trace.jsonl.zst")]), source);
    assert(fs.existsSync(path.join(dir, "baseline.json")));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// [DX-SCALE1] Why: a hot minority scope changes a per-account tail without dominating a pooled tail. Rejected: averaging scope percentiles or reusing the same database twice.
test("pooling weights observed calls and binds independent databases and a common start", () => {
  const make = (account: number, values: number[]) =>
    ({
      id: {
        account,
        source: "a".repeat(40),
        slot: "tx2-dxscale1-test",
        arm: "reader",
        people: 10000,
        nonce: "same",
      },
      scope: `scope-${account}`,
      interval: { from: 12, to: 22 },
      invalid: [] as string[],
      hashes: {},
      offered: values.length,
      primaries: values.length,
      committed: values.length,
      resends: 0,
      missing: 0,
      ackMinutes: [],
      values: { all: values, L256: values },
      report: {
        deep: { database: `database-${account}` },
        priorities: { P2: { bars: [{ id: "witness", pass: account === 0 }] } },
      },
    }) as ScopeMeasurement;
  const a = make(0, [100]),
    b = make(1, Array(1000).fill(1));
  const m = cohort([a, b], 2).summary;
  assert.equal(m.commit.p99.n, 1001);
  assert(m.commit.p99.value! < 2 && m.perScope[0]!.commit.p99.value === 100);
  assert.deepEqual(m.jointObligations[0], {
    id: "witness",
    withinScopes: 1,
    missedScopes: 1,
    unjudgedScopes: 0,
    scopes: 2,
  });
  b.invalid.push("oracle incomplete");
  assert.equal(cohort([a, b], 2).summary.pooledBars[0].pass, null);
  assert.throws(() => cohort([a], 2));
  b.report.deep.database = a.report.deep.database;
  assert.throws(() => cohort([a, b], 2), /Duplicate Datomic database/);
});
