// [DX-BM1] Why: verify a restored image through the actual gateway at its original logical cut.
// Rejected: trusting the restore checksum without reopening the expected Datomic scope.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [checkpoint, output] = process.argv.slice(2);
const seed = JSON.parse(fs.readFileSync(checkpoint));
const { DatomicClient } = await import(pathToFileURL(path.resolve("packages/datomic/dist/index.js")).href);
const client = new DatomicClient(process.env.PROBE_READ_URL, 35_000);
try {
  const open = await client.create(seed.scope, "lean", true, 35_000);
  assert(!open.created && open.db === seed.db && open.strictRecordClocks);
  const basis = await client.basis(seed.db);
  assert.equal(Number(basis.position.v), seed.lastPosition);
  assert.equal(await client.claim(seed.db, seed.witness.commandId, seed.lastPosition), seed.witness.txId);
  const roots = [0, 1, 257, 99_999].map((i) => "acct/account-001/pl:" + String(i).padStart(8,"0"));
  const found = await client.rows(seed.db, {
    entityIds: roots, pattern: { attribute: ":subject/account" },
    basis: { recordedPosition: seed.lastPosition, validAt: 1_700_000_000_000 },
  });
  assert.deepEqual(found.map(r => r.entity_id).sort(), roots);
  assert(found.every(r => r.value_string === "account-001" && r.recorded_position <= seed.lastPosition));
  fs.writeFileSync(output, JSON.stringify({ db: seed.db, seedSource: seed.source, witness: seed.witness,
    nativeT: basis.t.v, count: found.length, slot: process.env.TRIPLEX_TRACE_SLOT, source: process.env.TRIPLEX_TRACE_SOURCE }) + "\n",
  { flag: "wx" });
} finally {
  client.close();
}
