import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { outboxEntity } from "../../../bench/lib/w0-outbox.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";

const fixture = JSON.parse(readFileSync("lab/world/W0/cases/C01-base-r1.json", "utf8")).input;
const instant = W0.POPULATION_VALID_TIME;
type Input = [tx: number, rate: number, validTime?: string];
const schedules: Record<string, Input[]> = {
  "held pay change": [[10, 1600], [20, 1600], [15, 1500]],
  "first item after empty evaluation": [[20, 1650], [15, 1500]],
  "equal transaction with earlier valid time": [[10, 1600], [20, 1600], [20, 1500, "2026-11-04T11:59:59.999999Z"]],
};

for (const [name, steps] of Object.entries(schedules)) {
  test(name, async () => {
    const scope = randomUUID();
    let comp = memoryComposition("datomic", scope);
    const oracle = new DomainOracle();
    let expected = emptyWireState();
    try {
      for (const [i, [tx, rate, validTime = instant]] of steps.entries()) {
        const world = structuredClone(fixture.world);
        Object.assign(world.facts.find((f: W0.Fact) => f.a === "payRateCents"), { v: rate });
        const basis = { tx, validTime };
        const evaluated = W0.sweepSubject(world, W0.R1, basis);
        assert.ok(!("error" in evaluated));
        const output = JSON.parse(await oracle.call("evaluate", { world, release: "R1", basis }));
        assert.equal(evaluated.json, canonical(output));
        const { subject, release, workItems } = output;
        expected = JSON.parse(await oracle.call("publish", {
          state: expected, evaluations: [{ subject, release, basis, workItems }],
        })).state;
        if (i === steps.length - 1) {
          await comp.close();
          comp = memoryComposition("datomic", scope);
        }
        await publishChanged(comp, [evaluated.record]);
      }
      const id = outboxEntity(fixture.world.subject);
      const page = await comp.sweepPage([id], { position: await comp.currentPosition(), validAt: Date.parse(instant) });
      const raw = page.rows.find((row) => row.attribute === "p5/state");
      const state = raw ? JSON.parse(raw.value.value) : emptyWireState();
      for (const item of [...state.items, ...state.pending]) item.payload = JSON.parse(item.payload);
      assert.deepEqual(state, expected);
    } finally {
      oracle.close();
      await comp.close();
    }
  });
}
