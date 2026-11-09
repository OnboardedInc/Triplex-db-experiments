// [EXP-QNODELAY] Why: future mode-less producers must be found by tree traversal,
// not by opting into a receipt type. Rejected: testing only the known C8 path.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { discoverSources, auditSources, digest } from "./coverage.mjs";

for (const tree of ["lab", "packages"])
  for (const name of [
    "new-summary.mjs",
    "new-writer.ts",
    "new-writer.tsx",
    "new-writer.jsx",
    "new-writer.py",
    "new-writer.sh",
  ]) {
    test(`discovers an unregistered mode-less timing writer under ${tree}: ${name}`, () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-coverage-"));
      try {
        fs.mkdirSync(path.join(root, tree));
        const code = name.endsWith(".py")
          ? 'print(json.dumps({"p99": 42}))'
          : name.endsWith(".sh")
            ? 'echo "{\\"queryMs\\":42}"'
            : "const sample = { elapsedMsDiagnostic: 42 }; console.log(JSON.stringify(sample));";
        fs.writeFileSync(path.join(root, tree, name), code);
        const sources = discoverSources(root);
        assert.equal(sources.length, 1);
        assert.match(auditSources(sources, []).join("\n"), /requires review/);
        const reviewed = [
          {
            path: `${tree}/${name}`,
            sha256: digest(code),
            role: "labeled",
            reason: "QLever timing fixture",
          },
        ];
        assert.match(auditSources(sources, reviewed).join("\n"), /lacks checked mode/);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }

test("changed exclusions and removed mode fields cannot retain prior approval", () => {
  const source = {
    path: "lab/old.mjs",
    text: "console.log(JSON.stringify({ms: 3}))",
    sha256: digest("changed"),
  };
  assert.match(
    auditSources(
      [source],
      [
        {
          path: source.path,
          sha256: digest("before"),
          role: "non-qlever",
          reason: "old engine only",
        },
      ],
    ).join("\n"),
    /changed.*requires review/,
  );
  assert.match(
    auditSources(
      [source],
      [{ path: source.path, sha256: source.sha256, role: "labeled", reason: "QLever" }],
    ).join("\n"),
    /lacks checked mode/,
  );
});

for (const mode of ["keep-alive", "per-request", undefined, "unknown"]) {
  test(`actual C8 summary retains/refuses recorded mode ${mode}`, () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-c8-"));
    try {
      const input = {
        lane: "qlever",
        label: "fresh",
        qleverConnectionMode: mode,
        graphs: {
          graph: {
            edges: 1,
            reach: 1,
            native: [{ totalMs: 7, steps: [["read", 3]] }],
            datalog: [5],
          },
        },
      };
      const file = path.join(root, "input.json");
      fs.writeFileSync(file, JSON.stringify(input));
      const result = spawnSync(
        process.execPath,
        ["lab/experiments/EXP-C8-read-only-frontier/summarize-timing.mjs", file],
        {
          encoding: "utf8",
          env: { ...process.env, TRIPLEX_QLEVER_CONNECTION_MODE: "per-request" },
        },
      );
      if (!mode || mode === "unknown") {
        assert.notEqual(result.status, 0);
        assert.equal(result.stdout, "");
      } else {
        assert.equal(result.status, 0, result.stderr);
        const output = JSON.parse(result.stdout);
        assert.equal(output.qleverConnectionMode, mode);
        assert.equal(output.nativeTotalMs, "7-7");
        assert.deepEqual(output.datalogMs, [5]);
      }
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("server-log parser requires attribution, never the parser environment", () => {
  const script = "lab/experiments/EXP-002-qlever-baseline/qlever-log-latency.mjs";
  const missing = spawnSync(process.execPath, [script], {
    input: "",
    encoding: "utf8",
    env: { ...process.env, TRIPLEX_QLEVER_CONNECTION_MODE: "per-request" },
  });
  assert.notEqual(missing.status, 0);
  assert.equal(missing.stdout, "");
  const valid = spawnSync(process.execPath, [script, "--connection-mode", "keep-alive"], {
    input: "",
    encoding: "utf8",
  });
  assert.equal(valid.status, 0, valid.stderr);
  const row = JSON.parse(valid.stdout);
  assert.equal(row.qleverConnectionMode, "keep-alive");
  assert.match(row.modeEvidence, /caller-declared/);
});

test("execution-tree profiler labels every output line and refuses absent attribution", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "qnodelay-prof-"));
  try {
    const file = path.join(root, "raw.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        resultsize: 1,
        time: 7,
        runtimeInformation: {
          query_execution_tree: { description: "fixture", operation_time: 3, total_time: 7 },
        },
      }),
    );
    const script = "lab/research/R35-probes/prof.py";
    const missing = spawnSync("python3", [script, file], { encoding: "utf8" });
    assert.notEqual(missing.status, 0);
    assert.equal(missing.stdout, "");
    const result = spawnSync("python3", [script, file, "--connection-mode", "per-request"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert(
      result.stdout
        .trim()
        .split("\n")
        .every((line) => line.startsWith("qleverConnectionMode=per-request")),
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a labeled file cannot serialize another mode-less timing literal", () => {
  const text =
    'latencyReceipt({qleverConnectionMode:"keep-alive"}); console.log(JSON.stringify({p99:42}));';
  const source = { path: "packages/new-summary.mjs", text, sha256: digest(text) };
  const reviewed = [
    { path: source.path, sha256: source.sha256, role: "labeled", reason: "QLever timing" },
  ];
  assert.match(auditSources([source], reviewed).join("\n"), /standalone timing literal lacks mode/);
});
