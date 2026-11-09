#!/usr/bin/env node
// @ts-nocheck -- [EXP-CHECKJS] runtime-populated records, optional option bags, or branch-specific union members; runtime coercion (Buffer JSON), dynamic collections, or validated inputs without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
// Compare public workload receipts. Native probes and replay are not competitors.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
};
const hash = (value) => createHash("sha256").update(value).digest("hex");
const rowBag = (rows) => rows.map(canonical).sort();
const rowSet = (rows) => [...new Set(rowBag(rows))];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packetBytes = readFileSync(
  path.join(root, "qualification/workloads/temporal-workloads.json"),
);
const packet = JSON.parse(packetBytes);
const packetSha256 = hash(packetBytes);
const sourceManifest = JSON.parse(
  readFileSync(path.join(root, "qualification/source-manifest.json"), "utf8"),
);
if (
  sourceManifest.copiedWorkloads["qualification/workloads/temporal-workloads.json"].sha256 !==
  packetSha256
)
  throw new Error("The immutable copied workload packet no longer matches its source manifest");
const expectedCases = new Map(
  packet.workloads.flatMap((family) =>
    family.cases.flatMap((entry) =>
      [false, true].map((reopen) => [
        `${family.id}/${entry.id}/${reopen ? "reopened" : "current"}`,
        entry,
      ]),
    ),
  ),
);
export const requiredSharedHashPaths = [
  "packages/core/package.json",
  "packages/core/src/index.ts",
  "packages/core/src/datalog/validation.ts",
  "packages/core/dist/index.js",
  "packages/core/dist/datalog/validation.js",
  "packages/testkit/package.json",
  "packages/testkit/src/index.ts",
  "packages/testkit/dist/index.js",
  "packages/qualification/package.json",
  "packages/qualification/src/index.ts",
  "packages/qualification/dist/index.js",
  "packages/qualification/workloads/runner.ts",
  "scripts/triplex-workloads.ts",
  "scripts/xtdb-qualification.mjs",
  "pnpm-lock.yaml",
  "qualification/workloads/temporal-workloads.json",
  "qualification/workloads/engine_cases.mjs",
];
const sourceChanges = (receipt) => {
  const before = receipt.sourceSha256Before ?? {},
    after = receipt.sourceSha256After ?? {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => before[key] !== after[key],
  );
};
const commonKeys = (receipt) =>
  Object.keys(receipt.sourceSha256Before ?? {}).filter((key) =>
    /^(packages\/(core|testkit|qualification)\/(?:(src|dist|test|workloads)\/|package\.json$)|scripts\/(?:triplex-workloads\.ts|xtdb-qualification\.mjs|triplex-qualification\.mjs)$|pnpm-lock\.yaml$|qualification\/workloads\/(?:temporal-workloads\.json|engine_cases\.mjs)$)/.test(
      key,
    ),
  );

