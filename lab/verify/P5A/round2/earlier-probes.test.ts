// [CX-VP5A-R2] Why: rerun the original reviewer probes against the changed API with corrected refusal expectations and reviewer-owned output. Rejected: adopting the builder TAP.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { seedW0 } from "../../../bench/lib/w0-seed.ts";
import { freezeMemoryG0, fingerprintSweep } from "../../../bench/lib/w0-fingerprint.ts";
import { V_W0, canonical, worldOf, visibleRows, reachableRows, sha256 } from "../../../bench/lib/w0-world.ts";
import { trafficArm, ratioSummary } from "../../../bench/lib/w0-traffic.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";

const attempt = path.join(
  "/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VP5A/round2",
  "attempt-" + randomUUID(),
);
fs.mkdirSync(attempt, { recursive: true });
fs.writeFileSync(
  path.join(attempt, "adversarial-attempt.json"),
  JSON.stringify({ attempt }, null, 2),
);
const observations: Record<string, unknown> = {};
const save = () =>
  fs.writeFileSync(
    path.join(attempt, "observations.json"),
    JSON.stringify(
      {
        meaning:
          "Review regressions reproduce documented behavior; green tests do not grant product acceptance",
        source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
        testSha256: sha256(fs.readFileSync(new URL(import.meta.url))),
        observations,
      },
      null,
      2,
    ),
  );

test("G0 refuses visible, history, retirement and valid interval content changes", async () => {
  const scope = randomUUID(),
    comp = memoryComposition("xtdb", scope);
  const seed = await seedW0(comp, 50, path.join(attempt, "seed.ndjson"));
  const oracleFile = path.join(attempt, "oracle.json");
  execFileSync("python3", [
    "-I",
    "lab/oracles/domain/cli.py",
    "--population",
    "--rung",
    "50",
    "--fingerprint",
    "--out",
    oracleFile,
  ]);
  const oracle = JSON.parse(fs.readFileSync(oracleFile, "utf8"));
  const rows = new Map<string, any>();
  // [CX-VP5A] Why: reconstruct all actual seed lifetimes, keeping changed fields and truthful counts independently of the snapshot projection. Rejected: changing only an expected digest (does not test actual content).
  for (const line of fs
    .readFileSync(path.join(attempt, "seed.ndjson"), "utf8")
    .trim()
    .split("\n")) {
    const c = JSON.parse(line);
    for (const r of c.receipt.triples) rows.set(r.id, structuredClone(r));
    for (const op of c.operations)
      if (op.op === "retract") {
        rows.get(op.id).retractedPosition = c.receipt.position;
        rows.get(op.id).retractedAt = c.receipt.instant;
      }
  }
  const basis = { position: seed.basis.tx, validAt: V_W0 };
  let current = [...rows.values()];
  const fixture: CompositionHandle = {
    ...comp,
    g0Reader: (logical) => {
      const reader = comp.g0Reader!(logical);
      return {
        ...reader,
        async *scan(t, s, signal) {
          if (t !== "tx_assertions") {
            yield* reader.scan(t, s, signal);
            return;
          }
          for await (const row of reader.scan(t, s, signal)) {
            const fact = current.find((f) => f.id === row.id);
            if (fact)
              yield {
                ...row,
                memory_fact: fact,
                valid_from: fact.validFrom,
                valid_to: fact.validTo ?? null,
                retracted_position: fact.retractedPosition ?? null,
              };
          }
        },
      };
    },
    storeCounts: async () => ({
      position: seed.commands,
      assertions: current.length,
      retired: current.filter((r) => r.retractedPosition !== undefined).length,
      frames: seed.commands,
    }),
    sweepPage: async (subjects, b) => ({
      rows: reachableRows(subjects, visibleRows(current, b)),
      position: seed.commands,
      epoch: scope,
      roundTrips: 1,
    }),
  };
  const input = {
    endpoint: comp.backend.url,
    scope,
    basis,
    expected: { ...oracle.fingerprint, N: 50 },
    counts: seed.counts,
  };
  const pin = await freezeMemoryG0(comp, input);
  const admittedInput = { ...input, pin };
  const read = () =>
    fingerprintSweep(admittedInput, async () => ({
      endpoint: input.endpoint,
      scope,
      comp: fixture,
      close: async () => {},
    }));
  assert.equal((await read()).status, "complete-and-matching");
  const cases: any[] = [];
  const run = async (name: string, change: (r: any[]) => void, grants: boolean) => {
    current = structuredClone([...rows.values()]);
    const before = sha256(canonical(current));
    change(current);
    assert.notEqual(sha256(canonical(current)), before);
    let result: any;
    try {
      result = await read();
    } catch (e) {
      result = { refused: String(e) };
    }
    cases.push({
      name,
      beforeSha256: before,
      afterSha256: sha256(canonical(current)),
      changedFullContent: true,
      result,
    });
    assert.equal(result.status === "complete-and-matching", grants, name);
  };
  await run(
    "visible fact value +1",
    (r) => {
      const x = r.find((x) => x.attribute === "weeklyMinutes" && !x.retractedPosition);
      x.value.value = String(Number(x.value.value) + 1);
    },
    false,
  );
  await run(
    "one assertion removed (independent count differs)",
    (r) => {
      r.pop();
    },
    false,
  );
  await run(
    "one retired assertion value +1",
    (r) => {
      const x = r.find((x) => x.retractedPosition);
      x.value.value = String(Number(x.value.value) + 1);
    },
    false,
  );
  await run(
    "one retraction position -1",
    (r) => {
      r.find((x) => x.retractedPosition).retractedPosition--;
    },
    false,
  );
  await run(
    "one visible validFrom -1ms",
    (r) => {
      r.find((x) => x.attribute === "weeklyMinutes" && !x.retractedPosition).validFrom--;
    },
    false,
  );
  await run(
    "one visible validTo added",
    (r) => {
      r.find((x) => x.attribute === "weeklyMinutes" && !x.retractedPosition).validTo = V_W0 + 1000;
    },
    false,
  );
  observations.g0 = { expected: oracle.fingerprint, cases };
  save();
});

