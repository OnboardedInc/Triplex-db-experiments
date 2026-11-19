import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { checkPush } from "./push-check.ts";
import { valid } from "./fixture.ts";
import { itemRoot, pendingRoot } from "./decision.ts";
import type { Store } from "./store.ts";

test("the offline bench checker detects a missing changed owner and a substituted receiver payload", async () => {
  const dir = mkdtempSync(join(tmpdir(), "lazy-check-")),
    path = join(dir, "sink.sqlite"),
    db = new DatabaseSync(path);
  const roster = [W0.placementId(0), W0.placementId(1)];
  const world = (i: number): W0.World => ({
    subject: roster[i]!,
    facts: [
      { e: roster[i]!, a: "location", v: "loc:m", tx: 1 },
      { e: "loc:m", a: "jurisdiction", v: "jur:m", tx: 1 },
      { e: "jur:m", a: "stateMinWageCents", v: 1650, tx: 1 },
      { e: "loc:m", a: "localMinWageCents", v: 1700, tx: 1 },
      { e: roster[i]!, a: "payRateCents", v: 1600 + i * 150, tx: 1 },
      { e: roster[i]!, a: "bgcStatus", v: "clear", tx: 1 },
    ],
  });
  const records = (name: "R1" | "R2", tx: number) =>
    roster.map((_, i) => {
      const o = W0.evaluateWorld(world(i), W0[name], { tx, validTime: valid });
      assert(!W0.isFailure(o));
      return W0.recordOf(o);
    });
  const base = W0.publish(W0.EMPTY_OUTBOX, records("R1", 1)),
    next = W0.publish(base.state, records("R2", 2));
  const changes: any[] = [];
  for (const d of next.deliveries) {
    changes.push({
      op: "assert",
      entityId: itemRoot(d.subject),
      attribute: "lazy/items",
      value: { value: canonical(next.state.items.filter((x) => x.subject === d.subject)) },
    });
    changes.push({
      op: "assert",
      entityId: pendingRoot(d.subject),
      attribute: "lazy/delivery",
      value: { value: canonical(d) },
    });
  }
  const feed = [
    { position: 2, actor: "lazy/input" },
    {
      position: 3,
      actor: "lazy/event",
      correlationId: JSON.stringify({
        context: { event: 2, eventId: "release-a", next: { done: 2 } },
      }),
      changes,
    },
  ];
  const store = {
    comp: { feedPage: async () => ({ transactions: feed }) },
    rows: async () =>
      roster.flatMap((s) => {
        const items = base.state.items.filter((x) => x.subject === s);
        return items.length ? [{ entityId: itemRoot(s), value: { value: canonical(items) } }] : [];
      }),
  } as unknown as Store;
  db.exec("CREATE TABLE applied(n INTEGER PRIMARY KEY,id TEXT,seq TEXT,body TEXT)");
  const insert = db.prepare("INSERT INTO applied(id,seq,body)VALUES(?,?,?)");
  for (const d of [...base.deliveries, ...next.deliveries])
    insert.run(d.id, String(d.seq), canonical(d));
  const run = () =>
    checkPush(
      store,
      roster,
      world,
      1,
      3,
      [{ name: "R2", tx: 2, receipt: "release-a" }],
      path,
      base.deliveries.length,
    );
  try {
    assert.equal((await run()).owed, 1);
    const missing = changes.shift();
    await assert.rejects(run);
    changes.unshift(missing);
    db.prepare("UPDATE applied SET body=? WHERE seq='2'").run(canonical(base.deliveries[0]));
    await assert.rejects(run);
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
