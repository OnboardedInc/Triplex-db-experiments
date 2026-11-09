// [EXP-QNODELAY] Why: any writer representation must hit the same reader schema.
// Rejected: tests whose discovery depends on recognizing a timing unit or output API.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { parseLatencyReceipt, parseLatencyReceipts } from "./parse.ts";
import { summarizeGridCell } from "../experiments/EXP-QG1-qlever-generations/summary-cell.mjs";
import { gsRefusals } from "../scenarios/lib/policy.mjs";

for (const field of [
  "seconds",
  "time",
  "milliseconds",
  "microseconds",
  "ns",
  "us",
  "execution_time",
  "queryLatency",
  "wall_s",
  "p99",
  "elapsedMs",
])
  test(`mode-less QLever receipt is refused regardless of timing field ${field}`, () => {
    const value = { lane: "qlever", [field]: 0.042 };
    for (const input of [value, JSON.stringify(value), Buffer.from(JSON.stringify(value))])
      assert.throws(() => parseLatencyReceipt(input), /qleverConnectionMode/);
  });
for (const mode of [null, "", "unknown", false, 0, undefined])
  test(`invalid mode is refused: ${mode}`, () => {
    assert.throws(
      () => parseLatencyReceipt({ seconds: 1, qleverConnectionMode: mode }),
      /qleverConnectionMode/,
    );
  });
for (const mode of ["keep-alive", "per-request"])
  test(`valid ${mode} receipt preserves exact payload and is independent of environment`, () => {
    const input = {
      lane: "qlever",
      qleverConnectionMode: mode,
      time: 0.042,
      payload: ["é", 7, null],
    };
    assert.deepEqual(parseLatencyReceipt(Buffer.from(JSON.stringify(input))), input);
    assert.equal(parseLatencyReceipt(input), input);
  });
