import { FieldSaveWriter, liveEdits } from "./deep-live.ts";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { stageReplay } from "./source.ts";
import {
  deepCells,
  deepOwnFacts,
  deepPopulation,
  deepShape,
  deepTasks,
  stepCount,
  taskSerial,
} from "../../../bench/lib/deep-world.ts";
import { deepRoster, deepSeed, makeDeepTrace } from "../../../bench/lib/deep-trace.ts";
import { DeepSeedWitness, frozenDeep } from "../../../bench/lib/deep-profile.ts";
import { DeepWriter } from "../../../bench/lib/deep-command.ts";
import { DeepActivation } from "../../../bench/lib/deep-activation.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { buildCase, checkWithOracle, type OracleSampleRead } from "../../../bench/lib/oracle.ts";
import { alignIds, seedRung } from "../../../bench/lib/seed.ts";
import { ids, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { generateTrace, traceDigest } from "../../../bench/lib/trace.ts";

// [DX-SCALE1] Why: check the observed graph, values, bounds and replay bytes separately from the fixture pins. Rejected: two calls into one generator as the sole test of its semantics.
test("deep population, nine weighted cells, daily/monthly activity, frozen offers and original v3", () => {
  const totals = deepPopulation(10000);
  assert.equal(totals.facts, 1604464);
  assert.equal(totals.placements, 18000);
  assert.equal(totals.tasks, 57000);
  assert.equal(totals.closedTasks / totals.tasks, 0.62);
  assert.equal(totals.subtasks, 313500);
  assert.equal(totals.fieldValues, 758100);
  assert.equal(totals.customValues, 66000);
  assert.equal(totals.files, 14000);
  const cells = deepCells(10000);
  for (const bucket of ["small", "medium", "large"] as const)
    for (const hop of [3, 4, 6] as const) {
      const i = cells.pick(bucket, hop, 0.4)!;
      assert(i >= 0);
      const rows = deepOwnFacts(i),
        depth = new Map([[ids.placement(i), 0]]);
      for (const [entity, d] of depth)
        for (const f of rows)
          if (f.e === entity && f.v.type === "ref" && !depth.has(f.v.value))
            depth.set(f.v.value, d + 1);
      assert.equal(Math.max(...depth.values()), hop);
      assert(rows.every((f) => depth.has(f.e)));
      assert.equal(rows.length, deepShape(i).facts);
      assert.equal(rows.filter((f) => f.a === ":placement/task").length, deepTasks(i));
      assert(
        rows
          .filter((f) => f.a.startsWith(":task/field-"))
          .every((f) => Buffer.byteLength(String(f.v.value)) === 57),
      );
      assert.equal(
        rows.filter((f) => /:(task\/subtask|subtask\/next)/.test(f.a)).length,
        Array.from({ length: deepTasks(i) }, (_, t) => stepCount(taskSerial(i, t))).reduce(
          (a, b) => a + b,
        ),
      );
    }
  const month = new Set<number>();
  for (let d = 0; d < 30; d++) {
    const daily = new Set(deepRoster(deepSeed(0), 10000, d));
    assert.equal(daily.size, 200);
    for (const s of daily) month.add(s);
  }
  assert.equal(month.size, 3800);
  const plan = frozenDeep(0, 10000);
  assert.equal(plan.activeSubjects.size, 200);
  assert(plan.events.some((e) => e.deep.closes));
  assert(plan.events.some((e) => e.deep.fresh));
  assert(plan.events.every((e) => e.deep.saves <= 37));
  assert.equal(
    traceDigest(generateTrace({ seed: "ns-v2", subjects: 10000, durationS: 7200 })),
    "aa8a7636ff027ab3",
  );
  const witness = new DeepSeedWitness(),
    rows = deepOwnFacts(0);
  assert.throws(() =>
    witness.observe(
      [{ subject: 0, rows }],
      { txId: "stale", position: 2, instant: 10, triples: [] },
      SEED_VALID_FROM,
    ),
  );
});

async function exercise(scope: string, backend: string, account: number, fieldSaves = false) {
  const comp = await openComposition(backend, "datomic", scope),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deep-functional-"));
  const people = 4,
    plan = makeDeepTrace(deepSeed(account), people, 130),
    active = new (fieldSaves ? FieldSaveWriter : DeepWriter)(plan.activeSubjects),
    witness = new DeepSeedWitness();
  try {
    assert.equal(await comp.currentPosition(), 0);
    const seed = await seedRung({
      comp,
      deep: witness,
      subjects: people,
      runTag: scope,
      batchFacts: 400,
      budgetMs: 60000,
      historySubjects: new Set([0]),
      recordSubjects: new Set([0, 1, 2, 3]),
      recordAccounts: new Set(),
      onReceipt: (_ops, r) => active.bind(r),
      log: () => {},
    });
    const records = seed.recorded,
      reads: OracleSampleRead[] = [];
    const sample = async (i: number, instant: number) => {
      const basis = { recordedAt: instant, validAt: Date.now() + 10000 };
      const pull = await comp.pull(ids.placement(i), basis);
      assert(pull.triples.length > 90);
      reads.push({
        subject: i,
        basis,
        rows: pull.triples.map((t) => [
          t.entityId,
          t.attribute,
          t.value,
          t.validFrom ?? null,
          null,
          t.id,
        ]),
      });
    };
    let last = seed.lastInstant;
    const includes = new Set<string>();
    for (const original of plan.events.filter((e) => !e.resend).slice(0, 70)) {
      const edits = liveEdits(original.subject, original.seq, original.kind, original.deep);
      const ev = fieldSaves
        ? { ...original, facts: 1 + Number(original.correction) + edits.length }
        : original;
      const state = seed.state.get(ev.subject)!,
        cmd = active.build(scope, ev, state, Date.now());
      if (fieldSaves) assert.deepEqual(cmd.added.slice(1 + Number(ev.correction)), edits);
      includes.add(ev.kind);
      const meta = { commandId: cmd.commandId, preconditions: cmd.preconditions, actor: ev.kind },
        rc = await comp.transact(cmd.operations, meta);
      assert(rc.ok, rc.ok ? "" : rc.tag);
      const r = rc.value;
      last = r.instant;
      active.bind(r);
      state.stamp = cmd.newStamp;
      const stamp = r.triples.find((t) => t.attribute === ":placement/stamp")!;
      state.stampId = stamp.id;
      state.stampValidFrom = stamp.validFrom!;
      if (cmd.newAddress) {
        const a = r.triples.find((t) => t.attribute === ":worker/address")!;
        state.address = cmd.newAddress;
        state.addressId = a.id;
        state.addressValidFrom = a.validFrom!;
      }
      records.push({
        commandId: cmd.commandId,
        operations: cmd.operations,
        preconditions: cmd.preconditions,
        actor: ev.kind,
        receipt: {
          position: r.position,
          instant: r.instant,
          txId: r.txId,
          assertionIds: alignIds(cmd.operations, r),
        },
      });
      if (ev.kind === "system" || ev.ackLoss) {
        const retry = await comp.transact(cmd.operations, meta);
        assert(!retry.ok);
        const found = await comp.transactionByCommand(cmd.commandId);
        assert(found.ok && found.value.txId === r.txId && found.value.position === r.position);
      }
    }
    assert.equal(includes.size, 4);
    for (let i = 0; i < people; i++) {
      await sample(i, seed.lastInstant);
      await sample(i, last);
    }
    const oracleRoot = path.join(tmp, "oracle");
    stageReplay(process.cwd(), oracleRoot);
    const result = checkWithOracle({
      oracleRoot,
      dir: tmp,
      reads,
      caseDoc: buildCase({
        caseId: scope,
        commands: records,
        lastPosition: await comp.currentPosition(),
        reads,
      }),
    });
    assert.equal(result.status, "PASS", JSON.stringify(result));
    assert.equal(result.reads, 8);
    assert("entityQueries" in result);
    const act = new DeepActivation(tmp, people, scope);
    const a = await act.execute(comp, "R1", () => {}),
      b = await act.execute(comp, "R2", () => {});
    const verified = await act.verify(comp, a, b);
    assert.equal(verified.checked, people);
    assert.equal(verified.guardComparisons, people * 2);
    assert(
      [a, b].every(
        (x) => x.layout === "page-cut" && x.coverage?.size === people && x.coverage.pages === 1,
      ),
    );
    assert(b.cut.position > a.cut.position);
    return {
      scope,
      primary: 70,
      oracleReads: result.reads,
      entityQueries: result.entityQueries,
      domain: verified.checked,
      seeded: seed.assertions,
    };
  } finally {
    await comp.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
test(
  "two fresh deep scopes replace fields, preserve old reads and publish exact R1 and R2 outboxes",
  { timeout: 180000 },
  async () => {
    const id = randomUUID(),
      backend = process.env.DX_SCALE1_NATIVE_SMOKE === "1" ? "reach" : "memory";
    const results = await Promise.all(
      [0, 1].map((account) => exercise(`deep-smoke-${id}-${account}`, backend, account)),
    );
    assert.notEqual(results[0]!.scope, results[1]!.scope);
    console.log(JSON.stringify({ backend, results }));
  },
);

test(
  "field-level saves retain their full pinned worlds under independent replay and release checks",
  { timeout: 180000 },
  async () => {
    const backend = process.env.DX_SCALE1_NATIVE_SMOKE === "1" ? "reach" : "memory";
    console.log(
      JSON.stringify({
        profile: "deep-live",
        backend,
        ...(await exercise("field-save-" + randomUUID(), backend, 0, true)),
      }),
    );
  },
);
