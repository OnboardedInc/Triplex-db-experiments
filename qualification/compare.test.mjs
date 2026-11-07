// Offline reader contract tests. Synthetic inputs are never engine evidence.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { comparePublicWorkloads, requiredSharedHashPaths } from "./compare.mjs";

const bytes = readFileSync(new URL("./workloads/temporal-workloads.json", import.meta.url));
const packet = JSON.parse(bytes),
  digest = (value) => createHash("sha256").update(value).digest("hex");
const shared = Object.fromEntries(
  requiredSharedHashPaths.map((file) => [file, digest(`synthetic shared source:${file}`)]),
);
const bind = (side) => {
  side.reportBytes = Buffer.from(JSON.stringify(side.report));
  side.receipt.resultArtifact = {
    sha256: digest(side.reportBytes),
    bytes: side.reportBytes.length,
    backend: side.report.backend,
    runId: side.report.runId,
    packetSha256: side.report.packetSha256,
  };
  return side;
};
const fixture = (backend) =>
  bind({
    report: {
      backend,
      runId: `synthetic-offline-${backend}`,
      packetSha256: digest(bytes),
      caseExecutions: 142,
      passedCaseExecutions: 142,
      workloads: packet.workloads.map((family) => ({
        id: family.id,
        cases: family.cases.flatMap((entry) =>
          [false, true].map((reopen) => ({
            id: entry.id,
            reopen,
            operation: entry.operation,
            cut: entry.cut,
            status: "PASS",
            actualRows: structuredClone(entry.expected_rows),
            queryTrace: [
              { query: { find: ["?synthetic"] }, basis: { validAt: 1, recordedAt: 1 } },
              { query: { find: [true] }, basis: { validAt: 1, recordedAt: 1 } },
            ],
          })),
        ),
      })),
    },
    receipt: {
      backend,
      mode: "workloads",
      status: "PASS",
      protectedSourceVerification: { result: "PASS" },
      sourceSha256Before: structuredClone(shared),
      sourceSha256After: structuredClone(shared),
    },
  });
const pair = () => [fixture("xtdb"), fixture("qlever")];
const result = (pair) => comparePublicWorkloads(...pair);

test("accepts the exact bound 142-case small-functional matrix", () => {
  const compared = result(pair());
  assert.equal(compared.status, "PASS_SMALL_FUNCTIONAL_COMPARISON");
  assert.equal(compared.performanceQualification, "UNIMPLEMENTED");
});
test("rejects two reports from the same backend", () => {
  const [left] = pair();
  assert.throws(() => comparePublicWorkloads(left, fixture("xtdb")), /one public XTDB/);
});
test("detects a crossed receipt from another run of the same backend", () => {
  const sides = pair();
  sides[1].report.runId = "another-run";
  sides[1].reportBytes = Buffer.from(JSON.stringify(sides[1].report));
  assert.ok(result(sides).reasons.some((reason) => /digest|run identity/.test(reason)));
});
test("does not accept parsed objects without the bound raw artifact", () => {
  const sides = pair();
  delete sides[1].reportBytes;
  assert.ok(result(sides).reasons.some((reason) => /raw result artifact/.test(reason)));
});
test("old unbound receipts remain incomplete rather than retroactively qualified", () => {
  const sides = pair();
  delete sides[1].receipt.resultArtifact;
  assert.equal(result(sides).status, "INCOMPLETE");
});
test("requires known frontend, built runtime, testkit and shared harness hashes", () => {
  const sides = pair();
  for (const side of sides)
    side.receipt.sourceSha256Before = side.receipt.sourceSha256After = {
      "pnpm-lock.yaml": shared["pnpm-lock.yaml"],
    };
  assert.ok(
    result(sides).reasons.some((reason) => /required shared build hash missing/.test(reason)),
  );
});
test("rejects substituted case identities even when the count remains 142", () => {
  const sides = pair();
  for (const side of sides) {
    side.report.workloads[0].cases[0].id += "-substitute";
    bind(side);
  }
  assert.ok(
    result(sides).reasons.some((reason) => /case identity membership mismatch/.test(reason)),
  );
});
test("rejects altered cuts even when identity, artifact and counters match", () => {
  const sides = pair();
  sides[1].report.workloads[0].cases[0].cut = { valid_at: "999", known_at: "1" };
  bind(sides[1]);
  assert.ok(result(sides).reasons.some((reason) => /temporal cut differs/.test(reason)));
});
test("checks the independent oracle even when both reports claim the same wrong answer passed", () => {
  const sides = pair();
  for (const side of sides) {
    side.report.workloads[0].cases[0].actualRows = [[{ tag: "str", value: "wrong" }]];
    bind(side);
  }
  assert.ok(result(sides).reasons.some((reason) => /independent oracle/.test(reason)));
});
test("compares unordered query calls as bags while preserving duplicate-call cost", () => {
  const sides = pair();
  sides[1].report.workloads[0].cases[0].queryTrace.reverse();
  bind(sides[1]);
  assert.equal(result(sides).status, "PASS_SMALL_FUNCTIONAL_COMPARISON");
  sides[1].report.workloads[0].cases[0].queryTrace.push(
    sides[1].report.workloads[0].cases[0].queryTrace[0],
  );
  bind(sides[1]);
  assert.equal(result(sides).status, "INCOMPLETE");
});
test("detects shared frontend drift even when each individual run stayed stable", () => {
  const sides = pair(),
    file = "packages/core/src/index.ts";
  sides[1].receipt.sourceSha256Before[file] = sides[1].receipt.sourceSha256After[file] =
    digest("different frontend");
  assert.ok(result(sides).reasons.some((reason) => /Shared frontend/.test(reason)));
});
test("rejects duplicate case identities", () => {
  const sides = pair();
  sides[1].report.workloads[0].cases.push(sides[1].report.workloads[0].cases[0]);
  bind(sides[1]);
  assert.throws(() => result(sides), /Duplicate case identity/);
});
