import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditConsumerAtomicity } from "../../packages/testkit/dist/feed/index.js";
import { Replay, indexFor, W0 } from "./lib/di01-harness.ts";
import { V_W0 } from "./lib/w0-world.ts";
test("atomicity audit checks every dependency table even when effects and checkpoint match", () => {
  const after = {
    effects: [],
    affected: [],
    checkpoint: { source: "s", token: "1" },
    dependencies: {
      di_ref: [{ entity: "pl:a" }],
      di_release: [{ release: "R2" }],
      di_boundary: [{ subject: "pl:a", at: 1 }],
      di_basis: [{ subject: "pl:a", position: "1" }],
      di_config: [{ config: "V" }],
    },
  };
  for (const key of Object.keys(after.dependencies)) {
    const observed = structuredClone(after);
    observed.dependencies[key as keyof typeof observed.dependencies] = [] as any;
    assert.throws(
      () =>
        auditConsumerAtomicity(
          observed,
          { before: { ...after, checkpoint: null }, after },
          "after-commit",
        ),
      /Nonatomic/,
    );
  }
});
test("erase counts as a write of the erased dependency pair", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "DI01-erase-")),
    r = new Replay(),
    d = indexFor(path.join(dir, "store.db"), r, V_W0, W0.R1);
  try {
    const p = r.add([["pl:a", "ssn", "123456789"]], V_W0);
    const entry: any = p.entries[0];
    entry.transactions[0].changes[0].op = "erase";
    entry.transactions[0].changes[0].erasureSeq = "1";
    await d.consume(null, p);
    assert.deepEqual(d.affectedAt("c", "0", "1"), ["pl:a"]);
  } finally {
    d.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("prepared deriver is bound to exact page bytes and checkpoint CAS precedes derivation", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "DI01-binding-")),
    r = new Replay(),
    d = indexFor(path.join(dir, "store.db"), r, V_W0);
  try {
    const page = r.add([["pl:a", "location", "loc:a"]], V_W0),
      derive = await d.prepare(page),
      changed = structuredClone(page) as any;
    changed.entries[0].transactions[0].changes[0].attribute = "documents";
    assert.throws(
      () => d.applyDerived("c", null, changed, derive),
      /Prepared dependency page changed/,
    );
    assert.equal(d.checkpoint("c"), null);
    assert.deepEqual(d.dependencySnapshot("c").di_ref, []);
    await d.consume(null, page);
    let called = false;
    assert.throws(
      () =>
        d.applyDerived("c", null, page, () => {
          called = true;
          return [];
        }),
      /Stale/,
    );
    assert.equal(called, false);
  } finally {
    d.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
