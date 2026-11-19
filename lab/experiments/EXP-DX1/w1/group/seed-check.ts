import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { accounts, tenantRows, pooledDigest } from "./population.ts";
import { deepPopulation } from "../../../../bench/lib/deep-world.ts";

// [DX-W1] Why: verify every generated tenant row against SCALE1's already-published input bytes before seeding a server.
// Rejected: counting generated rows as the expected answer or verifying just the sampled roots.
const digest = createHash("sha256"),
  byAccount = [];
const expected = deepPopulation(10000).facts + 20000 + Math.ceil(10000 / 256) + 1;
for (const account of accounts) {
  let facts = 0;
  for (let i = 0; i < account.people; i++) {
    const rows = tenantRows(account, i);
    facts += rows.length;
    digest.update(JSON.stringify(rows) + "\n");
  }
  assert.equal(facts, expected);
  byAccount.push(facts);
}
const actual = digest.digest("hex");
assert.equal(actual, pooledDigest);
console.log(
  JSON.stringify({
    revision: "1f710e73ceb2cad2a23e7d64770e0812c59caf19",
    subjects: 100000,
    byAccount,
    sha256: actual,
  }),
);
