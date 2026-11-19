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
const save = async (key: string, count: number) => {
  const ops = Array.from({ length: count }, (_, i) => ({
    op: "assert",
    entityId: key,
    attribute: ":f" + i,
    value: { type: "integer", value: String(i) },
    validFrom: 1,
  }));
  const since = performance.now(),
    ack = await target.write(ops, { commandId: key, actor: "collision" });
  const end = performance.now();
  return { ack, end, ms: end - since, ops };
};
const agent = http.Agent.prototype as any,
  original = agent.addRequest;
let wire: (() => void) | undefined;
agent.addRequest = function (req: http.ClientRequest, ...args: any[]) {
  if (wire && req.method === "POST" && req.path.endsWith("/transact")) {
    const sent = wire;
    wire = undefined;
    req.once("finish", sent);
  }
  return original.call(this, req, ...args);
};
try {
  for (const width of [32, 160, 512])
    for (let i = 0; i < 3; i++) {
      const base = await save("baseline-" + width + "-" + i, 10),
        bulkKey = "batch-" + width + "-" + i,
        liveKey = "save-" + width + "-" + i;
      const sent = Promise.withResolvers<void>();
      wire = sent.resolve;
      const bulk = lane.bulk(target.scopeName, () => save(bulkKey, width));
      await Promise.race([
        sent.promise,
        bulk.then(() => {
          throw Error("Missing native transmit boundary");
        }),
      ]);
      const offered = performance.now(),
        live = lane.live(() => save(liveKey, 10));
      const [b, l] = await Promise.all([bulk, live]);
      for (const [key, run] of [
        [bulkKey, b],
        [liveKey, l],
      ] as const) {
        const claim = await target.transactionByCommand(key);
        assert(
          claim.ok &&
            claim.value.txId === run.ack.txId &&
            claim.value.position === run.ack.position,
        );
        assert.deepEqual(
          claim.value.changes.map((c: any) => [c.entityId, c.attribute, c.value]),
          run.ops.map((o) => [o.entityId, o.attribute, o.value]),
        );
        const read = await target.pull(key, { recordedAt: run.ack.instant, validAt: 1 });
        assert.deepEqual(
          read.triples.map((c) => bytes([c.attribute, c.value])).sort(),
          run.ops.map((o) => bytes([o.attribute, o.value])).sort(),
        );
      }
      rows.push({
        width,
        i,
        baseline: base.ms,
        bulkService: b.ms,
        liveMs: l.ms,
        afterBulk: l.ack.position > b.ack.position,
        remainingAtOffer: Math.max(0, b.end - offered),
        bulkPosition: b.ack.position,
        livePosition: l.ack.position,
        bulkId: b.ack.txId,
        liveId: l.ack.txId,
        bytes: Buffer.byteLength(bytes(b.ops)),
      });
    }
  for (const w of [32, 160, 512])
    assert(
      rows.some((r) => r.width === w && r.afterBulk),
      "No ordered live collision at width " + w,
    );
  writeFileSync(
    process.argv[2]!,
    bytes({ scope: target.scopeName, id, rows, hash: sha(bytes(rows)) }),
    { flag: "wx" },
  );
} finally {
  agent.addRequest = original;
  await target.close();
}
