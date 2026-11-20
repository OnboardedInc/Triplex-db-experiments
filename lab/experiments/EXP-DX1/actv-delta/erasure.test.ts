import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { open } from "../act1/check.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";
import { save } from "./save.ts";
import { encodeBig } from "./model.ts";
test("erasing a protected input masks old domain reads and preserves the real historical published state", async () => {
  const c = await open("act1-" + randomUUID()),
    keys = mkdtempSync(path.join(process.env.DELTA_ATTEMPT ?? os.tmpdir(), "erase-proof-")),
    a = new Account(new Objects(c, "target"), "erasure", keys),
    s = "pl:a";
  try {
    await a.bootstrap([s], [{ subject: s, facts: [{ e: s, a: "ssn", v: "000000001", tx: 1 }] }], {
      tx: 1,
      validTime: W0.POPULATION_VALID_TIME,
    });
    const r = await a.seal("r2", W0.R2),
      prior = await a.readAt(s, r.position);
    assert(prior.output.workItems.some((w) => w.rule === "EVSUB"));
    await save(a, "erase", [], { erase: s });
    const after = await a.readAt(s, r.position);
    assert(!after.output.workItems.some((w) => w.rule === "EVSUB"));
    assert.equal(encodeBig(after.state), encodeBig(prior.state));
  } finally {
    await c.close();
  }
});
