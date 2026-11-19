import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import http from "node:http";
import { openNative } from "./native.ts";
import { ImportLane } from "./lane.ts";
import { bytes, sha } from "./source.ts";
const id = randomUUID(),
  target = await openNative("import-live-" + id, "snapshot"),
  lane = new ImportLane(1),
  rows = [];
async function save(key: string, count: number) {
  const ops = Array.from({ length: count }, (_, i) => ({
    op: "assert",
    entityId: key,
    attribute: ":f" + i,
    value: { type: "integer", value: String(i) },
    validFrom: 1,
  }));
  const start = performance.now(),
    ack = await target.write(ops, { commandId: key, actor: "collision" }),
    end = performance.now();
  return { ack, start, end, ms: end - start, ops };
}
const agent = http.Agent.prototype as any,
  original = agent.addRequest;
let wire: (() => void) | undefined;
agent.addRequest = function (req: http.ClientRequest, ...args: any[]) {
  if (wire && req.method === "POST" && req.path.endsWith("/transact")) {
    const notify = wire;
    wire = undefined;
    req.once("finish", notify);
  }
  return original.call(this, req, ...args);
};
try {
  for (const width of [32, 160, 512])
    for (let repeat = 0; repeat < 3; repeat++)
      for (const ordering of ["concurrent", "fifo"] as const) {
        const key = [width, repeat, ordering].join("-"),
          base = await save("baseline-" + key, 10),
          bulkKey = "batch-" + key,
          liveKey = "save-" + key;
        const sent = Promise.withResolvers<void>();
        wire = sent.resolve;
        const bulk = lane.bulk(target.scopeName, () => save(bulkKey, width));
        await Promise.race([
          sent.promise,
          bulk.then(() => {
            throw Error("Missing native transmit boundary");
          }),
        ]);
        const offered = performance.now();
        // [DX-ACT1] Why: a later small request can overtake a transmitted bulk payload during gateway preparation. Rejected: attributing that race to a save queued behind the indivisible batch.
        const live = lane.live(async () => {
          if (ordering === "fifo") await bulk;
          return save(liveKey, 10);
        });
        const [b, l] = await Promise.all([bulk, live]);
        for (const [cmd, entry] of [
          [bulkKey, b],
          [liveKey, l],
        ] as const) {
          const claim = await target.transactionByCommand(cmd);
          assert(
            claim.ok &&
              claim.value.txId === entry.ack.txId &&
              claim.value.position === entry.ack.position,
          );
          const expected = entry.ops.map((o) => bytes([o.entityId, o.attribute, o.value])).sort();
          assert.deepEqual(
            claim.value.changes.map((o: any) => bytes([o.entityId, o.attribute, o.value])).sort(),
            expected,
          );
          const read = await target.pull(cmd, { recordedAt: entry.ack.instant, validAt: 1 });
          assert.deepEqual(
            read.triples.map((o) => bytes([o.entityId, o.attribute, o.value])).sort(),
            expected,
          );
        }
        const afterBulk = l.ack.position > b.ack.position;
        if (ordering === "fifo") assert(afterBulk && l.start >= b.end && b.end >= offered);
        rows.push({
          width,
          repeat,
          ordering,
          baselineMs: base.ms,
          bulkServiceMs: b.ms,
          liveServiceMs: l.ms,
          afterBulk,
          waitMs: l.start - offered,
          offerToAckMs: l.end - offered,
          remainingAtOfferMs: Math.max(0, b.end - offered),
          bulkPosition: b.ack.position,
          livePosition: l.ack.position,
          bulkId: b.ack.txId,
          liveId: l.ack.txId,
          bytes: Buffer.byteLength(bytes(b.ops)),
        });
      }
  assert.equal(rows.length, 18);
  writeFileSync(
    process.argv[2]!,
    bytes({ scope: target.scopeName, id, rows, hash: sha(bytes(rows)) }),
    { flag: "wx" },
  );
} finally {
  agent.addRequest = original;
  await target.close();
}
