// [DX-ACT8, third review] The stack checks of stack-r3.ts run in process over memstore.ts first (a dry run of the same
// code, so a run on the stack does not spend its slot on a harness error). Run:
//   node --experimental-strip-types --test lab/experiments/EXP-DX1/act10/stack-r3.test.ts
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { keyFor } from "../scale1/decision/plan.ts";
import { act8R3Stack } from "./stack-r3.ts";
import { Archive } from "../actv-lazy/join/archive.ts";
import { BulkQueue } from "../actv-lazy/join/bulk.ts";
import { Settlement } from "../actv-lazy/join/settlement.ts";
import { heldAccount, MemDb, memStore, Proc, seedAccount } from "./memstore.ts";

for (const k of ["TX2_ACCOUNT_KEYS", "TX2_SETTLE_FRAME_GUARDS", "TX2_LEDGER_CAP_AT_PUBLISH", "TX2_NOTICE_LEDGER", "TX2_SETTLE_CONTROL"]) delete process.env[k];

test("the third review's stack checks, in process (RO, TP, TF, TN, RS and the oracle)", async () => {
  const db = new MemDb("act8-r3-stack-" + process.pid, 7);
  db.maxYield = 0;
  const people = 4, cuts = new Map<string, number>();
  for (const index of [5, 6, 7]) cuts.set(keyFor(index), await seedAccount(db, keyFor(index), people));
  const out = mkdtempSync(path.join(os.tmpdir(), "act8-r3-"));
  let n = 0;
  const base = memStore(new Proc(db, "base"), heldAccount(keyFor(5), people, cuts.get(keyFor(5))!)) as any;
  await act8R3Stack({
    out, s: base, descriptor: { cut: 0, seal: "x", people }, attempt: "dryrun00",
    heldOf: (index) => heldAccount(keyFor(index), people, cuts.get(keyFor(index))!),
    open: async (held, permits) => {
      const p = new Proc(db, "p" + ++n);
      p.permits = permits;
      return memStore(p, held) as any; // one scope, as every store of the held database has
    },
    settlement: async (a) => {
      const p = new Proc(db, "settler" + ++n), held = (a as any).s.held, queue = new BulkQueue(1);
      const values = new (Archive as any)(a, memStore(p, held, db.scope + "-v" + n), queue, "values", "bytes", "progress");
      const notices = new (Archive as any)(a, memStore(p, held, db.scope + "-n" + n), queue, "notices", "bytes", "progress");
      return new (Settlement as any)(values, notices);
    },
  });
  const r = JSON.parse(readFileSync(path.join(out, "act8-r3-stack.json"), "utf8"));
  console.log("[stack-r3 dry] " + JSON.stringify(r).slice(0, 4000));
  assert.equal(r.pass, true);
});
