import assert from "node:assert/strict";
import test from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import type { AuditOffer } from "./audit-offers.ts";
import { emptyAudit, event, query } from "./bench-rung.ts";
import { openStored, persistPublication } from "./dispatch.ts";
import { AuditReplay } from "./audit-replay.ts";
import { CurrentDecisions } from "./service.ts";
import { Objects } from "./store.ts";

test("independent replay refuses a stored campaign with a broad notice missing", async () => {
  const c = memoryComposition("datomic", "durable-readback"),
    a = new Account(new Objects(c, "target"), "inputs"),
    scope = new Account(new Objects(c, "target"), "inputs"),
    id = "pl:a",
    validTime = W0.POPULATION_VALID_TIME,
    w: W0.World = {
      subject: id,
      facts: [
        { e: id, a: "location", v: "loc:a", tx: 1 },
        { e: id, a: "payRateCents", v: 1500, tx: 1 },
        { e: "loc:a", a: "localMinWageCents", v: 2000, tx: 1 },
      ],
    },
    basis = { tx: 1, validTime };
  try {
    const init = await a.bootstrap([id], [w], basis, true, "native");
    const ack = await a.seal("broad", W0.R2, { durability: "stored" });
    const durable = await persistPublication(a, ack.seq, ack.position);
    assert(durable.fresh);
    const data = await new CurrentDecisions(scope, () => validTime).read(id);
    const offer: AuditOffer = {
      id: "broad",
      order: 0,
      mode: "stored",
      phase: "broad",
      doc: W0.R2.doc,
      scheduled: 1,
      ingress: 2,
      ack: { at: 3, seq: ack.seq, position: ack.position, txId: ack.txId },
      owed: durable.lastNotice,
      stored: { at: durable.at, position: durable.position },
    };
    for (const corrupt of [false, true]) {
      const oracle = emptyAudit();
      try {
        await query(oracle, "source", [w]);
        await event(oracle, { seq: 0, basis, doc: W0.R1.doc });
        const replay = new AuditReplay(c, scope, oracle, basis, init.position);
        const proof = replay.verify(
          [offer],
          [
            {
              id,
              phase: "first",
              offer: 0,
              route: "public",
              invoked: 5,
              returned: 6,
              position: data.position,
              seq: data.seq,
              raw: W0.outputJson(data.output),
            },
          ],
          [id],
          {
            name: "fresh-process",
            read: async () => data,
            close: async () => {},
            proof: async (_mode, seq, cut) => {
              const x = await openStored(scope, seq, cut);
              return corrupt
                ? { ...x, chunks: x.chunks.map((c) => ({ ...c, deliveries: "[]" })) }
                : x;
            },
          },
        );
        if (corrupt) await assert.rejects(proof, /durable cut bytes differ/);
        else assert.equal((await proof).proofs[0]?.notices, 1);
      } finally {
        oracle.close();
      }
    }
  } finally {
    await c.close();
  }
});
