import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Objects, hash } from "./store.ts";
import { Account } from "./account.ts";
import { save } from "./save.ts";
import { epoch, type Recipe } from "./model.ts";
import { packIndex, unpackIndex } from "./index-patch.ts";
import { projection } from "./rules.ts";
test("a sparse index can be reopened from its immutable base at each save without visiting unrelated people", async () => {
  const c = memoryComposition("datomic", "delta-patch-" + randomUUID()),
    db = new Objects(c, "t"),
    a = new Account(db, "patch"),
    basis = { tx: 1, validTime: W0.POPULATION_VALID_TIME },
    ids = Array.from({ length: 96 }, (_, i) => W0.placementId(i)),
    first = ids[0]!;
  try {
    const worlds = ids.map((s, i) => ({
      subject: s,
      facts: [
        { e: s, a: "weeklyMinutes", v: 2450 + i, tx: 1 },
        { e: s, a: "location", v: "loc:l", tx: 1 },
        { e: "loc:l", a: "jurisdiction", v: "jur:j002", tx: 1 },
      ],
    }));
    const seed = await a.bootstrap(ids, worlds, basis),
      cuts: number[] = [seed.position];
    for (const v of [1900, 2700, 2400])
      cuts.push(
        (
          await save(a, "minutes-" + v, [
            { e: first, a: "weeklyMinutes", values: [v], from: epoch },
          ])
        ).position,
      );
    const restored = new Account(new Objects(c, "t"), "patch");
    for (const [i, p] of cuts.entries()) {
      const h = (await restored.head(p)).value,
        b = (await restored.pages(h, p, [0])).get(0)!,
        wire = await c.sweepPage([db.entity("page:0")], { position: p, validAt: 0 });
      if (i) {
        const disk = JSON.parse(wire.rows[0]!.value.value);
        assert.equal(disk.from, (await db.get("page:0", cuts[0]!)).position);
        assert(typeof disk.patch === "string" && !Object.hasOwn(disk, "value"));
      }
      const actual = b.value.lists[JSON.stringify(["OT", "loc:l", ""])]!.find(
        (row) => row[1] === first,
      )![0];
      assert.equal(actual, [2450, 1900, 2700, 2400][i]);
    }
    const pos = await c.currentPosition(),
      before = await db.get("page:0", pos),
      root = await db.get("tree", pos);
    const other = await save(a, "background", [
      { e: first, a: "bgcStatus", values: ["clear"], from: epoch },
    ]);
    assert.equal((await db.get("page:0", other.position)).id, before.id);
    assert.equal((await db.get("tree", other.position)).id, root.id);
    const broad = await a.seal("broad", W0.R2),
      narrow = await a.seal("narrow", W0.R3);
    for (const result of [broad, narrow]) {
      const rec = (await db.get<Recipe>("event:" + result.seq, result.position)).value,
        found = await restored.selected(rec);
      const old = await a.views(ids, rec.sourceCut),
        next = await a.views(ids, result.position);
      assert.deepEqual(
        found.subjects,
        ids.filter(
          (s) =>
            hash([...projection(old.get(s)!.output)]) !==
            hash([...projection(next.get(s)!.output)]),
        ),
      );
    }
    const base = { x: [0, 1, 2], state: { a: 1, b: 2 } },
      changed = { x: [0, 3, 4, 2], state: { a: 0, c: "new" } };
    assert.deepEqual(unpackIndex(base, packIndex(base, changed)), changed);
  } finally {
    await c.close();
  }
});

test("a newly tracked document type takes the full path and closed cases write no postings", async () => {
  const c = memoryComposition("datomic", "delta-untracked-" + randomUUID()),
    a = new Account(new Objects(c, "t"), "documents"),
    id = "pl:a",
    doc = id + "/doc:one",
    basis = { tx: 1, validTime: W0.POPULATION_VALID_TIME },
    input: W0.World = {
      subject: id,
      facts: [
        { e: id, a: "documents", v: doc, tx: 1 },
        { e: doc, a: "docType", v: "passport", tx: 1 },
        { e: doc, a: "expiresOn", v: "2026-11-04", tx: 1 },
        { e: id, a: "weeklyMinutes", v: 0, tx: 1 },
      ],
    };
  try {
    const seed = await a.bootstrap([id], [input], basis),
      h = (await a.head(seed.position)).value,
      page = (await a.pages(h, seed.position, [0])).get(0)!.value;
    assert.equal(Object.values(page.lists).flat().length, 0);
    const newDoc = W0.compileRelease({
        ...W0.R1.doc,
        rules: W0.R1.doc.rules.map((r) =>
          r.id === "DOCEXP" ? { ...r, params: { leadDays: { passport: 30 } } } : r,
        ),
      } as W0.ReleaseDoc),
      result = await a.seal("track-passports", newDoc),
      rec = await a.db.get<Recipe>("event:" + result.seq, result.position);
    assert(rec.value.shape === "full" && rec.value.fullCheck?.people === 1);
    const answer = await a.readAt(id, result.position);
    assert(answer.output.tasks.some((task) => task.kind === "doc.reverify"));
  } finally {
    await c.close();
  }
});
