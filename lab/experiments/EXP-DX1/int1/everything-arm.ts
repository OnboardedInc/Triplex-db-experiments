import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { deepSeed } from "../../../bench/lib/deep-trace.ts";
import {
  frozenDeep,
  releaseDeepStart,
  type DeepIdentity,
} from "../../../bench/lib/deep-profile.ts";
import { fieldPlan } from "./field-plan.ts";
import { type CampaignCase } from "./everything-plan.ts";

export type Arm = {
  source: string;
  slot: string;
  case: CampaignCase;
  identity: DeepIdentity;
  startedAt: number;
  smoke: boolean;
};

export function createArm(source: string, slot: string, c: CampaignCase, smoke: boolean): Arm {
  const identity = {
    source,
    slot,
    people: c.people,
    arm: c.load,
    account: 0,
    nonce: randomUUID(),
    ...(c.profile === "field" ? { field: true as const } : {}),
  };
  return { source, slot, case: c, identity, startedAt: Date.now(), smoke };
}

const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
export function atomicJson(f: string, data: unknown) {
  assert(!fs.existsSync(f));
  fs.writeFileSync(f + ".tmp", JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  fs.renameSync(f + ".tmp", f);
}

export async function executeArm(
  arm: Arm,
  output: string,
  oracleRoot: string,
  env: NodeJS.ProcessEnv,
  deadline: number,
  baseline?: string,
  cpus?: string,
) {
  const { source, slot, identity: id, smoke } = arm;
  assert((arm.case.load === "reader") === Boolean(baseline));
  const barrier = path.join(output, "barrier");
  fs.mkdirSync(barrier);
  atomicJson(path.join(output, "arm.json"), arm);
  const argv = [
    process.execPath,
    "--no-warnings",
    "--experimental-transform-types",
    "--expose-gc",
    "lab/bench/driver.ts",
    "--lane",
    "datomic",
    "--composition",
    "reach-touched",
    "--profile",
    smoke ? "deep-smoke" : "deep",
    "--rung",
    smoke ? "deep-smoke-40" : arm.case.people === 10000 ? "deep-10k" : "deep-100k",
    "--output",
    path.join(output, "ns-report.json"),
    "--oracle-root",
    oracleRoot,
    "--deep-account",
    "0",
    "--deep-nonce",
    id.nonce,
    "--deep-barrier",
    barrier,
    "--seed",
    deepSeed(0),
    "--read-path",
    "replica",
    "--reader-threads",
    smoke ? "2" : "6",
    "--seed-batch-facts",
    "2000",
    "--replica-history-mib",
    "192",
    "--replica-world-cache-mib",
    "32",
    "--replica-fallback-thread",
    "worker",
    "--reader-basis-wire",
    "delta",
    "--expected-state-retention",
    "worker-journal",
    "--receipt-capture",
    "replica-worker",
    "--seed-budget-s",
    String(Math.max(1, (deadline - Date.now()) / 1000)),
    ...(smoke
      ? ["--history-sample", "12", "--oracle-rate", "0.25", "--oracle-max-reads", "48"]
      : []),
    ...(id.field ? ["--int1-field"] : []),
    ...(baseline ? ["--baseline-writes", baseline] : ["--zero-readers"]),
  ];
  const [command, ...args] = cpus ? ["taskset", "-c", cpus, ...argv] : argv;
  const log = fs.openSync(path.join(output, "driver.log"), "wx");
  const child = spawn(command!, args, {
    stdio: ["ignore", log, log],
    env: {
      ...env,
      TRIPLEX_TRACE_SOURCE: source,
      TRIPLEX_TRACE_SLOT: slot,
      TRIPLEX_TRACE_RUN: slot,
      DX_INT1_NATIVE_WRITE_READBACK: "1",
    },
  });
  fs.closeSync(log);
  const cancelled = () => child.kill("SIGTERM");
  process.once("SIGTERM", cancelled);
  process.once("SIGINT", cancelled);
  let exited = false;
  const exit = new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      exited = true;
      resolve(code ?? 128);
    });
  });
  const readyFile = path.join(barrier, "s0.ready.json");
  let timer: NodeJS.Timeout | undefined;
  try {
    while (!fs.existsSync(readyFile)) {
      assert(!exited && Date.now() < deadline, "Driver closed before its ready record");
      await wait(100);
    }
    const { identity, ...ready } = read(readyFile);
    assert.deepEqual(identity, id);
    const expected = id.field ? fieldPlan(0, id.people, smoke) : frozenDeep(0, id.people);
    assert.equal(ready.seed.sha256, expected.populationSha256);
    assert.equal(ready.trace, expected.sha256);
    const start = Date.now() + 10_000;
    assert(start < deadline);
    atomicJson(path.join(barrier, "go.json"), {
      start,
      source,
      slot,
      nonce: id.nonce,
      scopes: { s0: ready },
    });
    const armed = path.join(barrier, "s0.armed.json");
    while (!fs.existsSync(armed)) {
      assert(!exited && Date.now() < start - 300, "Driver did not arm at the recorded scope");
      await wait(50);
    }
    releaseDeepStart(barrier, [id], start);
    timer = setTimeout(cancelled, Math.min(2 ** 31 - 1, deadline - Date.now()));
    const code = await exit;
    atomicJson(path.join(output, "observed.json"), { arm, start, code, endedAt: Date.now() });
    return code;
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGTERM", cancelled);
    process.removeListener("SIGINT", cancelled);
    if (!exited) {
      cancelled();
      await exit;
    }
  }
}
