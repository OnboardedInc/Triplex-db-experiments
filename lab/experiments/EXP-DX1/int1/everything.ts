import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scaleHost, startScaleStack } from "../scale1/bench.ts";
import { stageReplay } from "../scale1/source.ts";
import { measurementWindow } from "../thin1/measure.ts";
import { canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { atomicJson, createArm, executeArm } from "./everything-arm.ts";
import { collect, openPlan } from "./everything-collect.ts";
import { planSummary, treatment } from "./everything-plan.ts";

const repo = fileURLToPath(new URL("../../../../", import.meta.url));
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
const previous = (dir: string, c: { people: number; profile: string; load: string }) =>
  c.load === "zero"
    ? undefined
    : path.join(dir, `${c.people}-${c.profile}-zero`, "ns-writes.jsonl");

export async function localPreflight(dir: string) {
  const source = git("rev-parse", "HEAD");
  const stack = JSON.parse(fs.readFileSync(process.env.DX_THIN_STACK!, "utf8"));
  assert(
    stack.managed?.compact && stack.containers.length === 1 && stack.managed.gwPolicy === "demand",
  );
  assert(
    stack.writeUrl === process.env.DATOMIC_URL && stack.readUrl === process.env.DATOMIC_READ_URLS,
  );
  const lease = measurementWindow(
    sha256(canonical([source, stack.containers, stack.prefix, "campaign-fixture"])),
    stack.prefix,
  );
  fs.mkdirSync(dir);
  const oracle = path.join(dir, "oracle");
  atomicJson(path.join(dir, "oracle-source.json"), stageReplay(repo, oracle));
  atomicJson(path.join(dir, "physical-inputs.json"), {
    source,
    slot: stack.prefix,
    containers: stack.containers,
    gatewaySource: stack.gatewaySourceSha256,
  });
  const cases = openPlan(dir, source, true, "leased-mac");
  try {
    for (const c of cases) {
      await lease.checkpoint();
      const out = path.join(dir, c.key);
      fs.mkdirSync(out);
      const id = createArm(source, stack.prefix, c, true);
      assert.equal(
        await executeArm(
          id,
          out,
          oracle,
          { ...process.env, ...treatment },
          Date.now() + 180_000,
          previous(dir, c),
        ),
        0,
      );
      await collect(dir, "produce");
    }
    const result = await collect(dir, "verify");
    assert.equal(result.results.filter((r) => r.state === "measured").length, cases.length);
    atomicJson(path.join(dir, "comparison.json"), result);
  } finally {
    lease.release();
  }
}

async function physicalCases(
  dir: string,
  end: number,
  source: string,
  tag: string,
  topology: string[][],
  smoke: boolean,
) {
  const oracle = path.join(dir, "oracle");
  atomicJson(path.join(dir, "oracle-source.json"), stageReplay(repo, oracle));
  atomicJson(path.join(dir, "physical-inputs.json"), {
    source,
    topology,
    placement: scaleHost.planCpus,
  });
  const cases = openPlan(dir, source, smoke, "physical");
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
  };
  process.on("SIGTERM", interrupt);
  process.on("SIGINT", interrupt);
  try {
    for (const [i, c] of cases.entries()) {
      assert(!interrupted && Date.now() + 60_000 < end);
      assert(
        fs.statfsSync(dir).bavail * fs.statfsSync(dir).bsize >=
          (c.people === 100000 ? 70 : 30) * 1024 ** 3,
        "Disk headroom for raw seed, WAL and observations",
      );
      const out = path.join(dir, c.key),
        slot = `tx2-dxscale1-int1-${tag}-${i}`;
      const id = createArm(source, slot, c, smoke);
      fs.mkdirSync(out);
      atomicJson(path.join(out, "attempt.json"), {
        tag: c.key,
        slot,
        source,
        nonce: id.identity.nonce,
      });
      assert(Object.values(scaleHost.childrenInventory(slot)).every((items) => items.length === 0));
      let exit: number;
      try {
        const { env, engines } = startScaleStack(out, slot, source, false, {
          ...treatment,
          DX_WRITE_BUDGET_US: "",
          DX_GW_WRITE_JAVA_OPTS:
            "-Xms64m -Xmx384m -Ddatomic.objectCacheMax=32m -XX:MinHeapFreeRatio=15 -XX:MaxHeapFreeRatio=30",
          DX_GW_READ_JAVA_OPTS:
            "-Xms64m -Xmx384m -Ddatomic.objectCacheMax=32m -XX:MinHeapFreeRatio=15 -XX:MaxHeapFreeRatio=30",
        });
        atomicJson(path.join(out, "placement.json"), engines);
        const snapshot = () => scaleHost.snapshot(slot);
        atomicJson(path.join(out, "before.json"), snapshot());
        exit = await executeArm(
          id,
          out,
          oracle,
          {
            ...env,
            DATOMIC_URL: `http://${engines["gw-w"].address}:8080`,
            DATOMIC_READ_URLS: `http://${engines["gw-r"].address}:8080`,
            TRIPLEX_NODE_MAIN_CPUS: scaleHost.planCpus.senders,
            TRIPLEX_NODE_WORKER_CPUS: scaleHost.planCpus.readers,
          },
          end,
          previous(dir, c),
          [scaleHost.planCpus.senders, scaleHost.planCpus.readers].join(","),
        );
        atomicJson(path.join(out, "after.json"), snapshot());
      } finally {
        scaleHost.clean(out, slot);
      }
      const partial = await collect(dir, "produce");
      assert.equal(partial.results[i]?.state, "measured");
      assert.equal(exit, 0);
    }
    const verified = await collect(dir, "verify");
    assert.equal(verified.results.filter((r) => r.state === "measured").length, cases.length);
    atomicJson(path.join(dir, "comparison.json"), verified);
  } finally {
    process.removeListener("SIGTERM", interrupt);
    process.removeListener("SIGINT", interrupt);
  }
}

