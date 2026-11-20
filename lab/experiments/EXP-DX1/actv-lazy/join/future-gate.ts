import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { openStore, millis } from "../store.ts";
import { seed, valid } from "../fixture.ts";
import { JoinedAccount } from "./account.ts";
import { Reference } from "./check.ts";

const s = await openStore("lazy-future-gate-" + randomUUID());
const f = await seed(s, 64),
  a = new JoinedAccount(s),
  ref = new Reference();
const future = new Date(millis(valid) + 3600000).toISOString().replace("Z", "000Z");
try {
  await a.install(f.roster, valid);
  const before = await a.publish("first", W0.R1.doc, valid, "owed");
  const d = structuredClone(W0.R1.doc);
  Object.assign(d.rules.find((r) => r.id === "OT")!, { params: { thresholdMinutes: 2225 } });
  let release!: () => void, pulled!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  const entered = new Promise<void>((r) => {
    pulled = r;
  });
  const reader = a.reader();
  const oldRead = reader.readAt(f.roster[44]!, { validTime: valid }, async () => {
    pulled();
    await held;
  });
  await entered;
  const scheduled = await a.schedule("later", d, valid, future);
  release();
  const old = await oldRead;
  assert.equal(old.basis.tx, before.position);
  const checks = [];
  for (const [position, time, doc] of [
    [before.position, valid, W0.R1.doc],
    [scheduled.position, valid, W0.R1.doc],
    [scheduled.position, future, d],
  ] as const) {
    checks.push(
      await ref.check(
        a,
        f.roster,
        f.world,
        doc,
        { tx: position, validTime: time },
        W0.R1.doc,
        undefined,
        false,
      ),
    );
  }
  assert.equal((await a.notices.observe()).value.sequence, 1);
  await a.advance(future);
  const receipt = await a.receipt(2);
  assert(receipt.event.at > scheduled.position && receipt.marker.from === future);
  const p = { tx: receipt.event.at, validTime: future };
  const expected = JSON.parse(
    await ref.oracle.call("check", {
      document: d,
      old: W0.R1.doc,
      basis: p,
      worlds: f.roster.map((_, i) => f.world(i)),
      fold: false,
    }),
  );
  const changed = expected.find((r: any) => r.rows.length),
    unchanged = expected.find((r: any) => !r.rows.length);
  assert(changed && unchanged);
  const nonce = randomUUID();
  const cold = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--experimental-strip-types",
        new URL("./read-witness.ts", import.meta.url).pathname,
        s.scope,
        "w0",
        nonce,
        future,
        String(p.tx),
        changed.subject,
        unchanged.subject,
      ],
      { encoding: "utf8", timeout: 120000 },
    ),
  );
  assert(cold.nonce === nonce && cold.scope === s.scope && cold.pid !== process.pid);
  assert.deepEqual(
    cold.reads.map((r: any) => [r.subject, r.basis, r.json]),
    [changed, unchanged].map((r) => [r.subject, p, r.json]),
  );
  const [past] = JSON.parse(
    await ref.oracle.call("check", {
      document: W0.R1.doc,
      old: null,
      basis: old.basis,
      worlds: [f.world(44)],
      fold: false,
    }),
  );
  assert.equal(old.json, past.json);
  writeFileSync(
    join(process.argv[2]!, "future-gate.json"),
    canonical({
      scope: s.scope,
      source: f.sourceHash,
      schedule: scheduled.txId,
      pendingCut: scheduled.position,
      future,
      effective: receipt.event.at,
      changed: changed.subject,
      unchanged: unchanged.subject,
      readBefore: sha256(old.json),
      checks,
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  ref.oracle.close();
  await s.close();
}
