import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { keyFor, tenantFacts, tenantRows, tenantRowsId, type Account } from "../scale1/tenants.ts";
type Inventory = { account: Account; facts: number; sha256: string };
export function soloPopulation(people: 1000 | 100000, regenerate = false): Inventory {
  const file = JSON.parse(
    fs.readFileSync(new URL("./solo-population.json", import.meta.url), "utf8"),
  );
  assert.equal(file.format, tenantRowsId);
  const v = file.sizes[people] as Inventory,
    account = { index: 0, key: keyFor(0), first: 0, people };
  assert.deepEqual(v.account, account);
  assert.equal(v.facts, tenantFacts([account]));
  assert.match(v.sha256, /^[a-f0-9]{64}$/);
  if (regenerate) {
    // [DX-ACT2] Why: SCALE1 pins the ten-account million-person fixture. Check the separate single-account fixture before the first large database write. Rejected: discovering a missing population entry after hours of seeding.
    const sum = createHash("sha256");
    let facts = 0;
    for (let i = 0; i < people; i++) {
      const rows = tenantRows(account, i);
      sum.update(JSON.stringify(rows) + "\n");
      facts += rows.length;
    }
    assert.equal(facts, v.facts);
    assert.equal(sum.digest("hex"), v.sha256);
  }
  return v;
}

export function soloScope(nonce: string, people: number, arm?: "reference" | "record" | "stored") {
  assert([1000, 10000, 100000].includes(people));
  if (arm) return "delta-audit-" + people + "-" + arm + "-" + nonce;
  if (people === 10000) return "delta-deep-loaded-" + nonce;
  return (people === 1000 ? "delta-solo-check-" : "delta-solo-run-") + nonce;
}
