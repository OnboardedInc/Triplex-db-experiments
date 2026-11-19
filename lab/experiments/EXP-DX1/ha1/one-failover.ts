import assert from "node:assert/strict";
import { clock, sleep, until } from "./common.ts";
import {
  openOne,
  populate,
  pinnedLoop,
  requestIndex,
  standby,
  state,
  receipts,
  verifySuffix,
} from "./one-db.ts";
import type { Stack } from "./stack.ts";

export async function oneFailover(s: Stack, people: number) {
  const ac = await openOne(s, true, true);
  try {
    const population = await populate(s, ac, people);
    const pin = ac.receipts.get(ac.inputs[0]!.operationId)!;
    const samples = [];
    let active: "active" | "standby" = "active",
      other: "active" | "standby" = "standby";
    for (const [j, cell] of [
      "indexed-light",
      "indexed-burst",
      "tail-light",
      "tail-burst",
    ].entries()) {
      const index = await requestIndex(ac);
      const count = cell.startsWith("tail-") ? Math.min(128, population.people) : 0;
      for (let k = 0; k < count; k++)
        await ac.send(ac.intent("tail-" + j + "-" + k, 160, "tenant-0/tail-" + j + "-" + k));
      const monitor = await standby(s, other);
      assert(await s.broker(active));
      const before = await state(ac),
        cut = String(BigInt(before.basis) + 1n),
        startIndex = ac.inputs.length;
      const reader = pinnedLoop(ac, pin);
      let offering = true,
        issued = 0;
      const ordinary = async (lane: number) => {
        while (offering) {
          const k = ++issued;
          await ac.send(ac.intent("work-" + j + "-" + k, 10, "tenant-" + lane + "/traffic-" + j));
          if (cell.endsWith("light")) await sleep(175);
        }
      };
      const workers = Array.from({ length: cell.endsWith("light") ? 1 : 4 }, (_, i) => ordinary(i));
      for (const w of workers) w.catch(() => {});
      try {
        const loadStart = clock();
        await sleep(1600);
        const fault = await s.kill(active);
        offering = false;
        const observeBroker = until("elected peer endpoint", async () =>
          (await s.broker(other)) ? clock() : undefined,
        );
        const observeSync = until("peer sync after death", async () => {
          try {
            const v = await ac.w.request<{ database: string; basis: string }>(
              "GET",
              "/ha1/" + ac.db + "/sync",
              undefined,
              650,
            );
            assert(v.database === ac.db && BigInt(v.basis) >= BigInt(before.basis));
            return clock();
          } catch (err) {
            if (err instanceof assert.AssertionError) throw err;
            return undefined;
          }
        });
        const fresh = ac.intent("fresh-" + j, 10, "tenant-0/fresh");
        const ack = await ac.send(fresh),
          ackAt = clock();
        await Promise.all(workers);
        const [brokerAt, syncAt] = await Promise.all([observeBroker, observeSync]);
        await ac.pinned(ack);
        await ac.pinned(pin);
        const polls = await reader.finish(),
          during = polls.filter((p) => p.start <= ackAt && p.end >= fault.to);
        assert(
          during.some((p) => p.code === "ok"),
          "No pinned poll in fault interval",
        );
        const all = await receipts(ac);
        const feed = await verifySuffix(ac, cut, ac.inputs.slice(startIndex));
        const freshState = await state(ac);
        const native = await s.exec(
          other,
          "sh",
          "-c",
          "grep -hE ':transactor/(standby|recovered|start|active)|:db/(load|recover)|:index/(install|load)|replay(ed)? [0-9]+' log/*.log | tail -35",
        );
        const preAcks = [...ac.arrivals.values()].filter(
          (t) => t >= loadStart && t <= fault.from,
        ).length;
        const row = {
          cell,
          ordinaryAcksPerSecond: (preAcks * 1000) / (fault.from - loadStart),
          before,
          index,
          tailCommits: count,
          monitor,
          fault,
          ack,
          brokerMs: brokerAt - fault.from,
          peerSyncMs: syncAt - fault.from,
          receiptMs: ackAt - fault.from,
          postBrokerMs: ackAt - brokerAt,
          pollCount: during.length,
          pollErrors: during.filter((p) => p.code !== "ok").length,
          maxPollGapMs: Math.max(...polls.slice(1).map((p, k) => p.end - polls[k]!.end)),
          all,
          feed,
          freshState,
          native: s.redact(native),
        };
        s.e.write(cell, { nonce: s.e.nonce, db: ac.db, row, polls });
        samples.push(row);
      } finally {
        offering = false;
        await reader.finish();
        await Promise.allSettled(workers);
      }
      if (j < 3) {
        await s.remove(active);
        await s.tx(active, active === "active" ? s.a : s.b, "pg", "moving");
      }
      const swap: "active" | "standby" = active;
      active = other;
      other = swap;
    }
    return {
      population,
      samples: samples.map((v) => ({
        cell: v.cell,
        brokerMs: v.brokerMs,
        peerSyncMs: v.peerSyncMs,
        receiptMs: v.receiptMs,
        pollErrors: v.pollErrors,
        rate: v.ordinaryAcksPerSecond,
        index: v.before.indexBasis,
        basis: v.before.basis,
      })),
    };
  } finally {
    ac.close();
  }
}
