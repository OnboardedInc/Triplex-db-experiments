// [EXP-P5N] Why: D1 must keep the old fact order byte for byte. Rejected: trusting "same comparator" by reading (the order feeds every world digest).
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonical, worldOf, type WorldRow } from "../lib/w0-world.ts";
import { Rng } from "../lib/rng.ts";
const oldWorldOf = (subject: string, rows: readonly WorldRow[]) => {
  const facts = rows.map((r) => ({
    e: r.entityId,
    a: r.attribute,
    v: r.value.type === "integer" ? Number(r.value.value) : r.value.value,
    tx: r.position,
  }));
  facts.sort((a, b) => Buffer.compare(Buffer.from(canonical(a)), Buffer.from(canonical(b))));
  return { subject, facts };
};
test("D1 world order equals the per-comparison canonical order", () => {
  const rng = new Rng(12345);
  const strings = ["a", "b", "é", "z", "\u{1F600}", "�", "", "10", "9", "ab", "a\u0000b"];
  const rows: WorldRow[] = Array.from({ length: 600 }, (_, i) => {
    const kind = rng.int(3);
    return {
      id: "id" + i,
      entityId: "ent:" + strings[rng.int(strings.length)] + rng.int(40),
      attribute: ["name", "wage", "location", "documents"][rng.int(4)]!,
      value:
        kind === 0
          ? { type: "integer", value: String(rng.int(100000) - 500) }
          : kind === 1
            ? { type: "boolean", value: rng.int(2) === 1 }
            : { type: "string", value: strings[rng.int(strings.length)]! + rng.int(7) },
      position: rng.int(5000),
      validFrom: 0,
    };
  });
  assert.equal(canonical(worldOf("s", rows)), canonical(oldWorldOf("s", rows)));
});
// [EXP-P5N] Why: D3 and D5 change who reads SQLite and who publishes; the same 50 subjects must give the same world hashes through the owner route and the direct route at several worker counts.
// Rejected: only the 10k screen (a divergence there would cost a full run to find).
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openMappedHost } from "../lib/host-store.ts";
import { runW0Sweep, subjectList } from "../lib/sweep.ts";
import { V_W0, W0, reachableRows, sha256 } from "../lib/w0-world.ts";
test("direct-read pipelined sweep gives the owner route's world hashes at W=1,2,3", { timeout: 240000 }, async () => {
  const dir = path.resolve("runs/P5N-tests", randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  const h = await openMappedHost(path.join(dir, "store"), "p5n-direct-test:" + randomUUID());
  try {
    const seed = await h.seed(200, dir);
    const basis = { position: seed.basis.tx, validAt: V_W0 },
      subjects = subjectList(200),
      expected = new Map<string, string>();
    for (let o = 0; o < subjects.length; o += 64) {
      const ss = subjects.slice(o, o + 64),
        page = await h.comp.sweepPage(ss, basis);
      for (const s of ss) expected.set(s, sha256(canonical(worldOf(s, reachableRows([s], page.rows)))));
    }
    for (const workers of [1, 2, 3]) {
      const got = new Map<string, string>();
      const r = await runW0Sweep({
        comp: h.comp,
        composition: "host",
        lane: "qlever",
        scope: "p5n-direct-test",
        subjects,
        basis,
        sweepId: "direct-" + workers,
        cursor: path.join(dir, `cursor-${workers}.json`),
        workers,
        activations: [{ tx: basis.position, from: W0.POPULATION_VALID_TIME, release: W0.R2.hash }],
        directReads: true,
        sampleEvery: 10,
        onPage: async (records) => {
          for (const x of records) {
            got.set(x.subject, x.worldSha256);
            assert.equal(x.world !== undefined, subjects.indexOf(x.subject) % 10 === 0);
          }
        },
      });
      assert.ok(r.complete);
      assert.equal(r.published.length, 4);
      assert.deepEqual([...got].sort(), [...expected].sort());
    }
  } finally {
    await h.comp.close();
  }
});

// [EXP-P5N] Why: the reverse journal channel (a value match on :_tx/changed-entity from the changed entity) scans the journal on an H1 store, so it is checked here on a small store.
test("journal reverse match finds the commit from the changed entity", { timeout: 120000 }, async () => {
  const dir = path.resolve("runs/P5N-tests", randomUUID());
  fs.mkdirSync(dir, { recursive: true });
  const h = await openMappedHost(path.join(dir, "store"), "p5n-jnl-test:" + randomUUID());
  try {
    await h.seed(50, dir);
    const r: any = await h.comp.transact([{ op: "assert", entityId: "p5:x1", attribute: "p5/a", value: { type: "string", value: "v" }, validFrom: 0 }], { commandId: "p5n:jnl:1" });
    assert.ok(r.ok);
    const tr: any = await h.comp.transactionByCommand("p5n:jnl:1");
    const changed = await h.api.match({ attribute: ":_tx/changed-entity", value: { type: "ref", value: "p5:x1" } });
    assert.equal(changed.length, 1);
    assert.equal(changed[0].entityId, tr.value.txId);
    assert.equal((await h.api.match({ entityId: tr.value.txId, attribute: ":_tx/change" })).length, 1);
  } finally {
    await h.comp.close();
  }
});
