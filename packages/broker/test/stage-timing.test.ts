import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { HostBroker, type BrokerEvent } from "../src/broker.js";

// [EXP-P2B-R2] Why: timing must describe this durable append while leaving retry identity intact.
// Rejected: accepting a populated event without checking its ordering or its command binding.
it.each([false, true])(
  "stage tracing is opt-in (%s) and preserves the original receipt",
  async (traceStages) => {
    const events: BrokerEvent[] = [];
    const broker = await HostBroker.open({
      dir: path.resolve(import.meta.dirname, "../../../runs/EXP-P2B", randomUUID()),
      scopeKey: "stage-timing",
      traceStages,
      autoApply: false,
      decisionStamp: true,
      requireFullFsync: false,
      minFreeBytes: 5 * 1024 ** 3,
      onEvent: (event) => events.push(event),
    });
    try {
      const txn = {
        operationId: "timed-command",
        attemptId: "first",
        sourceK: 0,
        reads: { entities: new Set<string>(), scopeWide: false },
        claims: [],
        placeholders: [-1],
        rows: [],
        priors: new Map(),
        newIds: new Set<string>(),
      };
      const offered = process.hrtime.bigint();
      const first = await broker.submit(txn);
      const ack = process.hrtime.bigint();
      const retry = await broker.submit({ ...txn, attemptId: "retry" });
      expect(first.kind).toBe("committed");
      if (first.kind !== "committed") throw Error("Missing receipt");
      expect(retry).toMatchObject({
        kind: "committed",
        lsn: first.lsn,
        epoch: first.epoch,
        positions: first.positions,
        stamp: first.stamp,
        replayed: true,
      });
      const frames = events.filter((event) => event.type === "frame");
      expect(frames).toHaveLength(1);
      const frame = frames[0]!;
      if (!traceStages) {
        expect(frame.stageTiming).toBeUndefined();
        return;
      }
      const stage = frame.stageTiming!;
      const log = stage.log as Record<string, unknown>;
      const commands = stage.commands as Record<string, unknown>[];
      expect(commands).toHaveLength(1);
      const command = commands[0]!;
      expect(command.operationId).toBe(txn.operationId);
      if (first.kind !== "committed") throw Error("Missing receipt");
      expect(command.positions).toEqual([...first.positions.values()]);
      const timeline = [
        offered,
        command.submittedNs,
        command.dequeuedNs,
        stage.appendNs,
        log.startedNs,
        log.bodyEndNs,
        log.durableNs,
        stage.appendReturnedNs,
        stage.resolvedNs,
        ack,
      ].map((value) => BigInt(value as string | bigint));
      expect(timeline.every((value, i) => !i || value >= timeline[i - 1]!)).toBe(true);
      expect(log.durableNs).toBe(frame.sourceDurableAtNs);
      for (const cpu of [log.bodyCpu, log.totalCpu, stage.preparationCpu, stage.publishCpu])
        expect(cpu).toEqual({ user: expect.any(Number), system: expect.any(Number) });
    } finally {
      await broker.close();
    }
  },
);
