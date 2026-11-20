import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { W0, canonical } from "../../../bench/lib/w0-world.ts";
import { DomainOraclePool } from "../../../bench/lib/w0-gates.ts";
import { itemRoot } from "./decision.ts";
import { valid } from "./fixture.ts";
import type { Store } from "./store.ts";

type Switch = { tx: number; name: "R1" | "R2" | "R3"; receipt: string };
const state = (items: any[]) => ({ items, subjects: [], pending: [] });
const unpack = (x: any) => ({ ...x, seq: Number(x.seq), payload: JSON.parse(x.payload) });
const visible = (rows: any[]) =>
  rows
    .filter((v) => !v.retired)
    .map(({ id, payload }) => [id, payload])
    .sort(([a], [b]) => a.localeCompare(b));
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);

// [DX-ACT1] Why: a fast cursor can skip a recipient or a retirement. Rejected: comparing delivery counts (two wrong owners can have the right count).
export async function checkPush(
  store: Store,
  roster: string[],
  worldAt: (ordinal: number, p: number) => W0.World,
  start: number,
  end: number,
  releases: Switch[],
  receiverPath: string,
  receiverStart: number,
) {
  const seen = new DatabaseSync(""),
    receiver = new DatabaseSync(receiverPath, { readOnly: true });
  const oracle = new DomainOraclePool(undefined, 2),
    proof = createHash("sha256");
  let changed = 0,
    owed = 0;
  try {
    seen.exec(
      "CREATE TABLE items(p INTEGER,s TEXT,body TEXT,PRIMARY KEY(p,s)); CREATE TABLE pending(p INTEGER,s TEXT,id TEXT,body TEXT,PRIMARY KEY(p,s,id)); BEGIN",
    );
    const item = seen.prepare("INSERT INTO items VALUES(?,?,?)"),
      pending = seen.prepare("INSERT INTO pending VALUES(?,?,?,?)");
    const switches = new Map(releases.map((r) => [r.tx, r]));
    let p = start;
    const closed = new Set<number>();
    while (p < end) {
      const page = await store.comp.feedPage(p, 32);
      assert(page.transactions.length);
      for (const row of page.transactions) {
        if (row.position > end) break;
        assert.equal(row.position, ++p);
        if (row.actor !== "lazy/event") continue;
        const ctx = JSON.parse(row.correlationId).context,
          sw = switches.get(ctx.event);
        if (sw) {
          assert.equal(ctx.eventId, sw.receipt);
          if (ctx.next.done === sw.tx) closed.add(sw.tx);
        }
        for (const x of row.changes) {
          if (x.op !== "assert" || x.entityId === "lazy/account/dispatcher") continue;
          assert(sw, "A revision or address-only trace save emitted a W0 item");
          if (x.attribute === "lazy/items") {
            const parts = JSON.parse(x.value.value).map(unpack);
            assert(parts.length && x.entityId === itemRoot(parts[0].subject));
            item.run(sw.tx, parts[0].subject, canonical(parts));
          } else {
            assert.equal(x.attribute, "lazy/delivery");
            const d = unpack(JSON.parse(x.value.value));
            assert.equal(x.entityId, "lazy/pending/" + d.subject);
            pending.run(sw.tx, d.subject, d.id, canonical(d));
          }
        }
      }
    }
    seen.exec("COMMIT");
    assert.equal(closed.size, releases.length);
    const observed = seen.prepare("SELECT body FROM items WHERE p=? AND s=?"),
      effects = seen.prepare("SELECT body FROM pending WHERE p=? AND s=? ORDER BY id");
    const getEffect = receiver.prepare("SELECT n,body FROM applied WHERE id=? AND seq=?");
    const broad = releases.filter(
      (sw, i) => (i ? releases[i - 1]!.name : "R1") === "R1" || sw.name === "R1",
    );
    const representatives = (["R1", "R2", "R3"] as const).map((name) => ({
      name,
      tx: releases.find((r) => r.name === name)?.tx ?? start,
    }));
    for (let lo = 0; lo < roster.length; lo += 32) {
      const ids = roster.slice(lo, lo + 32),
        native = await store.rows(ids.map(itemRoot), start);
      const by = new Map(
        native.map((row) => [row.entityId, JSON.parse(row.value.value).map(unpack)]),
      );
      const refs = await Promise.all(
        ids.map(async (subject, j) => {
          const evaluate = async (name: Switch["name"], tx: number) => {
            const o = JSON.parse(
              await oracle.call("evaluate", {
                world: worldAt(lo + j, tx),
                release: name,
                basis: { tx, validTime: valid },
              }),
            );
            assert(o.subject === subject && Array.isArray(o.workItems));
            return { subject, basis: o.basis, release: o.release, workItems: o.workItems };
          };
          const [initial, r2, r3] = await Promise.all(
            representatives.map((r) => evaluate(r.name, r.name === "R1" ? start : r.tx)),
          );
          assert.deepEqual(
            visible(r2!.workItems),
            visible(r3!.workItems),
            "R3 release-only push predicates diverged",
          );
          let items = by.get(itemRoot(subject)) ?? [],
            lastEffect = receiverStart;
          assert.deepEqual(
            visible(items),
            visible(initial!.workItems),
            "Window began without the R1 receiver baseline",
          );
          for (const sw of broad) {
            const ev = await evaluate(sw.name, sw.tx);
            const expected = JSON.parse(
              await oracle.call("publish", { state: state(items), evaluations: [ev] }),
            );
            const changedHere = !equal(expected.state.items, items);
            const actual = observed.get(sw.tx, subject);
            assert.equal(
              actual?.body ?? null,
              changedHere ? canonical(expected.state.items) : null,
            );
            if (changedHere) changed++;
            const emitted = effects.all(sw.tx, subject).map((r) => r.body);
            assert.deepEqual(
              emitted,
              expected.deliveries.map((x: any) => canonical(x)),
            );
            for (const d of expected.deliveries) {
              const applied = getEffect.get(d.id, String(d.seq));
              assert(
                applied &&
                  Number(applied.n) > lastEffect &&
                  equal(unpack(JSON.parse(String(applied.body))), d),
              );
              lastEffect = Number(applied.n);
              owed++;
            }
            items = expected.state.items;
          }
          return canonical([subject, items]);
        }),
      );
      for (const row of refs) proof.update(row + "\n");
    }
    assert.equal(seen.prepare("SELECT count(*) AS n FROM items").get()!.n, changed);
    assert.equal(seen.prepare("SELECT count(*) AS n FROM pending").get()!.n, owed);
    assert.equal(
      receiver.prepare("SELECT count(*) AS n FROM applied WHERE n>?").get(receiverStart)!.n,
      owed,
    );
    return {
      start,
      end,
      releases: releases.length,
      roster: roster.length,
      changed,
      owed,
      hash: proof.digest("hex"),
    };
  } finally {
    oracle.close();
    receiver.close();
    seen.close();
  }
}