test("unknown identity cannot turn absent/null mode into non-QLever", () => {
  assert.throws(() => parseLatencyReceipt({ qleverConnectionMode: null }), /qleverConnectionMode/);
  assert.throws(
    () => parseLatencyReceipt({ lane: "qlever", qleverConnectionMode: null }, { lane: "xtdb" }),
    /qleverConnectionMode/,
  );
  assert.deepEqual(parseLatencyReceipt({ lane: "xtdb", qleverConnectionMode: null, time: 1 }), {
    lane: "xtdb",
    qleverConnectionMode: null,
    time: 1,
  });
  assert.throws(
    () => parseLatencyReceipt(Object.create({ qleverConnectionMode: "keep-alive" })),
    /qleverConnectionMode/,
  );
});
test("arrays validate each receipt and nested explicit metadata cannot contradict schema", () => {
  const valid = { qleverConnectionMode: "keep-alive", results: [{ seconds: 1 }] };
  assert.deepEqual(parseLatencyReceipts(JSON.stringify([valid])), [valid]);
  assert.throws(() => parseLatencyReceipts([valid, { seconds: 1 }]), /qleverConnectionMode/);
  assert.throws(
    () => parseLatencyReceipt({ ...valid, results: [{ qleverConnectionMode: "invalid" }] }),
    /nested/,
  );
  for (const value of [null, [], 1, '"hello"']) assert.throws(() => parseLatencyReceipt(value));
});
test("actual GS gate policy refuses unlabelled input before evaluating the report", () => {
  assert.throws(() => gsRefusals({ lane: "qlever", seconds: 1 }, "0.4.0"), /qleverConnectionMode/);
});
test("actual QG1 comparison refuses unlabelled cells and samples", () => {
  assert.throws(() => summarizeGridCell("M", { seconds: 1 }, null), /qleverConnectionMode/);
  const cell = {
    qleverConnectionMode: "keep-alive",
    before: { deltaTriples: {} },
    c8: {},
    results: { read: [{ seconds: 1 }, { seconds: 1 }] },
  };
  assert.throws(() => summarizeGridCell("M", cell, null), /qleverConnectionMode/);
});
for (const mode of ["keep-alive", "per-request", undefined, null, "unknown"])
  test(`actual C8 reader retains/refuses mode ${mode}`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-r4-c8-"));
    try {
      const input = {
        lane: "qlever",
        qleverConnectionMode: mode,
        graphs: { g: { native: [{ totalMs: 7, steps: [["read", 3]] }], datalog: [5] } },
      };
      const file = path.join(root, "receipt.json");
      fs.writeFileSync(file, JSON.stringify(input));
      const result = spawnSync(
        process.execPath,
        ["lab/experiments/EXP-C8-read-only-frontier/summarize-timing.mjs", file],
        {
          encoding: "utf8",
          env: { ...process.env, TRIPLEX_QLEVER_CONNECTION_MODE: "per-request" },
        },
      );
      if (mode === "keep-alive" || mode === "per-request") {
        assert.equal(result.status, 0, result.stderr);
        const output = JSON.parse(result.stdout);
        assert.equal(output.qleverConnectionMode, mode);
        assert.equal(output.nativeTotalMs, "7-7");
        assert.deepEqual(output.datalogMs, [5]);
      } else {
        assert.notEqual(result.status, 0);
        assert.equal(result.stdout, "");
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
test("Python profiler delegates to TS: CLI/environment cannot repair a mode-less receipt", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-r4-py-"));
  try {
    const file = path.join(root, "receipt.json");
    const input = {
      resultsize: 1,
      time: 7,
      runtimeInformation: {
        query_execution_tree: { description: "fixture", operation_time: 3, total_time: 7 },
      },
    };
    const args = ["lab/research/R35-probes/prof.py", file, "--connection-mode", "per-request"];
    fs.writeFileSync(file, JSON.stringify(input));
    const bad = spawnSync("python3", args, {
      encoding: "utf8",
      env: { ...process.env, TRIPLEX_QLEVER_CONNECTION_MODE: "per-request" },
    });
    assert.notEqual(bad.status, 0);
    assert.equal(bad.stdout, "");
    fs.writeFileSync(file, JSON.stringify({ ...input, qleverConnectionMode: "per-request" }));
    const good = spawnSync("python3", args, { encoding: "utf8" });
    assert.equal(good.status, 0, good.stderr);
    assert(
      good.stdout
        .trim()
        .split("\n")
        .every((l) => l.startsWith("qleverConnectionMode=per-request")),
    );
    const mismatch = spawnSync("python3", [args[0], file, "--connection-mode", "keep-alive"], {
      encoding: "utf8",
    });
    assert.notEqual(mismatch.status, 0);
    assert.equal(mismatch.stdout, "");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("actual alternate writer outputs are refused at the shared read boundary", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-r4-writer-"));
  try {
    const file = path.join(root, "receipt.json");
    const py = spawnSync(
      "python3",
      [
        "-c",
        'import json as j,sys\nwith open(sys.argv[1], "w") as output: output.write(j.dumps({"lane":"qlever","seconds":0.042}))',
        file,
      ],
      { encoding: "utf8" },
    );
    assert.equal(py.status, 0, py.stderr);
    assert.throws(() => parseLatencyReceipt(fs.readFileSync(file)), /qleverConnectionMode/);
    const js = spawnSync(
      process.execPath,
      ["-e", 'process.stderr.write(\'{"lane":"qlever","seconds":0.042}\\n\');'],
      { encoding: "utf8" },
    );
    assert.equal(js.status, 0, js.stderr);
    assert.throws(() => parseLatencyReceipt(js.stderr), /qleverConnectionMode/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("NS report generator refuses mode-less input before emitting any bar", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-r4-ns-"));
  try {
    const file = path.join(root, "receipt.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        lane: "qlever",
        priorities: { P4: { bars: [{ value: 0.042, bar: "seconds" }] } },
      }),
    );
    const result = spawnSync(process.execPath, ["lab/bench/summarize.mjs", file], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("server-log percentile reader refuses raw/mode-less input despite CLI attribution", () => {
  const script = "lab/experiments/EXP-002-qlever-baseline/qlever-log-latency.mjs";
  const log =
    "2026-11-09 00:00:00.000 - INFO: Done processing query and sending result, total time was 7 ms\n";
  for (const input of [log, JSON.stringify({ log })]) {
    const result = spawnSync(process.execPath, [script, "--connection-mode", "per-request"], {
      input,
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
  const good = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ qleverConnectionMode: "keep-alive", log }),
    encoding: "utf8",
    env: { ...process.env, TRIPLEX_QLEVER_CONNECTION_MODE: "per-request" },
  });
  assert.equal(good.status, 0, good.stderr);
  const output = JSON.parse(good.stdout);
  assert.equal(output.qleverConnectionMode, "keep-alive");
  assert.deepEqual(output.queryMs, { n: 1, p50: 7, p90: 7, p99: 7, max: 7, sumMs: 7 });
});
