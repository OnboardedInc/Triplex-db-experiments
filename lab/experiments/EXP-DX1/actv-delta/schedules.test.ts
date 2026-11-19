import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { open } from "../act1/check.ts";
import { DomainOracle, emptyWireState } from "../../../bench/lib/w0-gates.ts";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects, hash } from "./store.ts";
import { save } from "./save.ts";
import { drain, expand, concrete, Receiver } from "./dispatch.ts";
import { epoch, encodeBig, decodeBig, type Edit, type Recipe } from "./model.ts";
const valid = W0.POPULATION_VALID_TIME,
  oldDate = "2026-10-05T12:00:00.000000Z",
  s = "pl:a",
  empty = "pl:empty",
  other = "pl:b";
const f = (e: string, a: string, v: W0.Fact["v"], tx = 1): W0.Fact => ({ e, a, v, tx });
function worlds() {
  const base = [
    f("loc:l", "jurisdiction", "jur:j002"),
    f("jur:j002", "stateMinWageCents", 1650),
    f("loc:l", "localMinWageCents", 1800),
  ];
  return [
    {
      subject: s,
      facts: [
        ...base,
        f(s, "payRateCents", 1600),
        f(s, "location", "loc:l"),
        f(s, "weeklyMinutes", 2500),
        f(s, "ssn", "synthetic-field"),
        f(s, "documents", s + "/doc:d"),
        f(s + "/doc:d", "docType", "ead"),
        f(s + "/doc:d", "expiresOn", "2026-11-04"),
      ],
    },
    {
      subject: other,
      facts: [
        ...base,
        f(other, "payRateCents", 1650),
        f(other, "location", "loc:l"),
        f(other, "weeklyMinutes", 2400),
      ],
    },
    { subject: empty, facts: [] },
  ];
}
async function fixture() {
  const scope = "act1-" + randomUUID(),
    binding = hash([scope, "schedules"]),
    keys = fs.mkdtempSync(path.join(process.env.DELTA_ATTEMPT ?? os.tmpdir(), "keys-")),
    comp = await open(scope),
    sinkComp = await open(scope + "-sink"),
    db = new Objects(comp, "target"),
    a = new Account(db, binding, keys),
    sink = new Receiver(new Objects(sinkComp, "target")),
    source = worlds();
  const seeded = await a.bootstrap([s, other, empty], source, { tx: 10, validTime: valid });
  return {
    scope,
    binding,
    keys,
    a,
    db,
    comp,
    sink,
    sinkComp,
    source,
    seeded,
    close: async () => {
      await comp.close();
      await sinkComp.close();
    },
  };
}
const change = (e: string, a: string, v: W0.Fact["v"] | null, from = epoch): Edit => ({
  e,
  a,
  values: v === null ? [] : [v],
  from,
});
const fresh = (r: any) => {
  const nonce = randomUUID();
  const v = JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", path.join(import.meta.dirname, "reopen.ts")],
      {
        input: JSON.stringify({ ...r, nonce, account: "target" }),
        encoding: "utf8",
        timeout: 60000,
      },
    ).trim(),
  );
  assert.equal(v.nonce, nonce);
  return v;
};
test("release, facts and time fence held results including no-body subjects and equal-tx earlier time", async () => {
  for (const sample of ["held pay", "empty", "earlier valid"]) {
    const g = await fixture();
    try {
      const subject = sample === "empty" ? empty : s,
        held = await g.a.readAt(subject, g.seeded.position);
      const earlier = await g.a.readAt(subject, g.seeded.position, "2026-11-04T11:59:59.999999Z");
      await assert.rejects(g.a.admit("earlier", earlier), /stale/);
      await save(g.a, "live", [change(subject, "payRateCents", sample === "empty" ? 1650 : 1600)], {
        originTx: 20,
      });
      const cut = await g.comp.currentPosition(),
        now = await g.a.readAt(subject, cut);
      const equalTxEarlier = await g.a.readAt(subject, cut, "2026-11-04T11:59:59.999999Z");
      await assert.rejects(g.a.admit("older-time-at-20", equalTxEarlier), /stale/);
      await assert.rejects(g.a.admit("held", held), /stale/);
      assert.equal(await g.comp.currentPosition(), cut);
      await g.a.admit("equal-event", now);
      const after = await g.a.readAt(subject, await g.comp.currentPosition());
      assert.equal(encodeBig(after.state), encodeBig(now.state));
      const sealed = await g.a.seal("next", W0.R2);
      await assert.rejects(g.a.admit("after-seal", now), /stale/);
      const retry = await g.a.admit("equal-event", now);
      assert(retry.retry);
      await assert.rejects(g.a.seal("next", W0.R3), /identity reused/);
      await assert.rejects(g.a.readAt("pl:foreign", sealed.position), /outside/);
      if (process.env.DX_ACT1_NATIVE === "1") {
        const v = await g.a.readAt(subject, sealed.position),
          restored = fresh({
            operation: "read",
            subject,
            scope: g.scope,
            binding: g.binding,
            keys: g.keys,
            position: sealed.position,
          });
        assert.equal(restored.output, W0.outputJson(v.output));
        assert.equal(restored.published, W0.publishJson({ state: v.state, deliveries: [] }));
      }
    } finally {
      await g.close();
    }
  }
});
test("two native CAS orderings, shared two-hop changes, missing floors, reparent and 30-day correction", async () => {
  for (const winner of ["save", "release"]) {
    const g = await fixture(),
      o = new DomainOracle();
    try {
      const before = await g.a.readAt(s, g.seeded.position);
      const commit = () =>
        save(g.a, "shared", [change("jur:j002", "stateMinWageCents", 1900, oldDate)]);
      if (winner === "save")
        await g.a.seal("R2", W0.R2, {
          beforeCas: async () => {
            await commit();
          },
        });
      else
        await save(g.a, "shared", [change("jur:j002", "stateMinWageCents", 1900, oldDate)], {
          beforeCas: async () => {
            await g.a.seal("R2", W0.R2);
          },
        });
      await assert.rejects(g.a.admit("delayed", before), /stale/);
      const inspect = async (subject: string, floor: number | null, restored = false) => {
        const v = await g.a.readAt(subject, await g.comp.currentPosition()),
          wi = v.output.workItems.find((i) => i.rule === "MINWAGE");
        if (floor === null) assert(!wi);
        else assert.equal(JSON.parse(wi!.payload).floorCents, floor);
        const w = {
          subject,
          facts: g.source
            .find((w) => w.subject === subject)!
            .facts.map((f) =>
              f.e === "jur:j002" && f.a === "stateMinWageCents"
                ? { ...f, v: 1900, tx: winner === "save" ? 11 : 12 }
                : f,
            ),
        };
        if (restored) {
          w.facts = w.facts
            .filter((f) => f.a !== "localMinWageCents")
            .map((f) => (f.a === "jurisdiction" ? { ...f, tx: 15 } : f));
        }
        if (floor === 1900)
          assert.equal(
            W0.outputJson(v.output),
            await o.call("evaluate", { world: w, release: "R2", basis: v.output.basis }),
          );
      };
      await inspect(s, 1900);
      await inspect(other, 1900);
      await save(g.a, "local", [change("loc:l", "localMinWageCents", 2000)]);
      await inspect(s, 2000);
      await save(g.a, "unlink", [
        change("loc:l", "jurisdiction", "jur:absent"),
        change("loc:l", "localMinWageCents", null),
      ]);
      await inspect(other, null);
      await save(g.a, "restore", [change("loc:l", "jurisdiction", "jur:j002")]);
      await inspect(s, 1900, true);
      const older = await g.a.readAt(s, g.seeded.position);
      assert.equal(W0.outputJson(older.output), W0.outputJson(before.output));
      const retro = await g.a.readAt(
        s,
        await g.comp.currentPosition(),
        "2026-10-06T12:00:00.000000Z",
      );
      assert.equal(retro.output.release, W0.R1.hash);
    } finally {
      o.close();
      await g.close();
    }
  }
});
test("two releases before draining, lost acknowledgements and restart at every dispatch boundary", async () => {
  const g = await fixture(),
    oracle = new DomainOracle();
  try {
    const init = await drain(g.a, g.sink, 0),
      before = await g.a.readAt(s, g.seeded.position);
    const untouched = await g.comp.currentPosition();
    await assert.rejects(
      g.a.seal("before", W0.R2, {
        beforeCas: async () => {
          throw Error("before commit");
        },
      }),
      /before commit/,
    );
    assert.equal(await g.comp.currentPosition(), untouched);
    let lost = -1;
    const intercepted = new Account(
      new Objects(
        {
          ...g.comp,
          transact: async (...args: Parameters<typeof g.comp.transact>) => {
            const r = await g.comp.transact(...args);
            assert(r.ok);
            lost = r.value.position;
            throw Error("lost ACK");
          },
        },
        "target",
      ),
      g.binding,
      g.keys,
    );
    await assert.rejects(intercepted.seal("broad", W0.R2), /lost ACK/);
    const r = await g.a.seal("broad", W0.R2);
    assert(r.retry && r.position === lost);
    const roll = await g.a.seal("rollback", W0.R1),
      v = await g.a.readAt(s, roll.position);
    const wages = v.state.pending.filter((d) => d.rule === "MINWAGE");
    assert.deepEqual(
      wages.map((d) => d.seq),
      [1n, 2n, 3n],
    );
    let expected = emptyWireState();
    for (const [position, name] of [
      [g.seeded.position, "R1"],
      [r.position, "R2"],
      [roll.position, "R1"],
    ] as const) {
      const actual = await g.a.readAt(s, position),
        output = JSON.parse(
          await oracle.call("evaluate", {
            basis: actual.output.basis,
            release: name,
            world: g.source[0],
          }),
        );
      expected = JSON.parse(
        await oracle.call("publish", {
          state: expected,
          evaluations: [
            {
              basis: output.basis,
              subject: s,
              release: output.release,
              workItems: output.workItems,
            },
          ],
        }),
      ).state;
      assert.deepEqual(
        JSON.parse(W0.publishJson({ state: actual.state, deliveries: [] })).state,
        expected,
      );
    }
    for (const phase of [
      "before-chunk",
      "after-chunk",
      "before-effect",
      "after-effect",
      "after-ack",
    ] as const) {
      if (process.env.DX_ACT1_NATIVE === "1") {
        const stopped = fresh({
          scope: g.scope,
          binding: g.binding,
          keys: g.keys,
          operation: "drain",
          seq: 2,
          cutAt: phase,
        });
        assert.equal(stopped.cutAt, phase);
        continue;
      }
      const failure = await drain(g.a, g.sink, 2, (stage) => {
        if (stage === phase) throw Error("interrupted " + stage);
      }).then(
        () => null,
        (e: Error) => e,
      );
      assert(failure?.message.includes(phase), phase);
    }
    if (process.env.DX_ACT1_NATIVE === "1")
      fresh({ scope: g.scope, binding: g.binding, keys: g.keys, operation: "drain", seq: 2 });
    else await drain(g.a, g.sink, 2);
    const chunks = await concrete(g.db, await expand(g.a, 2));
    assert(chunks.length);
    const effects = await g.sink.db.get<string>(
      "sink:" + wages[0]!.id,
      await g.sinkComp.currentPosition(),
    );
    assert.equal(decodeBig<W0.ReceiverState>(effects.value).effects[0]!.done, 3n);
    const extra = new Receiver(new Objects(g.sinkComp, "gap"));
    let receiver = { effects: [], projection: [] };
    for (const [i, n] of [0, 0, 2, 2, 1].entries()) {
      const d = wages[n]!,
        actual = await extra.send("msg" + i, [d]);
      const wire = { ...d, seq: Number(d.seq), payload: JSON.parse(d.payload) };
      const wanted = JSON.parse(
        await oracle.call("receive", { state: receiver, deliveries: [wire] }),
      );
      receiver = wanted.state;
      const want = wanted.applied.effects.map((x: any) => [x.id, x.seq]),
        got = decodeBig<any>(actual.applied).effects.map((x: W0.Delivery) => [x.id, Number(x.seq)]);
      assert.deepEqual(got, want);
    }
    assert(init.applied > 0 && before.state.items.length);
  } finally {
    oracle.close();
    await g.close();
  }
});
test("future release, midnight without a source write, protected erasure and corrupt root refusal", async () => {
  const g = await fixture();
  try {
    const now = await g.a.readAt(s, g.seeded.position),
      future = "2026-11-05T00:00:00.000000Z";
    const staged = await g.a.seal("future", W0.R2, { from: future });
    assert.equal((await g.a.readAt(s, staged.position)).output.release, W0.R1.hash);
    const clock = await g.a.seal("time", W0.R2, { from: future, valid: future });
    const v = await g.a.readAt(s, clock.position);
    assert.equal(v.output.release, W0.R2.hash);
    assert(v.output.workItems.some((w) => w.rule === "DOCEXP"));
    assert(!now.output.workItems.some((w) => w.rule === "DOCEXP"));
    await save(g.a, "erased", [], { erase: s });
    const past = await g.a.readAt(s, g.seeded.position);
    assert(past.output.tasks.some((t) => t.kind === "everify.ssn-erased"));
    assert(!fs.existsSync(path.join(g.keys, hash("wrong"))) && fs.readdirSync(g.keys).length === 0);
    await assert.rejects(g.a.admit("held-old-identity", now), /stale/);
    const p = await g.comp.currentPosition(),
      root = await g.db.get<any>("tree", p);
    await g.db.commit("bad-root", [
      { key: "tree", prior: root, value: { ...root.value, members: [] } },
    ]);
    await assert.rejects(g.a.seal("blocked", W0.R3), /root mismatch/);
  } finally {
    await g.close();
  }
});
