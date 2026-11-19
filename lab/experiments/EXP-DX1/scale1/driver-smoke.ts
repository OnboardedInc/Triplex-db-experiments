import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { releaseDeepStart } from "../../../bench/lib/deep-profile.ts";
import { stageReplay } from "./source.ts";
// [DX-SCALE1] Why: exercise the actual NS entry point, native replica, durable feed and oracle barrier before booking a timed arm. Rejected: treating in-process fixture success as a server run.
const dir = path.resolve(process.argv[2] ?? ""),
  holder = process.env.TRIPLEX_LAB_SLOT_OWNER;
assert(dir.startsWith(path.resolve("runs") + path.sep) && !fs.existsSync(dir));
assert(holder && JSON.parse(fs.readFileSync(holder, "utf8")).holder === "DX-SCALE1");
fs.mkdirSync(dir, { recursive: true });
const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  nonce = randomUUID(),
  slot = `tx2-dxscale1-smoke-${nonce}`,
  barrier = path.join(dir, "barrier"),
  oracle = path.join(dir, "oracle");
fs.mkdirSync(barrier);
const tree = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
fs.writeFileSync(
  path.join(dir, "source.json"),
  JSON.stringify({ source, tree, oracle: stageReplay(process.cwd(), oracle) }),
);
const activation = process.argv.includes("--activation");
const clients = [0, 1].map((account) => {
  const out = path.join(dir, `s${account}`);
  fs.mkdirSync(out);
  const fd = fs.openSync(path.join(out, "log"), "wx");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "lab/bench/driver.ts",
      "--lane",
      "datomic",
      "--composition",
      "reach",
      "--profile",
      "deep-smoke",
      "--rung",
      "deep-smoke-40",
      "--deep-account",
      String(account),
      "--deep-nonce",
      nonce,
      "--deep-barrier",
      barrier,
      "--read-path",
      "replica",
      "--replica-fallback-thread",
      "worker",
      "--reader-basis-wire",
      "delta",
      "--reader-threads",
      "1",
      "--oracle-root",
      oracle,
      "--output",
      path.join(out, "ns-report.json"),
      ...(activation ? ["--deep-activation"] : []),
      "--seed-batch-facts",
      "600",
    ],
    {
      env: {
        ...process.env,
        TRIPLEX_DATOMIC_LAYOUT: "lean",
        TRIPLEX_TRACE_SOURCE: source,
        TRIPLEX_TRACE_RUN: slot,
        TRIPLEX_TRACE_SLOT: slot,
        TRIPLEX_TRACE_LEVEL: "off",
        DX_NATIVE_GATES: "0",
        DX_MODEL_COMPACT: "1",
        DX_PUBLICATION_MODE: "worker",
      },
      stdio: ["ignore", fd, fd],
    },
  );
  fs.closeSync(fd);
  return child;
});
const endings = clients.map(
  (child) => new Promise((resolve) => child.once("close", (code) => resolve(code))),
);
try {
  const limit = Date.now() + 360000;
  while (![0, 1].every((i) => fs.existsSync(path.join(barrier, `s${i}.ready.json`)))) {
    assert(
      Date.now() < limit && clients.every((c) => c.exitCode === null && c.signalCode === null),
      "An NS client failed before the start barrier",
    );
    await sleep(250);
  }
  const scopes = Object.fromEntries(
    [0, 1].map((i) => {
      const { identity, ...ready } = JSON.parse(
        fs.readFileSync(path.join(barrier, `s${i}.ready.json`), "utf8"),
      );
      assert(
        identity.nonce === nonce &&
          identity.account === i &&
          identity.slot === slot &&
          identity.source === source,
      );
      return [`s${i}`, ready];
    }),
  );
  const start = Date.now() + 15000;
  fs.writeFileSync(
    path.join(barrier, "go.tmp"),
    JSON.stringify({ scopes, slot, nonce, source, start }),
  );
  fs.renameSync(path.join(barrier, "go.tmp"), path.join(barrier, "go.json"));
  while (![0, 1].every((i) => fs.existsSync(path.join(barrier, `s${i}.armed.json`)))) {
    assert(
      Date.now() < start - 250 &&
        clients.every((c) => c.exitCode === null && c.signalCode === null),
    );
    await sleep(50);
  }
  releaseDeepStart(
    barrier,
    [0, 1].map(
      (i) => JSON.parse(fs.readFileSync(path.join(barrier, `s${i}.ready.json`), "utf8")).identity,
    ),
    start,
  );
  const codes = await Promise.race([
    Promise.all(endings),
    sleep(360000, undefined, { ref: false }).then(() => {
      throw Error("Functional driver deadline exceeded");
    }),
  ]);
  const reports = [0, 1].map((i) =>
    JSON.parse(fs.readFileSync(path.join(dir, `s${i}/ns-report.json`), "utf8")),
  );
  const summary = reports.map((r, i) => ({
    scope: r.scope,
    exit: codes[i],
    source,
    nonce,
    seed: r.deep.seed,
    trace: r.deep.trace,
    commonStart: r.traceStartAbsMs,
    status: r.status,
    activation: r.deep.activationOracle,
    oracle: r.oracle,
    correctness: r.correctness,
    feed: r.priorities?.P3?.bars,
    errors: r.finalizationErrors,
  }));
  fs.writeFileSync(path.join(dir, "scope-checks.json"), JSON.stringify(summary, null, 2));
  assert.deepEqual(codes, [0, 0]);
  if (activation)
    for (const r of reports)
      assert(r.deep.activationOracle?.checked === 40 && r.deep.r2.mutations?.length === 10);
  for (const r of reports) {
    assert(
      r.traceStartAbsMs === start &&
        r.status === "DONE" &&
        r.correctness.reads > 0 &&
        r.correctness.correct === r.correctness.reads &&
        r.oracle.status === "PASS" &&
        r.oracle.reads === r.oracle.modelCorrectOnSameReads,
    );
  }
} finally {
  for (const c of clients) if (c.exitCode === null && c.signalCode === null) c.kill("SIGTERM");
  await Promise.all(endings);
}