test("traffic refuses the reviewer combined content/count fixture before publication", async () => {
  const scope = randomUUID(),
    comp = memoryComposition("xtdb", scope);
  const trafficDir = path.join(attempt, "traffic");
  fs.mkdirSync(trafficDir);
  const seed = await seedW0(comp, 50, path.join(trafficDir, "seed.ndjson"));
  const expected = JSON.parse(
    fs.readFileSync(path.join(attempt, "oracle.json"), "utf8"),
  ).fingerprint;
  const admission = await fingerprintSweep({
    endpoint: comp.backend.url,
    scope,
    basis: { position: seed.basis.tx, validAt: V_W0 },
    expected: { ...expected, N: 50 },
    counts: seed.counts,
    pin: await freezeMemoryG0(comp, {
      endpoint: comp.backend.url,
      scope,
      basis: { position: seed.basis.tx, validAt: V_W0 },
      expected: { ...expected, N: 50 },
      counts: seed.counts,
    }),
  });
  assert.equal(admission.status, "complete-and-matching");
  let corruptPages = 0,
    countReads = 0,
    publications = 0;
  const planted: CompositionHandle = {
    ...comp,
    // [CX-VP5A] Why: change returned content after admission while retaining exact P/V/head; this must reach independent expected-answer gates. Rejected: corrupting a shape field that G7 already rejects.
    sweepPage: async (...args) => {
      const answer = await comp.sweepPage(...args);
      const rows = answer.rows.map((r) =>
        r.attribute === "weeklyMinutes" ? { ...r, value: { type: "integer", value: "1234" } } : r,
      );
      if (rows.some((r, i) => canonical(r) !== canonical(answer.rows[i]))) corruptPages++;
      return { ...answer, rows };
    },
    storeCounts: async () => {
      countReads++;
      throw new Error("planted end-count mismatch");
    },
    publishOutbox: async (records) => {
      publications++;
      return comp.publishOutbox(records);
    },
  };
  await assert.rejects(
    trafficArm({
      comp: planted,
      scope,
      N: 50,
      dir: trafficDir,
      id: "wrong-route",
      seed: "review-traffic",
      durationS: 2,
      traceOffsetS: 120,
      workers: 1,
      controllerOn: false,
      sweep: true,
      release: "R2",
    }),
    /planted end-count mismatch/,
  );
  assert.ok(countReads > 0);
  assert.equal(publications, 0);
  observations.traffic = { admission, corruptPages, publications, countReads };
  save();
});

