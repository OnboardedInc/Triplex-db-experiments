import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openComposition } from "../../../bench/lib/composition.ts";
import { W0 } from "../../../bench/lib/w0-world.ts";
import { Account } from "./account.ts";
import { Objects } from "./store.ts";
import { Receiver, drain } from "./dispatch.ts";
const r = JSON.parse(readFileSync(0, "utf8")),
  c = await openComposition("reach", "datomic", r.scope),
  a = new Account(new Objects(c, r.account), r.binding, r.keys);
try {
  if (r.operation === "read") {
    const v = await a.readAt(r.subject, r.position, r.valid);
    console.log(
      JSON.stringify({
        nonce: r.nonce,
        output: W0.outputJson(v.output),
        published: W0.publishJson({ state: v.state, deliveries: [] }),
      }),
    );
  } else {
    assert.equal(r.operation, "drain");
    const other = await openComposition("reach", "datomic", r.scope + "-sink");
    try {
      console.log(
        JSON.stringify({
          nonce: r.nonce,
          result: await drain(a, new Receiver(new Objects(other, r.account)), r.seq, (stage) => {
            if (r.cutAt === stage) {
              process.stdout.write(JSON.stringify({ nonce: r.nonce, cutAt: stage }) + "\n", () =>
                process.exit(0),
              );
              return new Promise<void>(() => {});
            }
          }),
        }),
      );
    } finally {
      await other.close();
    }
  }
} finally {
  await c.close();
}
