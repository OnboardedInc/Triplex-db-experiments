import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export function functionalNote(root: string, manifest: string) {
  const link = "[Functional evidence](evidence/part4-functional.sha256)";
  if (!fs.existsSync(path.join(root, "functional/part4")))
    return "The local functional fixtures are indexed here. " + link;
  const hashes = new Map(
    fs
      .readFileSync(manifest, "utf8")
      .trimEnd()
      .split("\n")
      .map((line) => {
        const hit = /^([a-f0-9]{64})  (functional\/part4\/[A-Za-z0-9._/-]+)$/.exec(line);
        assert(hit && !hit[2]!.includes(".."));
        return [hit[2]!, hit[1]!] as const;
      }),
  );
  const bytes = (name: string) => {
    const relative = "functional/part4/" + name;
    const data = fs.readFileSync(path.join(root, relative));
    assert.equal(
      createHash("sha256").update(data).digest("hex"),
      hashes.get(relative),
      "Local functional evidence changed: " + name,
    );
    return data;
  };
  const load = (name: string) => JSON.parse(bytes(name).toString("utf8"));
  // [DX-SCALE1] Why: historical local checks remain reportable only against their original checksummed source, scope and terminal observations. Rejected: unconditional test counts or a passing summary copied from a different nonce.
  const scopes = (group: string, count: number): any[] => {
    const origin = load(group + "/source.json"),
      rows = load(group + "/scope-checks.json");
    assert(
      /^[a-f0-9]{40}$/.test(origin.source) && origin.tree.trim() === "" && rows.length === count,
    );
    return rows.map((saved: any, i: number) => {
      const r = load(group + "/s" + i + "/ns-report.json"),
        id = r.deep.identity;
      assert(saved.exit === 0 && saved.status === "DONE" && r.status === "DONE");
      assert(
        id.account === i &&
          id.source === origin.source &&
          id.source === saved.source &&
          id.nonce === saved.nonce,
      );
      assert(
        id.slot === "tx2-dxscale1-smoke-" + id.nonce &&
          r.scope === saved.scope &&
          r.scope.includes(id.nonce) &&
          r.traceStartAbsMs === saved.commonStart,
      );
      assert.deepEqual(saved.seed, r.deep.seed);
      assert(
        r.oracle.status === "PASS" &&
          r.oracle.mismatchCount === 0 &&
          r.oracle.reads > 0 &&
          r.oracle.reads === r.oracle.modelCorrectOnSameReads,
      );
      assert(
        r.correctness.reads > 0 &&
          r.correctness.correct === r.correctness.reads &&
          r.receiptCapture.missing === 0 &&
          r.receiptCapture.mismatches === 0,
      );
      return r;
    });
  };
  const tenant = [...scopes("native-postlude-pooled", 1), ...scopes("native-postlude-separate", 2)];
  let corrections = 0;
  for (const r of tenant) {
    assert.deepEqual(r.deep.tenantChecks.identity, r.deep.identity);
    for (const c of r.deep.tenantChecks.checks) {
      assert(
        c.duplicate === "duplicate-returned-original" &&
          c.position > r.deep.seed.position &&
          c.lost.resolvedOriginal,
      );
      corrections++;
    }
  }
  const six = scopes("six-readers", 1)[0],
    phase = six.phases.find((p: any) => p.name === "L4"),
    local = six.rawLocalSamples.find((p: any) => p.phase === "L4");
  assert(
    six.readerLifecycle.length === 6 &&
      six.readerLifecycle.every((w: any) => w.stopped && !w.failures.length) &&
      local.ok &&
      local.compared > 0 &&
      local.compared === local.samples,
  );
  const routes = six.phaseProgress[phase.idx].routes;
  const group = "native-release-costs-clean",
    releases = scopes(group, 2);
  const counts = load(group + "/independent-counts.json");
  const details = releases.map((r: any, i: number) =>
    ["R1", "R2"].map((name, k) => {
      const a = k === 0 ? r.deep.r1 : r.deep.r2,
        c = a.cost,
        z = counts.find((x: any) => x.release === name && x.account === i);
      assert(
        z &&
          z.source === r.deep.identity.source &&
          z.report === hashes.get("functional/part4/" + group + "/s" + i + "/ns-report.json"),
      );
      assert(
        r.deep.activationOracle.domain === "O-DOMAIN" &&
          r.deep.activationOracle.checked === c.subjects &&
          r.deep.activationOracle.changedItemsByRelease[k] === c.changedSubjects,
      );
      assert(
        z.changed === c.changedSubjects &&
          z.subjects === c.subjects &&
          z.bodyFacts === c.bodyFacts &&
          z.guardFacts === c.guardFacts &&
          z.positions === c.queue.observed &&
          c.queue.qualified,
      );
      return (
        c.changedSubjects +
        "/" +
        c.subjects +
        " with " +
        c.bodyFacts +
        " body facts and " +
        c.guardFacts +
        " guard fact" +
        (c.guardFacts === 1 ? "" : "s")
      );
    }),
  );
  const releaseText =
    details[0]![0] === details[1]![0] && details[0]![1] === details[1]![1]
      ? "In each of two native scopes, R1 changed " +
        details[0]![0] +
        " and R2 changed " +
        details[0]![1] +
        "."
      : "In the two native scopes, R1 changed " +
        details.map((pair) => pair[0]).join(" and ") +
        " respectively. R2 changed " +
        details.map((pair) => pair[1]).join(" and ") +
        " respectively.";
  const runtime = load("latest-runtime.json");
  assert(
    /^[a-f0-9]{40}$/.test(runtime.source) &&
      runtime.logSha256 === hashes.get("functional/part4/latest-datomic-tests.log"),
  );
  const tests = bytes("latest-datomic-tests.log")
      .toString()
      .match(/Tests\s+(\d+) passed\s*\|\s*(\d+) skipped/),
    w0 = bytes("w0-package.log")
      .toString()
      .match(/Tests\s+(\d+) passed/);
  assert(tests && w0);
  assert(Number(tests[1]) === runtime.passed && Number(tests[2]) === runtime.skipped);
  const fmt = (n: number) => n.toLocaleString("en-US");
  return (
    "Two fresh local tenant layouts matched " +
    fmt(tenant.reduce((n, r) => n + r.correctness.reads, 0)) +
    " reads and " +
    corrections +
    " post-window corrections. Six reader workers passed " +
    local.compared +
    "/" +
    local.samples +
    " full comparisons at L4 (" +
    fmt(routes.replica) +
    " replica reads, " +
    fmt(routes.fallback ?? 0) +
    " fallbacks). " +
    releaseText +
    " O-DOMAIN and the native receipts agreed. Datomic passed " +
    tests[1] +
    " tests with " +
    tests[2] +
    " skips. W0 passed " +
    w0[1] +
    ". " +
    link
  );
}
