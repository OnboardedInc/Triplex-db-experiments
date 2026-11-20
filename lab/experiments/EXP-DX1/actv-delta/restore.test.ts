import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { memoryComposition } from "../../../bench/lib/memory.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";
import { save } from "./save.ts";
test("a restored pre-erasure database cannot serve a forgotten source key", async () => {
  const c = memoryComposition("datomic", randomUUID()),
    dir = mkdtempSync(path.join(os.tmpdir(), "delta-restore-")),
    s = "pl:x",
    a = new Account(new Objects(c, "target"), "private", dir);
  const old = await a.bootstrap(
    [s],
    [{ subject: s, facts: [{ e: s, a: "ssn", v: "000000001", tx: 1 }] }],
    { tx: 1, validTime: W0.POPULATION_VALID_TIME },
  );
  await save(a, "erase", [], { erase: s });
  const restored = new Account(
    new Objects({ ...c, currentPosition: async () => old.position }, "target"),
    "private",
    dir,
  );
  await assert.rejects(restored.readAt(s, old.position), /erasure frontier ahead/);
  const current = await a.readAt(s, old.position);
  assert(current.output.tasks.some((t) => t.kind === "everify.ssn-erased"));
});
