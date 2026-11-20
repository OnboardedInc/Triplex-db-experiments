import assert from "node:assert/strict";
import { pinnedLoop, populate, receipts } from "../ha1/one-db.ts";
import { sleep } from "../ha1/common.ts";
import type { SyncPair } from "./pair.ts";
import { driveOffers } from "./offers.ts";

export async function smoke(pair: SyncPair, people: number) {
  const { ac, setup: population } = await pair.open({ init: (a) => populate(pair.s, a, people) });
  const copy = await pair.clone();
  await pair.service();
  const old = await ac.send(ac.intent("old", 10));
  await ac.pinned(old);
  const offers = await driveOffers(pair.s.e, ac, old, {
    writer: pair.route!.url,
    reader: pair.reader,
  });
  await offers.lead();
  let faultAt: number | undefined;
  const marks = () => ({
    ...(faultAt === undefined ? {} : { fault: faultAt }),
    ...Object.fromEntries(
      pair.transitions.filter((s) => s.stage === "routed").map((s) => [s.stage, s.at]),
    ),
  });
  const monitor = pinnedLoop(ac, old);
  try {
    const control = pair.supervisor().run("fault", "single-copy-after-fence");
    control.catch(() => {});
    await sleep(350);
    const fault = await pair.s.kill("pg");
    faultAt = fault.from;
    await control;
    const availability = await offers.finish(marks(), true);
    const fresh = await ac.send(ac.intent("survived", 10));
    const firstAt = ac.arrivals.get(fresh.operationId)!;
    const reads = await monitor.finish();
    assert(pair.account === ac);
    await offers.resolve();
    await receipts(ac);
    const audit = await ac.verify();
    assert(reads.some((v) => v.start > fault.from && v.end < firstAt && v.code === "ok"));
    return {
      population,
      copy,
      fault,
      firstMs: firstAt - fault.from,
      availability,
      reads,
      old,
      fresh,
      audit,
      durability: "single-copy-after-fence",
      kind: "process-loss diagnostic",
    };
  } finally {
    await offers.finish(marks());
    await monitor.finish();
  }
}
