// [EXP-QNODELAY] Why: execute real file reads and the demonstrated consumers.
// Rejected: enum-only in-memory fixtures or a synthetic controller called verified.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readLatencyRun, LatencyRefusal } from "./parse.ts";
import { latencyReceipt } from "./latency.mjs";
import { summarizeGridCell } from "../experiments/EXP-QG1-qlever-generations/summary-cell.mjs";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-r5-"));
const hash = (b) => createHash("sha256").update(b).digest("hex");
let serial = 0;
const write = (value, ndjson = false) => {
  const file = path.join(root, `receipt-${++serial}.${ndjson ? "ndjson" : "json"}`);
  fs.writeFileSync(
    file,
    ndjson ? value.map((v) => JSON.stringify(v)).join("\n") + "\n" : JSON.stringify(value),
    { flag: "wx" },
  );
  return file;
};
const event = (mode = "keep-alive") =>
  latencyReceipt({
    writer: "triplex-public-load-event/1",
    qleverConnectionMode: mode,
    type: "read",
    startedMs: 0,
    finishedMs: 10,
  });
for (const [field, value, code] of [
  ["receiptVersion", undefined, "VERSION"],
  ["receiptVersion", "future/99", "VERSION"],
  ["latencyWriter", "unregistered/v999", "WRITER"],
  ["units", "seconds", "UNITS"],
  ["qleverConnectionMode", undefined, "MODE"],
  ["qleverConnectionMode", null, "MODE"],
  ["qleverConnectionMode", "no-delay", "MODE"],
  ["finishedMs", "42", "TIMING"],
  ["finishedMs", "not-a-duration", "TIMING"],
  ["finishedMs", -1, "TIMING"],
  ["finishedMs", null, "TIMING"],
  ["finishedMs", undefined, "TIMING"],
])
  test(`typed refusal for ${field}=${value}`, () => {
    const receipt = { ...event(), [field]: value };
    const result = readLatencyRun(write([receipt], true));
    assert.equal(result.ok, false);
    assert(result.refusal instanceof LatencyRefusal);
    assert.equal(result.refusal.code, code);
  });
test("non-finite JSON numbers and missing timing payload are refused", () => {
  const file = write([event()], true);
  fs.writeFileSync(
    file,
    fs.readFileSync(file, "utf8").replace('"finishedMs":10', '"finishedMs":1e400'),
  );
  assert.equal(readLatencyRun(file).refusal.code, "TIMING");
  assert.equal(
    readLatencyRun(
      write([{ ...event(), type: "read", startedMs: undefined, finishedMs: undefined }], true),
    ).refusal.code,
    "TIMING",
  );
});
test("homogeneous run has typed metadata, finite observations and exact path digest", () => {
  const file = write([event(), event()], true),
    run = readLatencyRun(file).unwrap();
  assert.equal(run.receiptVersion, "qlever-latency/1");
  assert.equal(run.writer, "triplex-public-load-event/1");
  assert.equal(run.units, "ms");
  assert.equal(run.transportMode, "keep-alive");
  assert.equal(run.records.length, 2);
  assert(run.timings.every((v) => Number.isFinite(v.milliseconds) && v.milliseconds >= 0));
  assert.equal(run.source.sha256, hash(fs.readFileSync(file)));
});
test("mixed modes are refused, or explicitly returned as two separate populations", () => {
  const file = write([event(), event("per-request")], true);
  assert.equal(readLatencyRun(file).refusal.code, "MIXED_MODE");
  const treatment = readLatencyRun(file, { variedTreatment: "connection-mode" }).unwrap();
  assert.equal(treatment.variedTreatment, "connection-mode");
  assert.equal(treatment.records, undefined);
  for (const mode of ["keep-alive", "per-request"]) {
    assert.equal(treatment.populations[mode].transportMode, mode);
    assert.equal(treatment.populations[mode].records.length, 1);
  }
});
const sample = (ms = 2) =>
  latencyReceipt({ writer: "qg1-sample/1", qleverConnectionMode: "keep-alive", ms, rows: 1 });
const cell = () =>
  latencyReceipt({
    writer: "qg1-cell/1",
    qleverConnectionMode: "keep-alive",
    label: "N0",
    before: { baseTriples: 1, deltaTriples: { total: 0, inserted: 0, deleted: 0 } },
    c8: { status: 0 },
    p4: { status: 0, connectionMode: "keep-alive" },
    results: { base: [sample(), sample(1)] },
  });
