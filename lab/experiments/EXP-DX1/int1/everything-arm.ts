import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { deepSeed } from "../../../bench/lib/deep-trace.ts";
import {
  releaseDeepStart,
  requireIdentity,
  type DeepIdentity,
} from "../../../bench/lib/deep-profile.ts";
import { campaignTenant, type CampaignCase } from "./everything-plan.ts";
import { fileHash } from "../scale1/measurements.ts";
import { tenantPlan } from "../scale1/tenant-traffic.ts";
import { tenantRung } from "../scale1/tenants.ts";

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
    people: c.total,
    arm: c.load,
    account: 0,
    nonce: randomUUID(),
    tenant: campaignTenant(c, smoke),
  };
  requireIdentity(identity);
  return { source, slot, case: c, identity, startedAt: Date.now(), smoke };
}

const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
export function atomicJson(f: string, data: unknown) {
  assert(!fs.existsSync(f));
  fs.writeFileSync(f + ".tmp", JSON.stringify(data, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  fs.renameSync(f + ".tmp", f);
}

async function sameArtifact(a: string, b: string): Promise<void> {
  const original = fs.lstatSync(a),
    archived = fs.lstatSync(b);
  if (original.isDirectory()) {
    assert(archived.isDirectory());
    const children = fs.readdirSync(a).sort();
    assert.deepEqual(fs.readdirSync(b).sort(), children);
    for (const name of children) await sameArtifact(path.join(a, name), path.join(b, name));
  } else {
    assert(original.isFile() && archived.isFile() && original.size === archived.size);
    assert.equal(await fileHash(b), await fileHash(a));
  }
}

async function archiveDriverOutput(staging: string, output: string) {
  // [DX-INT1] Why: the driver keeps its worktree output boundary and the collector sees the real saved bytes.
  // Rejected: relaxing the driver's directory guard or allowing a terminal record before archiving.
  for (const name of fs.readdirSync(staging)) {
    const original = path.join(staging, name),
      target = path.join(output, name);
    assert(!fs.existsSync(target));
    try {
      fs.renameSync(original, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
      const transfer = target + ".transfer";
      fs.cpSync(original, transfer, { recursive: true, force: false, errorOnExist: true });
      await sameArtifact(original, transfer);
      fs.renameSync(transfer, target);
      fs.rmSync(original, { recursive: true });
    }
  }
  fs.rmdirSync(staging);
}

export async function executeArm(
  arm: Arm,
  output: string,
  oracleRoot: string,
  env: NodeJS.ProcessEnv,
  deadline: number,
  baseline?: string,
  cpus?: string,
  guest?: "owned-ext4",
  seed?: {
    restore?: string;
    capture?: (ready: {
      scope: string;
      seed: { facts: number; people: number; position: number; sha256: string };
    }) => Promise<void>;
  },
) {
  const { source, slot, identity: id, smoke } = arm;
  assert((arm.case.load === "reader") === Boolean(baseline));
  const barrier = path.join(output, "barrier");
  fs.mkdirSync(barrier);
  atomicJson(path.join(output, "arm.json"), arm);
  // [DX-INT1] Why: put the local feed WAL on an actual guest filesystem and export it after the child closes.
  // Rejected: substituting a shared worktree mount for the independently checked feed device.
  const work = guest ? fs.realpathSync("/var/tmp") : path.resolve("runs");
  if (guest) {
    assert(smoke && process.platform === "linux" && fs.statfsSync(work).type === 0xef53);
  }
  fs.mkdirSync(work, { recursive: true });
  const staging = fs.mkdtempSync(path.join(work, `int1-arm-${id.nonce}-`));
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
    tenantRung(id.tenant!),
    "--output",
    path.join(staging, "ns-report.json"),
    ...(guest ? ["--int1-guest-output"] : []),
    "--oracle-root",
    oracleRoot,
    "--deep-account",
    "0",
    "--tenant-study",
    id.tenant!.study,
    "--tenant-topology",
    "pooled",
    "--int1-pooled",
    arm.case.profile,
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
    // [DX-THIN1] Why: legacy rows include native attributes and the full journal for each assertion.
    // Rejected: borrowing SCALE1's 2,000-fact lean-loader frames for the legacy seed.
    "400",
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
    ...(seed?.restore ? ["--verified-seed-image", seed.restore] : []),
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
      ...(guest ? { DX_HARNESS_STORAGE: guest } : {}),
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
  let terminal: { arm: Arm; start: number; code: number; endedAt: number };
  try {
    while (!fs.existsSync(readyFile)) {
      assert(!exited && Date.now() < deadline, "Driver closed before its ready record");
      await wait(100);
    }
    const { identity, ...ready } = read(readyFile);
    assert.deepEqual(identity, id);
    const expected = tenantPlan(id.tenant!, id.arm);
    assert.equal(ready.seed.sha256, expected.populationSha256);
    assert.equal(ready.trace, expected.sha256);
    await seed?.capture?.(ready);
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
    terminal = { arm, start, code, endedAt: Date.now() };
  } finally {
    clearTimeout(timer);
    process.removeListener("SIGTERM", cancelled);
    process.removeListener("SIGINT", cancelled);
    if (!exited) {
      cancelled();
      await exit;
    }
    await archiveDriverOutput(staging, output);
  }
  atomicJson(path.join(output, "observed.json"), terminal);
  return terminal.code;
}
