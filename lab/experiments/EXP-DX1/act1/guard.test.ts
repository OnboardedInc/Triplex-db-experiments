import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { publishChanged } from "../../../bench/lib/w0-replica.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { evaluation, observe, open } from "./check.ts";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import type { GuardLayout } from "../../../bench/lib/w0-guarded.ts";

type Input = [tx: number, rate: number, validTime?: string];
const schedules: Record<string, Input[]> = {
  "held pay change": [
    [10, 1600],
    [20, 1600],
    [15, 1500],
  ],
  "first item after empty evaluation": [
    [20, 1650],
    [15, 1500],
  ],
  "equal transaction with earlier valid time": [
    [10, 1600],
    [20, 1600],
    [20, 1500, "2026-11-04T11:59:59.999999Z"],
  ],
};
for (const layout of [undefined, "full-state", "guard-fact"] as const) {
  for (const [name, steps] of Object.entries(schedules)) {
    test((layout ?? "historical") + " / " + name, async () => {
      const scope = "act1-" + randomUUID(),
        oracle = new DomainOracle();
      let comp = await open(scope),
        expected = emptyWireState();
      const divergences = [];
      try {
        for (const [i, args] of steps.entries()) {
          const { record, wire } = await evaluation(oracle, ...args);
          expected = JSON.parse(
            await oracle.call("publish", { state: expected, evaluations: [wire] }),
          ).state;
          if (layout && i === steps.length - 2) {
            const lost = {
              ...comp,
              transact: async (...args: Parameters<CompositionHandle["transact"]>) => {
                const durable = await comp.transact(...args);
                assert.ok(durable.ok);
                throw Error("lost guard ACK");
              },
            };
            await assert.rejects(publishChanged(lost, [record], { layout }), /lost guard ACK/);
            await comp.close();
            comp = await open(scope);
            assert.equal(
              (await publishChanged(comp, [record], { layout })).responses[0].retry,
              true,
            );
          } else await publishChanged(comp, [record], { layout });
          await comp.close();
          comp = await open(scope);
          const [actual] = await observe(comp, [record.subject], await comp.currentPosition());
          if (layout || process.env.DX_ACT1_RED === "1") assert.deepEqual(actual, expected);
          else if (JSON.stringify(actual) !== JSON.stringify(expected)) divergences.push(i);
          if (!layout && i === steps.length - 1) {
            assert.equal(actual.items[0].payload.payRateCents, 1500);
            assert.equal(actual.pending.length, expected.pending.length + 1);
            assert.equal(actual.subjects[0].basis.tx, args[0]);
          }
        }
        if (!layout) assert.ok(divergences.length >= 2);
      } finally {
        await comp.close();
        oracle.close();
      }
    });
  }
}

for (const layout of ["full-state", "guard-fact"] satisfies GuardLayout[]) {
  test(layout + " / lost ACK, rollback, retirement and restart", async () => {
    const scope = "act1-" + randomUUID(),
      oracle = new DomainOracle();
    let comp = await open(scope),
      state = emptyWireState();
    let receiver = { effects: [], projection: [] },
      actualReceiver = W0.EMPTY_RECEIVER;
    try {
      for (const [tx, rate] of [
        [10, 1600],
        [20, 1600],
        [25, 1600],
        [30, 1600],
        [35, 1650],
        [40, 1600],
      ]) {
        const { record, wire } = await evaluation(
          oracle,
          tx!,
          rate!,
          undefined,
          tx === 25 ? W0.R2 : W0.R1,
        );
        const next = JSON.parse(await oracle.call("publish", { state, evaluations: [wire] }));
        const before = await comp.currentPosition();
        const crashBefore = {
          ...comp,
          transact: async () => {
            throw Error("before commit");
          },
        };
        await assert.rejects(publishChanged(crashBefore, [record], { layout }), /before commit/);
        assert.equal(await comp.currentPosition(), before);
        let receipt: any;
        const lost = {
          ...comp,
          transact: async (...args: Parameters<CompositionHandle["transact"]>) => {
            const r = await comp.transact(...args);
            assert.ok(r.ok);
            receipt = r.value;
            throw Error("lost ACK");
          },
        };
        await assert.rejects(publishChanged(lost, [record], { layout }), /lost ACK/);
        await comp.close();
        comp = await open(scope);
        const retry = (await publishChanged(comp, [record], { layout })).responses[0];
        assert.deepEqual(
          [retry.retry, retry.txId, retry.position],
          [true, receipt.txId, receipt.position],
        );
        assert.equal(await comp.currentPosition(), before + 1);
        const deliveries = retry.deliveries.map((d: any) => ({
          ...d,
          seq: Number(d.seq),
          payload: JSON.parse(d.payload),
        }));
        assert.deepEqual(deliveries, next.deliveries);
        const received = JSON.parse(await oracle.call("receive", { state: receiver, deliveries }));
        const replay = JSON.parse(
          await oracle.call("receive", { state: received.state, deliveries }),
        );
        assert.ok(!received.error && !replay.error);
        assert.deepEqual(replay.state, received.state);
        const once = W0.receive(actualReceiver, retry.deliveries),
          twice = W0.receive(once.state, retry.deliveries);
        assert.deepEqual(JSON.parse(W0.receiveJson(once)), received);
        assert.deepEqual(JSON.parse(W0.receiveJson(twice)), replay);
        actualReceiver = twice.state;
        receiver = received.state;
        assert.deepEqual((await observe(comp, [record.subject], receipt.position))[0], next.state);
        state = next.state;
      }
    } finally {
      await comp.close();
      oracle.close();
    }
  });
  test(layout + " / concurrent first writers and stalled older snapshot", async () => {
    const scope = "act1-" + randomUUID(),
      oracle = new DomainOracle();
    const a = await open(scope),
      b = await open(scope);
    try {
      let next = emptyWireState();
      for (const [slowTx, fastTx] of [
        [15, 20],
        [25, 30],
      ]) {
        const slow = await evaluation(oracle, slowTx!, 1500);
        const fast = await evaluation(oracle, fastTx!, 1600);
        const ready = Promise.withResolvers<void>(),
          resume = Promise.withResolvers<void>();
        const stalled = {
          ...a,
          transact: async (...args: Parameters<CompositionHandle["transact"]>) => {
            ready.resolve();
            await resume.promise;
            return a.transact(...args);
          },
        };
        const late = publishChanged(stalled, [slow.record], { layout });
        try {
          await Promise.race([
            ready.promise,
            late.then(() => {
              throw Error("stalled writer did not submit");
            }),
          ]);
          await publishChanged(b, [fast.record], { layout });
        } finally {
          resume.resolve();
        }
        await late;
        next = JSON.parse(
          await oracle.call("publish", { state: next, evaluations: [fast.wire, slow.wire] }),
        ).state;
        assert.deepEqual(
          (await observe(b, [fast.record.subject], await b.currentPosition()))[0],
          next,
        );
      }
    } finally {
      oracle.close();
      await a.close();
      await b.close();
    }
  });
}
