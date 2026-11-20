import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { open } from "../act1/check.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";
import type { Recipe } from "./model.ts";
test("missing derived page and release ancestor reopen their exact original journaled command", async () => {
  const c = await open("act1-" + randomUUID()),
    db = new Objects(c, "check"),
    a = new Account(db, "binding"),
    s = "pl:a";
  try {
    const f = (a: string, v: number | string): W0.Fact => ({ e: s, a, v, tx: 1 }),
      b = { tx: 1, validTime: W0.POPULATION_VALID_TIME };
    await a.bootstrap(
      [s],
      [{ subject: s, facts: [f("weeklyMinutes", 2500), f("startDate", "2026-11-01")] }],
      b,
    );
    const r = await a.seal("r2", W0.R2),
      ev = (await db.get<Recipe>("event:1", r.position)).value,
      good = await a.readAt(s, r.position);
    const missing = new Set([db.entity("page:0"), db.entity("event:1")]),
      damaged = new Account(
        new Objects(
          {
            ...c,
            sweepPage: async (roots, ...rest) => {
              const got = await c.sweepPage(roots, ...rest);
              return { ...got, rows: got.rows.filter((row) => !missing.has(row.entityId)) };
            },
          },
          "check",
        ),
        "binding",
      );
    assert.deepEqual(await damaged.selected(ev), await a.selected(ev));
    assert.equal(
      W0.outputJson((await damaged.readAt(s, r.position)).output),
      W0.outputJson(good.output),
    );
    const absent = { ...damaged.db.comp, feedPage: async () => ({ transactions: [] }) };
    const noJournal = new Account(new Objects(absent, "check"), "binding");
    const fallback = await noJournal.selected(ev);
    assert(fallback.full);
    assert.deepEqual(fallback.subjects, (await a.selected(ev)).subjects);
    await assert.rejects(noJournal.readAt(s, r.position), /journal prefix/);
  } finally {
    await c.close();
  }
});
