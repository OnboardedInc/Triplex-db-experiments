import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { openComposition } from "../../../bench/lib/composition.ts";
import { Fixture } from "./fixture.ts";
import { Notices, type Request } from "./journal.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Documents } from "./store.ts";
import { verify, type Offered } from "./verify.ts";

test("a document first supplied at Publish remains recoverable after a same-name release", async () => {
  const epoch = randomUUID(),
    v = W0.POPULATION_VALID_TIME;
  const open = (name: string) =>
    process.env.NOTIFY_NATIVE === "1"
      ? openComposition("reach", "datomic", name)
      : Promise.resolve(memoryComposition("datomic", name));
  const src = await open("document-" + epoch),
    rx = await open("recipient-" + epoch);
  try {
    const f = new Fixture(src),
      a = new Notices(src, "published", f),
      s = W0.placementId(0),
      history: Offered[] = [];
    await f.seed(4);
    await a.create(epoch, v);
    const publish = async (id: string, release: Request["release"], document?: W0.ReleaseDoc) => {
      const req: Request = {
        id,
        release,
        kind: "activation",
        from: v,
        validTime: v,
        selection: { kind: "census" },
        ...(document ? { document } : {}),
      };
      const tail = await a.observe(),
        receipt = await a.append(tail, req);
      history.push({ req, receipt });
      return receipt;
    };
    await publish("original", "R1");
    const rules = W0.R2.doc.rules.map((r) =>
      r.id === "MINWAGE" ? W0.R1.doc.rules.find((x) => x.id === r.id)! : r,
    );
    const doc = { ...W0.R2.doc, rules },
      actualHash = W0.compileRelease(doc).hash;
    assert.notEqual(actualHash, W0.R2.hash);
    const first = await publish("new-bytes", "R2", doc);
    const written = await a.event(2, first.position);
    assert.equal(written.value.nextHash, actualHash);
    assert.equal(canonical(written.value.document), canonical(doc));
    const live: Request = {
      id: "save",
      kind: "reconcile",
      release: "R2",
      from: v,
      validTime: v,
      selection: { kind: "subjects", ids: [s] },
    };
    const edit = await f.edit(
      s,
      { payRateCents: 1550 },
      { position: first.position, validTime: v },
    );
    history.push({
      req: live,
      receipt: await a.append(await a.observe(), live, edit.ops, edit.checks),
    });
    await publish("replace-same-name", "R2");
    const reopened = new Notices(src, "published", new Fixture(src)),
      worker = new Dispatcher(reopened, new Documents(rx, "rx"));
    await worker.drain();
    const proof = await verify(
      worker,
      await f.roster({ position: first.position, validTime: v }),
      history,
      (ids, cut) => f.worlds(ids, cut),
    );
    assert.deepEqual(proof.eventCounts.slice(1), [0, 1, 1]);
    assert.deepEqual(
      (await worker.effects())
        .filter((d) => d.subject === s && d.rule === "MINWAGE")
        .map((d) => d.seq),
      [1n, 2n, 3n],
    );
  } finally {
    await rx.close();
    await src.close();
  }
});
