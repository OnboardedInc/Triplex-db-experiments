import assert from "node:assert/strict";
import test from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import type { TraceEvent } from "../../../bench/lib/trace.ts";
import { applyW0Trace, openW0Window } from "../../../bench/lib/w0-traffic.ts";
import { DomainOracle } from "../../../bench/lib/w0-gates.ts";
import { W0, V_W0, worldOf } from "../../../bench/lib/w0-world.ts";

const event: TraceEvent = {
  subject: 0,
  seq: 2299,
  kind: "agent",
  facts: 5,
  atMs: 159750,
  correction: true,
  ackLoss: true,
  resend: false,
  burst: true,
  active: true,
  stream: "background",
};

test("one subject and two five-fact saves reproduce the archived rejection", async () => {
  const comp = memoryComposition("datomic", "archived-window");
  const oracle = new DomainOracle();
  try {
    for (const window of ["before", "during"]) {
      // [DX-ACT2] Why: the archived writer prefixed only the transaction key. Rejected: fabricating invalid oracle JSON without first storing both saves.
      const historical = {
        ...comp,
        transactionByCommand: (id: string) => comp.transactionByCommand(window + ":" + id),
        transact: (ops: any[], meta: any) =>
          comp.transact(ops, { ...meta, commandId: window + ":" + meta.commandId }),
      };
      assert.equal((await applyW0Trace(historical, event)).duplicate, false);
    }
    const cut = { position: await comp.currentPosition(), validAt: V_W0 };
    const subject = W0.placementId(0);
    const read = await comp.sweepPage([subject], cut);
    const edges = read.rows.filter((r) => r.attribute === "answers");
    assert.equal(edges.length, 2);
    assert.deepEqual(
      edges.map((r) => r.position),
      [1, 2],
    );
    assert.notEqual(edges[0]!.id, edges[1]!.id);
    assert.equal(edges[0]!.value.value, edges[1]!.value.value);
    assert.deepEqual(
      JSON.parse(
        await oracle.call("evaluate", {
          world: worldOf(subject, read.rows),
          release: "R1",
          basis: { tx: cut.position, validTime: W0.POPULATION_VALID_TIME },
        }),
      ),
      { error: "W0.E_CARDINALITY" },
    );
  } finally {
    oracle.close();
    await comp.close();
  }
});

test("each traffic window saves its own entities and each resend resolves the same receipt", async () => {
  const comp = memoryComposition("datomic", "window-retry");
  const oracle = new DomainOracle();
  try {
    for (const phase of ["baseline", "sweep", "after"]) {
      const window = await openW0Window(comp, "attempt-with-a-long-release-name:" + phase);
      const first = await applyW0Trace(comp, event, window);
      assert.equal(first.duplicate, false, window + " must be a new save");
      assert.equal(await openW0Window(comp, "attempt-with-a-long-release-name:" + phase), window);
      const retry = await applyW0Trace(comp, { ...event, resend: true }, window);
      assert.equal(retry.duplicate, true);
      assert.equal(retry.receipt.txId, first.receipt.txId);
      assert.equal(retry.receipt.position, first.receipt.position);
    }
    const cut = { position: await comp.currentPosition(), validAt: V_W0 };
    const subject = W0.placementId(0);
    const { rows } = await comp.sweepPage([subject], cut);
    for (const key of ["answers", "decisions"]) {
      assert.equal(
        new Set(rows.filter((r) => r.attribute === key).map((r) => r.value.value)).size,
        3,
      );
    }
    const result = JSON.parse(
      await oracle.call("evaluate", {
        world: worldOf(subject, rows),
        release: "R1",
        basis: { tx: cut.position, validTime: W0.POPULATION_VALID_TIME },
      }),
    );
    assert.equal(result.subject, subject);
    assert.equal(result.basis.tx, cut.position);
  } finally {
    oracle.close();
    await comp.close();
  }
});
