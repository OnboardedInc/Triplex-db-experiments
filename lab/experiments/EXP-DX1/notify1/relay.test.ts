import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { openComposition } from "../../../bench/lib/composition.ts";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Dispatcher } from "./dispatcher.ts";
import { Fixture, originalWorld } from "./fixture.ts";
import { Notices, type Request, type Cut } from "./journal.ts";
import { Relay } from "./relay.ts";
import { Documents } from "./store.ts";
import { verify, type Offered } from "./verify.ts";
import { recipient } from "./worker.ts";

test("recipient checkpoint survives an erased historical source, overlapping consumers and a lost response", async () => {
  const epoch = randomUUID(),
    scope = "notice-relay-" + epoch,
    rx = "act1-notify-" + epoch;
  const native = process.env.NOTIFY_NATIVE === "1";
  const source = native
    ? await openComposition("reach", "datomic", scope)
    : memoryComposition("datomic", scope);
  const store = native
    ? await recipient(rx, process.env.NOTIFY_DIR!)
    : memoryComposition("datomic", rx);
  try {
    const n = 131,
      v = W0.POPULATION_VALID_TIME,
      fixture = new Fixture(source),
      seeds = await fixture.seed(n);
    const a = new Notices(source, "account", fixture),
      sink = new Documents(store, "effects"),
      relay = new Relay(a, sink, 2);
    await relay.create(epoch, v);
    const ids = Array.from({ length: n }, (_, i) => W0.placementId(i)),
      subject = ids[0]!,
      history: Offered[] = [];
    const release = async (id: string, r: "R1" | "R2") => {
      const req: Request = {
        id,
        kind: "activation",
        release: r,
        from: v,
        validTime: v,
        selection: { kind: "census" },
      };
      history.push({ req, receipt: await a.append(await a.observe(), req) });
    };
    await release("initial", "R1");
    await release("broad", "R2");
    let payAt = 0,
      erasedAt = 0;
    const save = async (kind: "reconcile" | "erase") => {
      const t = await a.observe(),
        req: Request = {
          id: kind,
          kind,
          release: t.value.release!,
          from: v,
          validTime: v,
          selection: { kind: "subjects", ids: [subject] },
        };
      const edit = await fixture.edit(
        subject,
        kind === "erase" ? { ssn: { erasedAt: v } } : { payRateCents: 1500 },
        { position: t.at, validTime: v },
      );
      const receipt =
        kind === "erase"
          ? await a.erase(t, req, edit.ops, edit.checks)
          : await a.append(t, req, edit.ops, edit.checks);
      history.push({ req, receipt });
      return receipt.position;
    };
    // [DX-STG1] Why: put the save, second release and erasure after replay validation but before the receiver commits. Rejected: testing cross-store ordering only at idle boundaries.
    const fault = new Documents(
      {
        ...store,
        transact: async (...args) => {
          payAt = await save("reconcile");
          await release("rollback", "R1");
          erasedAt = await save("erase");
          const ack = await store.transact(...args);
          assert(ack.ok);
          throw Error("lost committed receiver response");
        },
      },
      "effects",
    );
    await assert.rejects(new Relay(a, fault, 2).turn({}), /lost committed receiver response/);
    assert(payAt > 0 && erasedAt > payAt);
    const original = await source.currentPosition();
    if (native) {
      const request = { scope, nonce: epoch, subject, erased: erasedAt, action: "recipient-page" };
      const observed = JSON.parse(
        execFileSync(
          process.execPath,
          ["--experimental-strip-types", new URL("./restart.ts", import.meta.url).pathname],
          { input: JSON.stringify(request), encoding: "utf8" },
        ),
      );
      assert(
        observed.nonce === epoch &&
          observed.scope === scope &&
          observed.position === original &&
          observed.action === request.action,
      );
    }
    await assert.rejects(new Dispatcher(a, sink).turn(), /recipient/i);
    const masked = new Notices(source, "account", {
      identity: fixture.identity,
      roster: (cut) => fixture.roster(cut),
      worlds: (list, cut) => {
        assert(
          !(list.includes(subject) && cut.position < erasedAt),
          "historical protected input destroyed",
        );
        return fixture.worlds(list, cut);
      },
    });
    const open = new Relay(masked, sink, 2),
      competing = new Relay(masked, sink, 1);
    await Promise.all([open.drain(), competing.drain()]);
    const witness = async (list: string[], cut: Cut) =>
      list.map((id) => {
        const i = Number(id.slice(4)),
          w = originalWorld(i),
          pos = seeds[Math.floor(i / 128)]!;
        return {
          subject: id,
          facts: w.facts.map((f) => {
            if (id === subject && f.a === "payRateCents" && cut.position >= payAt)
              return { ...f, v: 1500, tx: payAt };
            if (id === subject && f.a === "ssn" && cut.position >= erasedAt)
              return { ...f, v: { erasedAt: v }, tx: erasedAt };
            return { ...f, tx: pos };
          }),
        };
      });
    const proof = await verify(open, ids, history, witness);
    assert.equal(proof.subjects, n);
    const effects = await open.effects();
    assert.deepEqual(
      effects.filter((d) => d.subject === subject && d.rule === "MINWAGE").map((d) => d.seq),
      [1n, 2n, 3n, 4n],
    );
    assert.equal(await source.currentPosition(), original);
    const before = await store.currentPosition();
    await new Relay(masked, sink, 2).drain();
    assert.equal(await store.currentPosition(), before);
    const replacement = memoryComposition("datomic", rx + "-replacement");
    try {
      await assert.rejects(
        new Relay(masked, new Documents({ ...replacement, scopeName: rx }, "effects"), 2).drain(),
        /identity|generation/,
      );
    } finally {
      await replacement.close();
    }
  } finally {
    await store.close();
    await source.close();
  }
});
