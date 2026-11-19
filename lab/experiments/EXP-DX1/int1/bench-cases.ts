import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
export const cases = [
  { key: "thin-1m", mode: "int1-thin", size: 1_000_000, accounts: 1, scopes: 1 },
  { key: "thin-4m", mode: "int1-thin", size: 4_000_000, accounts: 1, scopes: 1 },
  { key: "pooled-100", mode: "int1-pooled", size: 29000, accounts: 100, scopes: 1 },
  { key: "isolated-100", mode: "int1-isolated", size: 29000, accounts: 100, scopes: 100 },
] as const;
export type BenchCase = (typeof cases)[number];
const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
export async function verifyCase(
  dir: string,
  spec: BenchCase,
  head: string,
  tag: string,
  stack: any,
) {
  const { canonical } = await import("../../../bench/lib/w0-world.ts");
  const inputs = read(path.join(dir, "inputs.json")),
    r = read(path.join(dir, "result.json"));
  const binding = createHash("sha256")
    .update(
      canonical([head, inputs.inputs, inputs.attempt, spec.mode, spec.size, tag, stack.containers]),
    )
    .digest("hex");
  assert.equal(inputs.binding, binding);
  assert.equal(r.binding, binding);
  assert.equal(r.source, head);
  assert.equal(r.slot, tag);
  assert.equal(r.mode, spec.mode);
  assert.equal(r.size, spec.size);
  assert.deepEqual(inputs.containers, stack.containers);
  assert.equal(r.accounts.length, spec.accounts);
  assert.equal(new Set(r.accounts.map((a: any) => a.scope)).size, spec.scopes);
  assert.equal(r.activation.length, 2 * spec.accounts);
  const { smallPeople } = await import("../scale1/small-plan.ts");
  const { deepPopulation } = await import("../../../bench/lib/deep-world.ts");
  const sizes = Array.from({ length: spec.accounts }, (_, n) =>
    spec.accounts === 1 ? spec.size : smallPeople(n),
  );
  const rows = await Promise.all(
    r.accounts.map(async (a: any, n: number) => {
      assert.equal(
        a.first,
        sizes.slice(0, n).reduce((a, b) => a + b, 0),
      );
      assert.equal(a.people, sizes[n]);
      assert.equal(a.facts, spec.accounts === 1 ? a.people * 8 : deepPopulation(a.people).facts);
      assert.equal(a.active, a.people / 50);
      assert.equal(a.ryow, a.active);
      assert(
        a.reads >= 4 * a.active &&
          a.replay.entityQueries >= a.replay.reads &&
          a.replay.reads > 0 &&
          a.replay.status === "PASS",
      );
      const releases = r.activation.slice(2 * n, 2 * n + 2);
      for (const decision of releases) {
        assert.equal(decision.cut.scope, a.scope);
        assert.equal(decision.roster, a.roster);
        assert.equal(decision.covered, a.people);
        assert.equal(decision.guardReadbacks, a.people);
        assert.equal(decision.full + decision.candidates + decision.excluded, a.people);
        assert(decision.oracle > 0 && decision.wallMs > 0 && decision.commits > 0);
        assert.match(decision.logical, /^[a-f0-9]{64}$/);
        const sum = createHash("sha256");
        for await (const data of fs.createReadStream(path.join(dir, decision.receiptFile)))
          sum.update(data);
        assert.equal(sum.digest("hex"), decision.receipts);
      }
      return {
        first: a.first,
        people: a.people,
        active: a.active,
        facts: a.facts,
        roster: a.roster,
        outputs: releases.map((d: any) => d.logical),
      };
    }),
  );
  assert(
    r.seedMs > 0 &&
      r.latency.commit.n === sizes.reduce((a, b) => a + b, 0) / 50 &&
      r.latency.cold.n > 0,
  );
  const phases = fs
    .readFileSync(path.join(dir, "phases.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  assert(phases.every((p) => p.binding === binding));
  assert.deepEqual(
    phases.map((p) => p.label),
    [
      "empty",
      "scopes-open",
      "fixed-hot",
      "after-cold-import",
      "after-activity",
      "after-publication",
    ],
  );
  return rows;
}