export const comparePublicWorkloads = (left, right) => {
  const reasons = [];
  if (left.report.backend !== "xtdb" || right.report.backend !== "qlever")
    throw new TypeError(
      "Expected one public XTDB report and one public QLever report in that order",
    );
  for (const { report, receipt } of [left, right]) {
    if (receipt.backend !== report.backend || receipt.mode !== "workloads")
      throw new TypeError("Receipt backend/mode does not match its workload report");
    if (receipt.status !== "PASS") reasons.push(`${report.backend}:receipt ${receipt.status}`);
    if (sourceChanges(receipt).length)
      reasons.push(`${report.backend}:source or built artifact changed`);
    if (report.caseExecutions !== 142 || report.passedCaseExecutions !== 142)
      reasons.push(
        `${report.backend}:${report.passedCaseExecutions ?? 0}/${report.caseExecutions ?? 0} observed passes;142 required`,
      );
    if (report.workloads?.length !== 20) reasons.push(`${report.backend}:twenty families required`);
    if (receipt.protectedSourceVerification?.result !== "PASS")
      reasons.push(`${report.backend}:protected reference verification unavailable or failed`);
    for (const key of requiredSharedHashPaths)
      if (!/^[a-f0-9]{64}$/.test(receipt.sourceSha256Before?.[key] ?? ""))
        reasons.push(`${report.backend}:required shared build hash missing:${key}`);
  }
  for (const side of [left, right]) {
    const { report, receipt } = side,
      artifact = receipt.resultArtifact;
    if (!(typeof side.reportBytes === "string" || Buffer.isBuffer(side.reportBytes))) {
      reasons.push(`${report.backend}:raw result artifact bytes unavailable`);
      continue;
    }
    const bytes = Buffer.from(side.reportBytes);
    if (canonical(JSON.parse(bytes.toString("utf8"))) !== canonical(report))
      reasons.push(`${report.backend}:parsed report differs from supplied artifact bytes`);
    if (!artifact || artifact.sha256 !== hash(bytes) || artifact.bytes !== bytes.length)
      reasons.push(`${report.backend}:receipt result artifact digest/length mismatch or missing`);
    if (
      !report.runId ||
      artifact?.runId !== report.runId ||
      artifact?.backend !== report.backend ||
      artifact?.packetSha256 !== report.packetSha256
    )
      reasons.push(`${report.backend}:receipt result run identity/backend/packet mismatch`);
  }
  if (!left.report.packetSha256 || left.report.packetSha256 !== right.report.packetSha256)
    throw new Error("Independent workload packet hashes differ or are missing");
  if (left.report.packetSha256 !== packetSha256)
    reasons.push("Reports do not identify the immutable independent workload packet");
  const shared = [...new Set([...commonKeys(left.receipt), ...commonKeys(right.receipt)])].sort();
  const sharedDrift = shared.filter(
    (key) =>
      !left.receipt.sourceSha256Before?.[key] ||
      left.receipt.sourceSha256Before[key] !== right.receipt.sourceSha256Before?.[key],
  );
  if (!shared.length) reasons.push("No shared frontend/qualification source hashes available");
  if (sharedDrift.length)
    reasons.push(`Shared frontend/qualification builds differ (${sharedDrift.length} files)`);
  const flatten = (report) => {
    const cases = new Map();
    for (const family of report.workloads ?? [])
      for (const entry of family.cases ?? []) {
        const key = `${family.id}/${entry.id}/${entry.reopen ? "reopened" : "current"}`;
        if (cases.has(key)) throw new Error(`Duplicate case identity: ${report.backend}:${key}`);
        cases.set(key, entry);
      }
    return cases;
  };
  const a = flatten(left.report),
    b = flatten(right.report);
  for (const [backend, entries] of [
    ["xtdb", a],
    ["qlever", b],
  ]) {
    const missing = [...expectedCases.keys()].filter((key) => !entries.has(key));
    const unexpected = [...entries.keys()].filter((key) => !expectedCases.has(key));
    if (missing.length || unexpected.length)
      reasons.push(
        `${backend}:case identity membership mismatch (${missing.length} missing,${unexpected.length} unexpected)`,
      );
    for (const [key, entry] of entries) {
      const expected = expectedCases.get(key);
      if (!expected) continue;
      if (
        entry.operation !== expected.operation ||
        canonical(entry.cut) !== canonical(expected.cut)
      )
        reasons.push(`${backend}:${key}:operation or temporal cut differs from the packet`);
      if (
        entry.status === "PASS" &&
        (!Array.isArray(entry.actualRows) ||
          canonical(rowSet(entry.actualRows)) !== canonical(rowSet(expected.expected_rows)))
      )
        reasons.push(`${backend}:${key}:claimed passed answer differs from the independent oracle`);
    }
  }
  const cases = [...new Set([...a.keys(), ...b.keys()])].sort().map((key) => {
    const x = a.get(key),
      y = b.get(key);
    const complete =
      x?.status === "PASS" &&
      y?.status === "PASS" &&
      Array.isArray(x.actualRows) &&
      Array.isArray(y.actualRows) &&
      Array.isArray(x.queryTrace) &&
      Array.isArray(y.queryTrace);
    const equal = complete && canonical(rowBag(x.actualRows)) === canonical(rowBag(y.actualRows));
    // Unordered result iteration may issue the same independent fixed-cut reads
    // in a different order. Compare the multiset, retaining duplicate call cost.
    const samePublicCalls =
      complete && canonical(rowBag(x.queryTrace)) === canonical(rowBag(y.queryTrace));
    return {
      key,
      xtdb: x?.status ?? "UNEXECUTED",
      qlever: y?.status ?? "UNEXECUTED",
      normalizedAnswersEqual: complete ? equal : null,
      publicDatalogCallsEqual: complete ? samePublicCalls : null,
    };
  });
  if (cases.length !== 142)
    reasons.push(`Distinct current/reopened case identities:${cases.length};142 required`);
  for (const entry of cases)
    if (entry.normalizedAnswersEqual === false || entry.publicDatalogCallsEqual === false)
      reasons.push(`${entry.key}:answer or public call mismatch`);
  if (cases.some((entry) => entry.normalizedAnswersEqual === null))
    reasons.push("Some paired cases were not independently passed on both backends");
  return {
    format: "triplex-public-comparison/2",
    timestampUtc: new Date().toISOString(),
    competitors: ["public Triplex-on-XTDB", "public Triplex-on-QLever"],
    status: reasons.length ? "INCOMPLETE" : "PASS_SMALL_FUNCTIONAL_COMPARISON",
    reasons,
    packetSha256: left.report.packetSha256,
    sharedBuildDifferences: sharedDrift,
    sharedBuildSha256: hash(
      canonical(shared.map((key) => [key, left.receipt.sourceSha256Before[key]])),
    ),
    observed: {
      xtdb: { executed: left.report.caseExecutions, passed: left.report.passedCaseExecutions },
      qlever: { executed: right.report.caseExecutions, passed: right.report.passedCaseExecutions },
    },
    cases,
    performanceQualification: "UNIMPLEMENTED",
    limitations: [
      "Functional small fixtures only. Final answer bags and fixed-cut public call multisets are compared; ordered pagination has a separate conformance gate. No latency ranking, qualified percentile, scale or complete-ten-goal claim.",
      "Success requires identical shared frontend/harness builds and all142 current/reopened independent-oracle checks.",
      "Native SQL/SPARQL are diagnostics and event replay is an oracle; neither is a competing implementation.",
      "Fair performance still requires serial equal4CPU/8GiB profiles and at least10000 observations in each of three independent runs.",
    ],
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [aReport, aReceipt, bReport, bReceipt, output] = process.argv.slice(2);
  if (!output)
    throw new Error(
      "Usage: compare.mjs xtdb-report xtdb-receipt qlever-report qlever-receipt new-output.json",
    );
  const read = (file) => JSON.parse(readFileSync(file, "utf8"));
  const aBytes = readFileSync(aReport),
    bBytes = readFileSync(bReport);
  const report = comparePublicWorkloads(
    { report: JSON.parse(aBytes), receipt: read(aReceipt), reportBytes: aBytes },
    { report: JSON.parse(bBytes), receipt: read(bReceipt), reportBytes: bBytes },
  );
  report.inputs = [aReport, aReceipt, bReport, bReceipt].map((file) => ({
    file: path.resolve(file),
    sha256: hash(readFileSync(file)),
  }));
  const destination = path.resolve(output);
  if (!destination.startsWith(path.join(root, "qualification") + path.sep))
    throw new Error("Comparison evidence must remain under the owned qualification directory");
  writeFileSync(destination, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ status: report.status, reasons: report.reasons, output }));
  if (report.status === "INCOMPLETE") process.exitCode = 2;
}
