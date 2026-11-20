import assert from "node:assert/strict";
import { pinnedLoop, populate, receipts } from "../ha1/one-db.ts";
import { sleep } from "../ha1/common.ts";
import type { SyncPair } from "./pair.ts";

export async function smoke(pair: SyncPair, people: number) {
  const { ac, setup: population } = await pair.open({ init: (a) => populate(pair.s, a, people) });
  const copy = await pair.clone();
  await pair.service();
  const old = await ac.send(ac.intent("old", 10));
  await ac.pinned(old);
  const monitor = pinnedLoop(ac, old);
  try {
    const control = pair.supervisor().run("fault", "single-copy-after-fence");
    control.catch(() => {});
    await sleep(350);
    const fault = await pair.s.kill("pg");
    await control;
    const fresh = await ac.send(ac.intent("survived", 10));
    const firstAt = ac.arrivals.get(fresh.operationId)!;
    const reads = await monitor.finish();
    assert(pair.account === ac);
    await receipts(ac);
    const audit = await ac.verify();
    assert(reads.some((v) => v.start > fault.from && v.end < firstAt && v.code === "ok"));
    return {
      population,
      copy,
      fault,
      firstMs: firstAt - fault.from,
      reads,
      old,
      fresh,
      audit,
      durability: "single-copy-after-fence",
      kind: "process-loss diagnostic",
    };
  } finally {
    await monitor.finish();
  }
}
