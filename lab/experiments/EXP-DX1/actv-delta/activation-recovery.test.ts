import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { open } from "../act1/check.ts";
import { Account } from "./account.ts";
import { emptyAudit, query } from "./bench-rung.ts";
import { decodeOwed } from "./dispatch.ts";
import { epoch } from "./model.ts";
import { save } from "./save.ts";
import { CurrentDecisions, runValidClock } from "./service.ts";
import { Objects, hash } from "./store.ts";

const before = "2026-11-04T12:00:00.000000Z";
const effective = "2026-11-04T12:00:03.000000Z";
const day = "2026-11-05T00:00:00.000000Z";
const id = "pl:a";
const world: W0.World = {
  subject: id,
  facts: [
    { e: id, a: "location", v: "loc:l", tx: 1 },
    { e: "loc:l", a: "jurisdiction", v: "jur:j", tx: 1 },
    { e: "jur:j", a: "stateMinWageCents", v: 1000, tx: 1 },
    { e: "loc:l", a: "localMinWageCents", v: 2000, tx: 1 },
    { e: id, a: "payRateCents", v: 1500, tx: 1 },
    { e: id, a: "documents", v: id + "/doc:d", tx: 1 },
    { e: id + "/doc:d", a: "docType", v: "ead", tx: 1 },
    { e: id + "/doc:d", a: "expiresOn", v: "2026-11-04", tx: 1 },
  ],
};

test("a public reader and restarted time worker record future activation and expiry without a save", async () => {
  const c = await open("act1-" + randomUUID()),
    o = emptyAudit();
  const account = () => new Account(new Objects(c, "future"), "time-test");
  try {
    const a = account();
    await a.bootstrap([id], [world], { tx: 1, validTime: before }, true, "native");
    const scheduled = await a.seal("scheduled", W0.R2, { from: effective, durability: "record" });
    assert.equal((await a.readAt(id, scheduled.position, before)).output.release, W0.R1.hash);
    const current = await new CurrentDecisions(account(), () => effective).read(id);
    assert(current.position > scheduled.position);
    assert.equal(current.output.release, W0.R2.hash);
    assert.deepEqual(current.output.basis, { tx: current.position, validTime: effective });
    assert.deepEqual(
      await query(o, "raw-answers", {
        worlds: [world],
        doc: W0.R2.doc,
        basis: current.output.basis,
      }),
      [[id, hash(JSON.parse(W0.outputJson(current.output)))]],
    );
    const w = await decodeOwed(account(), current.seq, current.position);
    const owed: string[] = [];
    for await (const { chunk } of w.chunks) owed.push(chunk.deliveries);
    assert(owed.some((b) => b.includes("notify.pay")));
    const controller = new AbortController();
    const reopened = account();
    await runValidClock(
      {
        currentCut: async (now) => {
          const p = await reopened.currentCut(now);
          controller.abort();
          return p;
        },
      },
      controller.signal,
      () => day,
    );
    const p = await c.currentPosition(),
      h = (await reopened.head(p)).value;
    assert.equal(h.basis.validTime, day);
    const expiry = await decodeOwed(reopened, h.seq, p);
    const notices: string[] = [];
    for await (const { chunk } of expiry.chunks) notices.push(chunk.deliveries);
    assert(notices.some((b) => b.includes("notify.document-expired")));
    assert.equal(
      (await reopened.readAt(id, scheduled.position, before)).output.release,
      W0.R1.hash,
    );
  } finally {
    o.close();
    await c.close();
  }
});

test("save-first, publish-first and a competing publisher keep the original native claim", async () => {
  const c = await open("act1-" + randomUUID());
  const account = () => new Account(new Objects(c, "race"), "ordering");
  try {
    const a = account(),
      r = account();
    await a.bootstrap([id], [world], { tx: 1, validTime: before });
    const first = await save(a, "save-first", [
      { e: id, a: "payRateCents", values: [1550], from: epoch },
    ]);
    await assert.rejects(
      a.seal("paused", W0.R2, {
        durability: "record",
        afterFence: async () => {
          throw Error("issuer interrupted before terminal commit");
        },
      }),
      /issuer interrupted/,
    );
    const p = await c.currentPosition();
    assert((await r.db.many(["fence"], p)).has("fence"));
    const recovered = await new CurrentDecisions(r, () => before).read(id);
    assert(recovered.position > first.position && recovered.position > p);
    assert.equal(recovered.output.release, W0.R2.hash);
    const receipt = await a.seal("paused", W0.R2, { durability: "record" });
    assert(receipt.retry && receipt.position === recovered.position);
    assert.equal(receipt.txId, (await r.seal("paused", W0.R2, { durability: "record" })).txId);
    assert((await r.db.many(["owed:" + receipt.seq], receipt.position)).size === 1);
    let competing: Awaited<ReturnType<Account["seal"]>> | undefined;
    const beforeSave = await a.seal("older-publish", W0.R3, {
      afterFence: async () => {
        competing = await r.seal("newer-publish", W0.R1);
      },
    });
    assert(competing && beforeSave.position < competing.position);
    const after = await save(r, "save-after", [
      { e: id, a: "payRateCents", values: [2100], from: epoch },
    ]);
    assert(after.position > competing.position);
    const latest = await new CurrentDecisions(r, () => before).read(id);
    assert.equal(latest.output.release, W0.R1.hash);
  } finally {
    await c.close();
  }
});
