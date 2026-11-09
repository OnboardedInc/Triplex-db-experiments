// [CX-VDI01-R3] Why: preserve original assertions and keep new raw oracle observations reviewer-owned. Rejected: writing into builder evidence.
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DomainOracle, ParallelDomainOracle, sha256 } from "../../../bench/lib/di01-harness.ts";
test("partitioned O-DOMAIN affected equals an unsplit fresh call for all eleven affected cases, including validation controls", async () => {
  const root = `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VDI01/round3-review/oracle-control-${randomUUID()}`;
  fs.mkdirSync(root, { recursive: true });
  const a = fs.openSync(path.join(root, "single.jsonl"), "wx"),
    b = fs.openSync(path.join(root, "partitioned.jsonl"), "wx"),
    single = new DomainOracle(a),
    parallel = new ParallelDomainOracle(root, b),
    rows: any[] = [];
  try {
    for (const name of fs.readdirSync("lab/world/W0/cases")) {
      const file = "lab/world/W0/cases/" + name;
      if (!name.endsWith(".json")) continue;
      const c = JSON.parse(fs.readFileSync(file, "utf8"));
      if (c.op !== "affected") continue;
      const expected = await single.run("affected", c.input),
        { oracleRequestId, oracleRequests, ...observed } = await parallel.run("affected", c.input);
      assert.deepEqual(observed, expected, name);
      assert.deepEqual(expected, c.expected, name);
      rows.push({
        name,
        sha256: sha256(fs.readFileSync(file)),
        expected,
        observed,
        oracleRequestId,
        oracleRequests,
      });
    }
    assert.equal(rows.length, 11);
    fs.writeFileSync(
      path.join(root, "result.json"),
      JSON.stringify({ rows, status: "MATCH" }, null, 2),
    );
  } finally {
    single.close();
    parallel.close();
    fs.closeSync(a);
    fs.closeSync(b);
  }
});