test("ratio checker refuses eight burst windows shorter than a whole burst", () => {
  const arm = {
    read: { p99: 10, count: 1000 },
    commit: { p99: 10, count: 4000 },
    trace: { durationS: 65, offsetS: 120 },
    windowValid: true,
    matchedWindowMs: 1000,
    sweepWallMs: 1000,
  };
  const rounds = Array.from({ length: 8 }, (_, round) => ({
    round,
    kind: "burst",
    aa: false,
    baseline: arm,
    sweep: arm,
  }));
  const result = ratioSummary(rounds, "review-ratios");
  assert.equal(result.groups.burst.read.status, "INCONCLUSIVE");
  assert.equal(result.groups.burst.commit.status, "INCONCLUSIVE");
  observations.shortBurst = { input: rounds, result };
  save();
});

test("W0 projection excludes every lifetime field even when later retirement bytes differ", () => {
  const row = {
    id: "a",
    entityId: "pl:a",
    attribute: "weeklyMinutes",
    value: { type: "integer", value: "2400" },
    position: 1,
    validFrom: V_W0,
    retractedPosition: 3,
  };
  const first = worldOf("pl:a", [row]);
  assert.equal(
    canonical(first),
    canonical(worldOf("pl:a", [{ ...row, retractedPosition: 100, validFrom: V_W0 - 1 }])),
  );
  assert.deepEqual(Object.keys(first.facts[0]).sort(), ["a", "e", "tx", "v"]);
  observations.masking = first;
  save();
});

for (const mutation of ["sweep-world", "live-world", "deliveries", "end-counts"]) {
  test(`traffic refuses independent ${mutation} mismatch`, async () => {
    const scope = randomUUID(),
      comp = memoryComposition("xtdb", scope),
      dir = path.join(attempt, mutation);
    fs.mkdirSync(dir);
    await seedW0(comp, 50, path.join(dir, "seed.ndjson"));
    let publications = 0,
      countReads = 0;
    const planted: CompositionHandle = {
      ...comp,
      sweepPage: async (subjects, basis, between) => {
        const page = await comp.sweepPage(subjects, basis, between);
        if (
          (mutation === "sweep-world" && subjects.length > 1) ||
          (mutation === "live-world" && subjects.length === 1 && basis.validAt > V_W0 + 120000)
        )
          return {
            ...page,
            rows: page.rows.map((r) =>
              r.attribute === "weeklyMinutes"
                ? { ...r, value: { type: "integer", value: "1234" } }
                : r,
            ),
          };
        return page;
      },
      storeCounts: async () => {
        countReads++;
        const c = await comp.storeCounts();
        return mutation === "end-counts" && countReads > 1
          ? { ...c, assertions: c.assertions + 1 }
          : c;
      },
      publishOutbox: async (records) => {
        publications++;
        const result = await comp.publishOutbox(records);
        return mutation === "deliveries" ? { ...result, deliveries: [] } : result;
      },
    };
    await assert.rejects(
      trafficArm({
        comp: planted,
        scope,
        N: 50,
        dir,
        id: mutation,
        seed: "review-traffic",
        durationS: 2,
        traceOffsetS: 120,
        workers: 1,
        controllerOn: false,
        sweep: mutation !== "live-world",
        release: "R2",
      }),
      mutation === "end-counts" ? /G9/ : mutation === "deliveries" ? /G5/ : /G1/,
    );
    if (mutation === "sweep-world" || mutation === "live-world") assert.equal(publications, 0);
    if (mutation === "end-counts") assert.ok(countReads >= 2);
    observations[mutation] = { publications, countReads };
    save();
  });
}

test("burst interval must be complete in both matched arms including offset boundaries", () => {
  const arm = {
    read: { p99: 10, count: 1000 },
    commit: { p99: 10, count: 4000 },
    trace: { durationS: 100, offsetS: 120 },
    windowValid: true,
    matchedWindowMs: 60000,
    sweepWallMs: 60000,
  };
  const make = (b: any, s: any) =>
    Array.from({ length: 8 }, () => ({ kind: "burst", aa: false, baseline: b, sweep: s }));
  assert.equal(ratioSummary(make(arm, arm), "full").groups.burst.read.status, "HOLDS");
  for (const bad of [
    { ...arm, matchedWindowMs: 59999 },
    { ...arm, trace: { ...arm.trace, offsetS: 121 } },
    { ...arm, matchedWindowMs: undefined },
  ]) {
    assert.equal(ratioSummary(make(bad, arm), "partial").groups.burst.read.status, "INCONCLUSIVE");
    assert.equal(
      ratioSummary(make(arm, bad), "partial").groups.burst.commit.status,
      "INCONCLUSIVE",
    );
  }
});
