import assert from "node:assert/strict";
import { traffic } from "../ha1/one-backup.ts";
import { pinnedLoop, populate, receipts, requestIndex, type Account } from "../ha1/one-db.ts";
import type { SyncPair } from "./pair.ts";
import { lsn, timeouts, wait } from "./supervisor.ts";
import { driveOffers } from "./offers.ts";
import { auditFeed } from "./faults.ts";

export async function moveDrill(
  pair: SyncPair,
  people: number,
  options: { seed?: (ac: Account) => Promise<unknown>; auditSeed?: boolean } = {},
) {
  const { ac, setup: population } = await pair.open({
    init: options.seed ?? (async (a) => populate(pair.s, a, people)),
  });
  const writer = traffic(ac, "precopy", 220);
  let copy: Awaited<ReturnType<SyncPair["clone"]>>;
  try {
    copy = await pair.clone();
  } finally {
    await writer.stop();
  }
  assert(writer.samples.length > 0);
  await pair.service();
  const before = await ac.send(ac.intent("before-planned-cut", 10, "move"));
  const old = await ac.send(ac.intent("old-basis", 10, "move"));
  const checkpoint = await requestIndex(ac);
  const witness = await ac.send(ac.intent("old-receipt", 10, "move"));
  const prior = await receipts(ac);
  await ac.pinned(old);
  const selected = ac.inputs.slice(-3);
  const offered = await driveOffers(pair.s.e, ac, old, {
    writer: pair.route!.url,
    reader: pair.reader,
  });
  await offered.lead();
  const monitor = pinnedLoop(ac, old);
  const command = ac.intent("after-planned-cut", 10, "move");
  const run = pair.supervisor().run("planned", "two-copy");
  run.catch(() => {});
  const marks = () =>
    Object.fromEntries(
      pair.transitions
        .filter((s) => s.stage === "sealed" || s.stage === "routed")
        .map((s) => [s.stage === "sealed" ? "fault" : "routed", s.at]),
    );
  try {
    const sealed = await wait(
      "planned writer fence",
      timeouts.replay + timeouts.control,
      async () => pair.transitions.find((s) => s.stage === "sealed"),
    );
    const sentAt = performance.now();
    const first = ac.send(command);
    first.catch(() => {});
    await run;
    const availability = await offered.finish(marks(), true);
    const fresh = await first;
    const at = ac.arrivals.get(command.operationId)!;
    const samples = await monitor.finish();
    const during = samples.filter((v) => v.start >= sealed.at && v.end <= at);
    assert(during.length && during.every((v) => v.code === "ok"));
    const cut = await pair.sql("target", "select pg_current_wal_flush_lsn()");
    const protectedLsn = await wait(
      "new receipt durably on A as a standby",
      timeouts.replay,
      async () => {
        const r = await pair.sql(
          "target",
          "select flush_lsn from pg_stat_replication where application_name='sync_a' and sync_state='sync' and state='streaming'",
        );
        return r && lsn(r) >= lsn(cut) ? r : undefined;
      },
    );
    assert.equal(await pair.sql("pg", "select pg_is_in_recovery()"), "t");
    assert.deepEqual(await ac.send(command), fresh);
    await ac.pinned(old);
    await ac.pinned(fresh);
    const traffic = await offered.resolve();
    const recovered = await receipts(ac);
    await pair.auditCheckpoint("after");
    const verified = await auditFeed(
      ac,
      options.auditSeed === false ? [...selected, command, ...traffic.inputs] : ac.inputs,
      options.auditSeed === false ? before.t.v : ac.cursor,
    );
    const result = {
      population,
      copy,
      copyWrites: writer.samples,
      checkpoint,
      witness,
      fresh,
      stages: pair.transitions,
      firstWritePauseMs: at - sealed.at,
      availability,
      offersRetried: traffic.settlements.filter((s) => s.disposition === "retried").length,
      offerAfterSealMs: sentAt - sealed.at,
      protectedLsn,
      prior,
      recovered,
      verified,
      pinnedSamples: samples,
      inPause: during.length,
      policy: "two-copy",
    };
    pair.s.e.write("move", result);
    return result;
  } finally {
    await offered.finish(marks());
    await monitor.finish();
    await run.catch(() => undefined);
  }
}
