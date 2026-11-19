import assert from "node:assert/strict";
import { readFileSync, writeSync } from "node:fs";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";
const r = JSON.parse(readFileSync(0, "utf8"));
const c = await openComposition("reach", "datomic", r.scope),
  a = new Account(new Objects(c, r.account), r.binding);
await a.seal(r.command, W0.R2, {
  afterFence: async () => {
    const f = await a.db.get<{ id: string; source: string }>("fence", await c.currentPosition());
    assert(f.value.id === r.command && f.value.source === r.binding);
    writeSync(1, JSON.stringify({ nonce: r.nonce, fence: f.hash }) + "\n");
    process.kill(process.pid, "SIGKILL");
  },
});
throw Error("expected a crash before the seal");