const p4 = () =>
  latencyReceipt({
    writer: "qg1-p4/1",
    qleverConnectionMode: "keep-alive",
    summary: { p50: 1, p99: 2 },
    sample: [{ ms: 1, contentEqual: true }],
  });
for (const mutation of [
  "numeric-string",
  "bad-string",
  "missing-ms",
  "negative",
  "units",
  "writer",
  "p4-string",
  "nested-mode",
  "nested-missing-mode",
  "p4-mode",
])
  test(`actual QG1 cell refuses ${mutation} before arithmetic`, () => {
    const c = cell(),
      p = p4();
    if (mutation === "numeric-string") c.results.base[0].ms = "2";
    if (mutation === "bad-string") c.results.base[0].ms = "not-a-duration";
    if (mutation === "missing-ms") delete c.results.base[0].ms;
    if (mutation === "negative") c.results.base[0].ms = -1;
    if (mutation === "units") c.results.base[0].units = "seconds";
    if (mutation === "writer") p.latencyWriter = "unregistered/v999";
    if (mutation === "p4-string") p.summary.p99 = "0.002";
    if (mutation === "nested-mode") c.results.base[0].qleverConnectionMode = "per-request";
    if (mutation === "nested-missing-mode") delete c.results.base[0].qleverConnectionMode;
    if (mutation === "p4-mode") p.qleverConnectionMode = "per-request";
    assert.throws(() => summarizeGridCell("M", write(c), write(p)));
  });
test("actual QG1 cell preserves finite milliseconds and mode", () => {
  const result = summarizeGridCell("M", write(cell()), write(p4()));
  assert.equal(result.queries.base.coldMs, 2);
  assert.equal(result.queries.base.warmMs, 1);
  assert.equal(result.p4Summary.p99, 2);
  assert.equal(result.qleverConnectionMode, "keep-alive");
});
test("actual QG1 summarizer refuses malformed input without creating a summary", () => {
  const dir = path.join(root, "grid-M-attempt2");
  fs.mkdirSync(dir);
  const c = cell();
  c.results.base[0].ms = "bad";
  fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify([c]));
  const out = path.join(root, "summary-out.json");
  const result = spawnSync(
    process.execPath,
    ["lab/experiments/EXP-QG1-qlever-generations/summarize.mjs", root, out],
    { encoding: "utf8" },
  );
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(out), false);
});
for (const mode of ["keep-alive", "per-request", undefined])
  test(`C8 path reader ${mode}`, () => {
    const receipt = latencyReceipt({
      format: "c8-round-timing/1",
      qleverConnectionMode: mode ?? "keep-alive",
      lane: "qlever",
      graphs: { g: { native: [{ totalMs: 7, steps: [["read", 3]] }], datalog: [5] } },
    });
    if (!mode) delete receipt.qleverConnectionMode;
    const result = spawnSync(
      process.execPath,
      ["lab/experiments/EXP-C8-read-only-frontier/summarize-timing.mjs", write(receipt)],
      { encoding: "utf8" },
    );
    if (mode) {
      assert.equal(result.status, 0, result.stderr);
      const value = JSON.parse(result.stdout);
      assert.equal(value.nativeTotalMs, "7-7");
      assert.equal(value.qleverConnectionMode, mode);
    } else {
      assert.notEqual(result.status, 0);
      assert.equal(result.stdout, "");
    }
  });
