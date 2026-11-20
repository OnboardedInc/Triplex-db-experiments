import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { W0, canonical, sha256 } from "../../../../bench/lib/w0-world.ts";
import { Documents } from "../../notify1/store.ts";
import { seed, valid } from "../fixture.ts";
import { openStore } from "../store.ts";
import { JoinedAccount } from "./account.ts";
import { Reference, toWire } from "./check.ts";
import { BulkQueue } from "./bulk.ts";
import { Settlement } from "./settlement.ts";

const store = await openStore("lazy-settle-gate-" + randomUUID(), "act2-deep");
const account = new JoinedAccount(store),
  ref = new Reference();
const queue = new BulkQueue(1);
const f = await seed(store, 40);
await account.install(f.roster, valid);
const worker = await Settlement.open(account, queue);
const point = (position: number) => ({ tx: position, validTime: valid });
async function verify(
  position: number,
  document: W0.ReleaseDoc,
  previous: W0.ReleaseDoc | null,
  seq: number,
) {
  return ref.check(account, f.roster, f.world, document, point(position), previous, seq);
}
function kill(sequence: number, path: "values" | "notices") {
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", new URL("./settle-child.ts", import.meta.url).pathname],
    {
      input: JSON.stringify({ scope: store.scope, sequence, path }),
      encoding: "utf8",
      timeout: 120000,
    },
  );
  assert.equal(r.signal, "SIGKILL", r.stderr || r.error?.message);
}
try {
  const first = await account.publish("first", W0.R1.doc, valid, "owed");
  await verify(first.position, W0.R1.doc, null, 1);
  const second = await account.publish("next", W0.R2.doc, valid, "owed"),
    subject = f.roster[1]!;
  await verify(second.position, W0.R2.doc, W0.R1.doc, 2);
  const pin = { position: second.position, validTime: valid };
  const before = await worker.archive.reader().readAt(subject, pin);
  assert.equal(before.route, "authoritative-source");
  kill(2, "values");
  kill(2, "notices");
  const partial = await worker.archive.stored(2);
  assert(
    partial.frontier.status === "pending" &&
      partial.frontier.through < f.n &&
      partial.output.length > 0,
  );
  const atArchive = await worker.archive.reader().readAt(subject, pin);
  assert.equal(atArchive.route, "receipt-archive");
  assert.equal(before.json, atArchive.json);
  const third = await account.publish("supersede", W0.R1.doc, valid, "owed");
  await verify(third.position, W0.R1.doc, W0.R2.doc, 3);
  const superseded = await worker.archive.runValues(2);
  assert(superseded.status === "superseded" && superseded.through === partial.frontier.through);
  const terminal = await worker.settle(3);
  assert.equal(terminal.values.state.status, "stored");
  const stored = await worker.archive.stored(3);
  const expected = JSON.parse(
    await ref.oracle.call("check", {
      document: W0.R1.doc,
      old: W0.R2.doc,
      basis: point(third.position),
      worlds: f.roster.map((_, i) => f.world(i)),
      fold: false,
    }),
  );
  assert.deepEqual(
    stored.output,
    expected
      .filter((x: any) => x.rows.length)
      .map((x: any) => ({
        subject: x.subject,
        json: x.json,
        changes: x.rows.map(([k, , v]: any) => [k, v]),
      })),
  );
  const packets = await worker.recorder.packets(terminal.notices.state.at);
  const owed = packets.flatMap((p) => p.deliveries.map(toWire));
  assert.deepEqual(owed, ref.owed);
  assert(owed.length > 0);
  const recipient = await openStore("lazy-settle-recipient-" + randomUUID());
  try {
    const sink = new Documents(recipient.comp, "receiver");
    assert.equal(await worker.recorder.deliver(sink, terminal.notices.state.at), owed.length);
    assert.equal(await worker.recorder.deliver(sink, terminal.notices.state.at), 0);
  } finally {
    await recipient.close();
  }
  worker.wake();
  await worker.idle();
  assert.equal(await worker.recorder.archive.store.head(), terminal.notices.state.at);
  writeFileSync(
    join(process.argv[2]!, "settle-gate.json"),
    canonical({
      source: f.sourceHash,
      roster: f.rosterHash,
      scope: store.scope,
      first: first.txId,
      second: second.txId,
      third: third.txId,
      kills: 2,
      matchedRead: sha256(before.json),
      partial: partial.frontier.through,
      rows: stored.frontier.changes,
      superseded: superseded.through,
      entries: owed.length,
      deliveredDigest: sha256(canonical(owed)),
    }) + "\n",
    { flag: "wx" },
  );
} finally {
  ref.oracle.close();
  await worker.close();
  await store.close();
}
