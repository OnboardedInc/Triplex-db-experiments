import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync, execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../../../..");
const scanOnly = process.argv.includes("--scan-only");
const output = path.join(import.meta.dirname, scanOnly ? "scan-final" : "evidence");
if (fs.existsSync(path.join(output, "execution.json")))
  throw new Error("Retain the existing attempt before rerunning");
fs.mkdirSync(path.join(output, "probe"), { recursive: true });
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const snapshot = () => {
  const paths = [
    ...new Set(
      execFileSync(
        "git",
        [
          "ls-files",
          "-co",
          "--exclude-standard",
          "packages/core",
          "packages/xtdb",
          "packages/qlever",
          "packages/testkit",
          "lab/experiments/EXP-RT01/round2",
        ],
        { cwd: root, encoding: "utf8" },
      )
        .trim()
        .split("\n"),
    ),
  ].filter(
    (p) => p && !p.includes("/evidence/") && !/round2\/(attempt[0-9]+|scan-final)\//.test(p),
  );
  paths.push("lab/experiments/EXP-RT01/evidence/main-XtdbStorageAdapter.txt");
  for (const pkg of ["core", "testkit", "xtdb", "qlever"]) {
    const dir = path.join(root, `packages/${pkg}/dist`);
    for (const file of fs.readdirSync(dir, { recursive: true }))
      if (String(file).endsWith(".js")) paths.push(`packages/${pkg}/dist/${file}`);
  }
  return Object.fromEntries(paths.sort().map((p) => [p, hash(path.join(root, p))]));
};
const before = snapshot();
const phases = [];
let failure;
try {
  for (const name of scanOnly
    ? ["scan-cost"]
    : ["probe", "public-routes", "journal-single", "scan-cost"]) {
    const script = path.join(
      import.meta.dirname,
      name === "scan-cost" ? "scan-cost.ts" : `reproductions/${name}.ts`,
    );
    const started = new Date().toISOString();
    const result = spawnSync(path.join(root, "node_modules/.bin/tsx"), [script], {
      cwd: root,
      encoding: "utf8",
      timeout: 180000,
      maxBuffer: 16 * 1024 ** 2,
    });
    fs.writeFileSync(path.join(output, `${name}.stdout`), result.stdout ?? "");
    fs.writeFileSync(path.join(output, `${name}.stderr`), result.stderr ?? "");
    phases.push({
      name,
      script: path.relative(root, script),
      runnerSha256: hash(script),
      started,
      ended: new Date().toISOString(),
      exit: result.status,
      signal: result.signal,
      stdoutSha256: hash(path.join(output, `${name}.stdout`)),
      stderrSha256: hash(path.join(output, `${name}.stderr`)),
    });
    assert.equal(result.status, 0, `${name} failed`);
  }
  const json = (p) => JSON.parse(fs.readFileSync(path.join(output, p), "utf8"));
  // [EXP-RT01] Why: reviewer probes collect failing observations too. Rejected: adopting their zero process exit as a semantic PASS.
  if (!scanOnly) {
    const summaries = json("probe/probe-summary.json");
    assert.equal(summaries.length, 4);
    for (const entry of summaries) assert.equal(entry.suite, "completed");
    const routes = [...json("probe/route-probes.json"), ...json("public-routes.json")];
    assert.equal(routes.length, 32);
    for (const route of routes) {
      assert.equal(route.observed.tag, "BasisNotAvailable", `${route.lane}/${route.route}`);
      assert.equal(route.observed.axis, "recordedAt");
      if (route.T !== undefined) {
        assert.equal(route.observed.required, route.T);
        assert.ok(route.elapsed >= 1900 && route.elapsed < 4000);
      }
    }
    const single = json("journal-single-observed.json");
    const nested = summaries.flatMap((s) => s.nestedOwnInstant);
    const raw = [
      ...single.rows
        .filter((r) => r.attribute === ":_tx/change")
        .map((r) => JSON.parse(r.value_json)),
      ...nested,
    ];
    assert.ok(raw.length >= 6);
    for (const change of raw) {
      assert.ok(!("recordedAt" in change));
      assert.ok(!("retractedAt" in change));
    }
    assert.equal(single.hydrated.changes.length, 2);
    for (const change of single.hydrated.changes) assert.equal(change.recordedAt, single.r.instant);
  }
  const measurement = json("scan-cost.stdout");
  assert.equal(measurement.engineIO, false);
  assert.equal(measurement.measurements.length, 8);
  for (const row of measurement.measurements) {
    assert.equal(row.pairs.length, 6);
    assert.equal(row.rt01RowVisitsPerGuard, 2 * row.baselineRowVisitsPerGuard);
    for (const pair of row.pairs)
      assert.ok(Number.isFinite(pair.baselineMs) && Number.isFinite(pair.rt01Ms));
  }
} catch (error) {
  failure = String(error);
}
const after = snapshot();
const sourceUnchanged = JSON.stringify(before) === JSON.stringify(after);
if (!sourceUnchanged) failure = `${failure ?? ""} source drift`;
fs.writeFileSync(
  path.join(output, "execution.json"),
  JSON.stringify(
    {
      attempt: randomUUID(),
      context: "offline-transport-only",
      head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
      before,
      after,
      sourceUnchanged,
      phases,
      error: failure ?? null,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    phases: phases.map((p) => ({ name: p.name, exit: p.exit })),
    sourceUnchanged,
    error: failure ?? null,
  }),
);
process.exitCode = failure ? 1 : 0;

if (scanOnly && !failure) await import("./finalize.mjs");