async function physicalCampaign(dir: string, cutoff: string) {
  scaleHost.physical();
  const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock"),
    held = fs.statSync(`/proc/${process.ppid}/fd/9`);
  assert(held.ino === lock.ino && held.dev === lock.dev, "Use the shared queue wrapper");
  const end = Date.parse(cutoff),
    tag = path.basename(dir);
  assert(/^[a-z][a-z0-9-]{2,24}$/.test(tag) && end > Date.now() + 60_000);
  const source = git("rev-parse", "HEAD");
  assert.equal(git("status", "--porcelain"), "");
  const topology = execFileSync("lscpu", ["-p=CPU,CORE,SOCKET"], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter((x) => !x.startsWith("#"))
    .map((x) => x.split(","));
  const cores = new Map(topology.map(([n, core, socket]) => [Number(n), `${socket}/${core}`]));
  assert.equal(
    new Set(Array.from({ length: 12 }, (_, i) => cores.get(i)).filter(Boolean)).size,
    12,
  );
  assert.equal(execFileSync("docker", ["ps", "-q"], { encoding: "utf8" }).trim(), "");
  fs.mkdirSync(dir);
  const preflight = path.join(dir, "preflight");
  fs.mkdirSync(preflight);
  // [DX-THIN1] Why: consume the separately saved terminal bytes before admitting a long arm. Rejected: a collector that was only tested on synthesized summary JSON.
  await physicalCases(preflight, end, source, tag + "-check", topology, true);
  assert.equal((await collect(preflight, "verify")).source, source);
  await physicalCases(dir, end, source, tag, topology, false);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(repo);
  const [action = "--plan", dest, cutoff] = process.argv.slice(2);
  if (action === "--plan") console.log(JSON.stringify(planSummary(), null, 2));
  else if (action === "--verify") {
    assert(dest);
    const actual = await collect(path.resolve(dest), "verify");
    const recorded = JSON.parse(fs.readFileSync(path.join(dest, "comparison.json"), "utf8"));
    assert.deepEqual(JSON.parse(JSON.stringify(actual)), recorded);
    console.log(
      JSON.stringify({
        source: actual.source,
        binding: actual.binding,
        cases: actual.results.length,
      }),
    );
  } else {
    assert(action === "--run" && dest && cutoff && path.isAbsolute(dest));
    await physicalCampaign(dest, cutoff);
  }
}
