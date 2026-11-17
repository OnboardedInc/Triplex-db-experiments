import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { canonical } from "../../../bench/lib/w0-world.ts";
import { DomainOracle, DomainOraclePool } from "../../../bench/lib/w0-gates.ts";
// [DX-S5] Why: concurrent results must stay bound to their individual requests, across distinct worlds/releases.
// Rejected: testing only identical requests, which would miss response swaps between child queues.
test("isolated oracle pool matches original serial bytes for distinct frozen cases", async () => {
  const dir = new URL("../../../world/W0/cases/", import.meta.url);
  const cases = fs
    .readdirSync(dir)
    .sort()
    .map((name) => JSON.parse(fs.readFileSync(new URL(name, dir), "utf8")))
    .filter((c) => {
      if (c.op !== "evaluate") return false;
      try {
        canonical(c.input);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 24);
  assert.equal(cases.length, 24);
  const serial = new DomainOracle(),
    pool = new DomainOraclePool(undefined, 3);
  try {
    const expected = [];
    for (const c of cases) expected.push(await serial.call(c.op, c.input));
    const actual = await Promise.all(cases.map((c) => pool.call(c.op, c.input)));
    assert.deepEqual(actual, expected);
  } finally {
    serial.close();
    pool.close();
  }
  assert.throws(() => new DomainOraclePool(undefined, 0), /process count/);
  assert.throws(() => new DomainOraclePool(undefined, 5), /process count/);
});