test("Python delegates the receipt path to the same typed reader", () => {
  const receipt = latencyReceipt({
    writer: "qlever-profile/1",
    qleverConnectionMode: "keep-alive",
    time: 7,
    runtimeInformation: {
      query_execution_tree: { description: "fixture", operation_time: 3, total_time: 7 },
    },
  });
  const file = write(receipt),
    args = ["lab/research/R35-probes/prof.py", file];
  const good = spawnSync("python3", args, { encoding: "utf8" });
  assert.equal(good.status, 0, good.stderr);
  assert(good.stdout.includes("qleverConnectionMode=keep-alive"));
  delete receipt.qleverConnectionMode;
  fs.writeFileSync(file, JSON.stringify(receipt));
  const bad = spawnSync("python3", [...args, "--connection-mode", "keep-alive"], {
    encoding: "utf8",
  });
  assert.notEqual(bad.status, 0);
  assert.equal(bad.stdout, "");
});
test("complete retained-observation reader body rejects mode-less/mixed runs and preserves a homogeneous run", async () => {
  const reader = "qualification/reviews/load-observations-independent.mjs";
  const source = fs.readFileSync(reader, "utf8"),
    fixtureRoot = fs.mkdtempSync(path.join(root, "report-"));
  const canonical = (v) =>
    JSON.stringify(v, (_key, x) =>
      x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, x[k]]),
          )
        : x,
    );
  const rows = [["fixture:name:0:v0"]],
    basis = { scope: "fixture", knownPosition: "1", validAt: 1 },
    paramsSha256 = hash(canonical({ entity: "fixture:entity:0" }));
  const inputs = {
    "spec.json": {
      id: "fixture",
      entities: 1,
      factsPerEntity: 1,
      probeEntities: 11,
      maximumWriterCommands: 0,
      validAt: 1,
    },
    "fixture.json": {
      instances: [{ index: 0, baselinePosition: 1, scope: "fixture", recordedAt: 1 }],
    },
    "oracle.json": {
      entries: { fixture: { expectedSha256: hash(canonical(rows)), paramsSha256, basis } },
    },
  };
  for (const [f, value] of Object.entries(inputs))
    fs.writeFileSync(path.join(fixtureRoot, f), JSON.stringify(value));
  const eventFile = path.join(fixtureRoot, ".devloop/jobs/fixture/attempts/0001/events.ndjson");
  fs.mkdirSync(path.dirname(eventFile), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, "qualification/reviews"), { recursive: true });
  const manifest = {
    queryPath: "qlever-native",
    command: {
      argv: [
        "node",
        "fixture",
        "--spec",
        "spec.json",
        "--fixture",
        "fixture.json",
        "--oracle",
        "oracle.json",
        "--instance",
        "0",
      ],
    },
    inputs: Object.keys(inputs).map((f) => ({
      path: f,
      sha256: hash(fs.readFileSync(path.join(fixtureRoot, f))),
    })),
    evidence: { events: "events.ndjson" },
    profile: {
      startMilliseconds: 0,
      endMilliseconds: 1000,
      requiredClasses: ["point-current"],
      clients: 1,
    },
  };
  const read = {
    ...event(),
    ok: true,
    probe: 0,
    knownPosition: "1",
    taskClass: "point-current",
    paramsSha256,
    basis,
    resultJson: JSON.stringify(rows),
    resultSha256: hash(JSON.stringify(rows)),
    oracleKey: "fixture",
  };
  const body = source
    .replace(/^import .*;\s*$/gm, "")
    .replaceAll(
      "import.meta.dirname",
      JSON.stringify(path.join(fixtureRoot, "qualification/reviews")),
    );
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const execute = new AsyncFunction(
    "assert",
    "createHash",
    "readFile",
    "writeFile",
    "resolve",
    "loadJobManifest",
    "openContext",
    "readState",
    "verifyAttempt",
    "process",
    "console",
    "readLatencyRun",
    "latencyReceipt",
    body,
  );
  for (const [label, events, refusal] of [
    ["modeless", [{ ...read, qleverConnectionMode: undefined }], "MODE"],
    [
      "mixed",
      [read, { ...read, qleverConnectionMode: "per-request", finishedMs: 2 }],
      "MIXED_MODE",
    ],
    ["valid", [read], null],
  ]) {
    fs.writeFileSync(eventFile, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
    let output;
    const run = () =>
      execute(
        assert,
        createHash,
        fs.promises.readFile,
        async (_p, bytes, opts) => {
          assert.equal(opts.flag, "wx");
          output = JSON.parse(bytes);
        },
        path.resolve,
        async () => manifest,
        async () => ({ root: fixtureRoot }),
        async () => ({ jobs: { fixture: {} } }),
        async () => ({
          terminal: { status: "SYNTHETIC-FIXTURE-NOT-VERIFIED" },
          terminalSha256: hash("fixture-only"),
        }),
        { argv: ["node", reader, "fixture/0001", `qualification/reviews/${label}.json`] },
        { log() {} },
        readLatencyRun,
        latencyReceipt,
      );
    if (refusal) {
      await assert.rejects(run, (e) => e.code === refusal);
      assert.equal(output, undefined);
    } else {
      await run();
      assert.equal(output.terminalStatus, "SYNTHETIC-FIXTURE-NOT-VERIFIED");
      assert.equal(output.qleverConnectionMode, "keep-alive");
      assert.equal(output.timedMetrics.classes["point-current"].p99Ms, 10);
    }
  }
  assert.equal(hash(fs.readFileSync(reader)), hash(source));
});
test("actual loadRun body refuses mixed events before calculating one distribution", async () => {
  const source = fs.readFileSync("qualification/devloop/compare.mjs", "utf8");
  const body = source
    .slice(
      source.indexOf("export async function loadRun("),
      source.indexOf("\nfunction compatibility("),
    )
    .replace("export async function", "async function");
  const directory = fs.mkdtempSync(path.join(root, "load-")),
    file = path.join(directory, "events.ndjson");
  const manifest = {
    queryPath: "qlever-native",
    evidence: { events: "events.ndjson" },
    profile: {
      format: "triplex-devloop-load-profile/1",
      id: "fixture",
      clients: 1,
      startMilliseconds: 0,
      endMilliseconds: 1000,
      requiredClasses: ["lookup"],
      fixtureIdentity: "fixture",
      cohortIdentity: "fixture",
      resourceIdentity: "fixture",
    },
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const execute = new AsyncFunction(
    "readLatencyRun",
    "assert",
    "verifyAttempt",
    "readState",
    "ownedPath",
    "loadJobManifest",
    "readJson",
    "join",
    "readOracle",
    "checkReadOracle",
    "finite",
    "percentile",
    "executionResourceIdentity",
    "inputFingerprint",
    "meanGeometry",
    body + '; return loadRun({test:false,root:"fixture"},"fixture/0001");',
  );
  const invoke = () =>
    execute(
      readLatencyRun,
      (ok, code, detail) => assert(ok, `${code}:${detail}`),
      async () => ({
        terminal: { status: "completed_verified_bytes" },
        terminalSha256: "SYNTHETIC-FIXTURE-NOT-VERIFIED",
      }),
      async () => ({ jobs: { fixture: { attempts: [{ id: "0001", directory }] } } }),
      async (_root, p) => (p === directory ? p : path.join(directory, p)),
      async () => manifest,
      async () => ({ controllerPins: [] }),
      path.join,
      async () => ({}),
      () => {},
      Number.isFinite,
      (a, p) => [...a].sort((a, b) => a - b)[Math.ceil(a.length * p) - 1],
      () => "SYNTHETIC",
      () => "SYNTHETIC",
      (a) => Math.exp(a.reduce((s, n) => s + Math.log(n), 0) / a.length),
    );
  const r = {
    ...event(),
    type: "read",
    taskClass: "lookup",
    clientId: 0,
    ok: true,
    knownPosition: "1",
  };
  fs.writeFileSync(
    file,
    [r, { ...r, qleverConnectionMode: "per-request", finishedMs: 2 }]
      .map(JSON.stringify)
      .join("\n") + "\n",
  );
  await assert.rejects(invoke, (e) => e.code === "MIXED_MODE");
  fs.writeFileSync(file, JSON.stringify(r) + "\n");
  const result = await invoke();
  assert.equal(result.qleverConnectionMode, "keep-alive");
  assert.equal(result.classes.lookup.p99Ms, 10);
  assert.equal(result.terminalSha256, "SYNTHETIC-FIXTURE-NOT-VERIFIED");
  const compatibility = source.slice(
    source.indexOf("function compatibility("),
    source.indexOf("\nexport async function calibrate"),
  );
  const identity = new Function("json", compatibility + "; return compatibility;")(JSON.stringify);
  assert.notEqual(identity(result), identity({ ...result, qleverConnectionMode: "per-request" }));
});
test("server-log reader uses validated path bytes and millisecond metadata", () => {
  const receipt = latencyReceipt({
    writer: "qlever-server-log/1",
    qleverConnectionMode: "keep-alive",
    log: "2026-11-09 00:00:00.000 - INFO: Done processing query and sending result, total time was 7 ms\n",
  });
  const result = spawnSync(
    process.execPath,
    ["lab/experiments/EXP-002-qlever-baseline/qlever-log-latency.mjs"],
    { input: JSON.stringify(receipt), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).queryMs.p99, 7);
});
test("metadata preserves a report's semantic writer object", () => {
  const receipt = latencyReceipt({
    format: "tx2-ns-report/2",
    qleverConnectionMode: "keep-alive",
    writer: { visible: 3 },
    read: { p99Ms: 7 },
  });
  const run = readLatencyRun(write(receipt)).unwrap();
  assert.equal(run.writer, "tx2-ns-report/2");
  assert.deepEqual(run.data.writer, { visible: 3 });
  const disguised = { ...receipt, lane: "qlever", qleverConnectionMode: null };
  assert.equal(readLatencyRun(write(disguised), { lane: "xtdb" }).refusal.code, "MODE");
  assert(run.timings.some((v) => v.milliseconds === 7));
});
test("retained feasibility gate refuses modeless/mixed events before writing a verdict", async () => {
  const { verifyRate16Feasibility } =
    await import("../../packages/qualification/experiments/verify-feasibility-contract.ts");
  const dir = fs.mkdtempSync(path.join(root, "feasibility-"));
  fs.writeFileSync(
    path.join(dir, "report.json"),
    JSON.stringify(
      latencyReceipt({
        format: "triplex-public-load-run/1",
        qleverConnectionMode: "keep-alive",
        read: { p99Ms: 10 },
      }),
    ),
  );
  for (const [rows, code] of [
    [[{ ...event(), qleverConnectionMode: undefined }], "MODE"],
    [[event(), event("per-request")], "MIXED_MODE"],
    [[event("per-request")], "MIXED_MODE"],
  ]) {
    fs.writeFileSync(path.join(dir, "events.jsonl"), rows.map(JSON.stringify).join("\n") + "\n");
    await assert.rejects(
      () => verifyRate16Feasibility(dir),
      (e) => e.code === code,
    );
    assert.equal(fs.existsSync(path.join(dir, "strict-contract.json")), false);
  }
});
test("GS policy reads a path and refuses missing transport metadata before qualification", async () => {
  const { gsRefusals } = await import("../scenarios/lib/policy.mjs");
  const receipt = latencyReceipt({
    format: "tx2-gs-run/2",
    qleverConnectionMode: "keep-alive",
    elapsedMs: 0,
    lane: "qlever",
    scenarios: [],
  });
  assert(gsRefusals(write(receipt), "0.4.0").length > 0);
  delete receipt.qleverConnectionMode;
  assert.throws(
    () => gsRefusals(write(receipt), "0.4.0"),
    (e) => e.code === "MODE",
  );
});
test("a homogeneous child cannot be relabeled as a different parent-run mode", () => {
  const file = write([event()], true);
  assert.equal(readLatencyRun(file, { expectedMode: "per-request" }).refusal.code, "MIXED_MODE");
  assert.equal(
    readLatencyRun(file, { expectedMode: "keep-alive" }).unwrap().transportMode,
    "keep-alive",
  );
});
test("selected receipt entries retain only their own timing observations", () => {
  const file = write([cell(), { ...cell(), results: { base: [sample(9), sample(8)] } }]);
  const run = readLatencyRun(file, { entry: 1 }).unwrap();
  assert.equal(run.records.length, 1);
  assert.deepEqual(
    run.timings.map((v) => v.milliseconds),
    [9, 8],
  );
});
test("historical XTDB-only attribution explicitly refuses QLever before event timing reads", () => {
  const file = "qualification/reviews/xtdb-driver-stages-observed-v1-analyze.py";
  const source = fs.readFileSync(file, "utf8");
  assert(source.indexOf("require_xtdb_report(report)\nevents =") > 0);
  const code =
    'import ast,sys\ns=ast.parse(open(sys.argv[1]).read())\nf=next(n for n in s.body if isinstance(n,ast.FunctionDef) and n.name=="require_xtdb_report")\nns={}\nexec(compile(ast.Module(body=[f],type_ignores=[]),sys.argv[1],"exec"),ns)\nfn=ns["require_xtdb_report"]\nfn({"backend":"xtdb","queryPath":"xtdb-native"})\nfor r in [{"backend":"qlever","queryPath":"qlever-native"},{"backend":"xtdb","queryPath":"qlever-native"},{}]:\n try: fn(r)\n except ValueError: pass\n else: raise AssertionError("unsupported backend accepted")\n';
  const result = spawnSync("python3", ["-c", code, file], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
