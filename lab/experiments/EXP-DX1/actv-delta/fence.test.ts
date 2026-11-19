import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { open } from "../act1/check.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Objects } from "./store.ts";
import { Account } from "./account.ts";
import { epoch } from "./model.ts";
import { save } from "./save.ts";

test("a new process can finish an admitted release and a stale save cannot invalidate the seal", async () => {
  const comp = await open("act1-" + randomUUID()),
    db = new Objects(comp, "target"),
    a = new Account(db, "race"),
    id = "pl:a",
    basis = { tx: 1, validTime: W0.POPULATION_VALID_TIME };
  try {
    await a.bootstrap([id], [{ subject: id, facts: [] }], basis);
    let attempted = 0,
      conflicted = 0;
    const second = new Account(
      new Objects(
        {
          ...comp,
          transact: async (ops, meta) => {
            const r = await comp.transact(ops, meta);
            if (String(meta.commandId).endsWith("cmd:event:offered")) {
              attempted++;
              if (!r.ok) conflicted++;
            }
            return r;
          },
        },
        "target",
      ),
      "race",
    );
    const held = await a.readAt(id, await comp.currentPosition());
    const s = await save(
      second,
      "save",
      [{ e: id, a: "weeklyMinutes", values: [2700], from: epoch }],
      {
        beforeCas: async () => {
          await assert.rejects(
            a.seal("offered", W0.R2, {
              afterFence: async () => {
                throw Error("publisher died");
              },
            }),
            /publisher died/,
          );
        },
      },
    );
    const r = await second.seal("offered", W0.R2);
    assert(r.retry && r.seq === 1 && s.seq === 2 && r.position < s.position);
    assert(attempted === 1 && conflicted === 0);
    await assert.rejects(second.admit("late", held), /stale/);
    const read = await second.readAt(id, s.position);
    assert.equal(read.output.release, W0.R2.hash);
    assert.equal(read.body.changes[0]?.values[0], 2700);
    assert.deepEqual((await second.decisionsAt([id], s.position)).out.get(id), read.output);
  } finally {
    await comp.close();
  }
});
