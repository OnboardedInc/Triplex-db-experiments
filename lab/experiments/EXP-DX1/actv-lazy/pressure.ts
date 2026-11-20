import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { bytes } from "../import1/source.ts";
import { Dispatcher } from "./dispatch.ts";
import { activation, openStore, fact } from "./store.ts";
import { rosterRoot, rosterSeal } from "./read.ts";
const s = await openStore("lazy-fifo-" + randomUUID()),
  liveWriter = await openStore(s.scope),
  d = new Dispatcher(s, "w0", 64),
  at = W0.POPULATION_VALID_TIME;
const ids = Array.from({ length: 64 }, (_, i) => W0.placementId(i)),
  agent = http.Agent.prototype as any,
  original = agent.addRequest;
try {
  await s.input("members", { kind: "baseline", at }, [
    fact(rosterRoot(0), "lazy/members", ids),
    fact("members/seal", "lazy/roster-seal", rosterSeal(ids)),
  ]);
  await d.drain();
  const save = (id: string) =>
    s.input(id, { kind: "source", at }, [
      {
        op: "assert",
        entityId: ids[0],
        attribute: "weeklyMinutes",
        value: { type: "integer", value: "2400" },
        validFrom: 0,
      },
    ]);
  const tick = performance.now();
  const base = await save("baseline");
  const baselineMs = performance.now() - tick;
  await d.drain();
  await activation(s, "R1", W0.R1, at);
  const sent = Promise.withResolvers<void>();
  agent.addRequest = function (req: http.ClientRequest, ...args: any[]) {
    if (req.method === "POST" && req.path.endsWith("/transact")) req.once("finish", sent.resolve);
    return original.call(this, req, ...args);
  };
  const work = d.step();
  await Promise.race([
    sent.promise,
    work.then(() => {
      throw Error("Missing native bulk transmission");
    }),
  ]);
  agent.addRequest = original;
  const offered = performance.now();
  // [DX-ACT1] Why: the second native writer starts as soon as the bulk POST leaves the client. Rejected: awaiting the batch first (that measures an artificial client delay).
  const queued = liveWriter.input("queued", { kind: "source", at }, [
    { op: "retract", id: base.changes[0].tripleId },
    {
      op: "assert",
      entityId: ids[0],
      attribute: "weeklyMinutes",
      value: { type: "integer", value: "2401" },
      validFrom: 0,
    },
  ]);
  const [{ batch, release }, { live, ack }] = await Promise.all([
    work.then((batch) => ({ batch, release: performance.now() })),
    queued.then((live) => ({ live, ack: performance.now() })),
  ]);
  assert(batch && batch.changedSubjects.length === 64);
  assert(live.position > batch.receipt.position);
  assert.equal(batch.deliveries.length, 64);
  writeFileSync(
    join(process.argv[2]!, "fifo.json"),
    JSON.stringify({
      scope: s.scope,
      base: base.txId,
      batch: batch.receipt.txId,
      live: live.txId,
      bulkPosition: batch.receipt.position,
      livePosition: live.position,
      owners: batch.changedSubjects.length,
      changes: batch.receipt.changes.length,
      bytes: Buffer.byteLength(bytes(batch.receipt.changes)),
      offered,
      release,
      ack,
      baselineMs,
      waitMs: Math.max(0, Math.min(release, ack) - offered),
      offerToAckMs: ack - offered,
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  agent.addRequest = original;
  d.close();
  await liveWriter.close();
  await s.close();
}
