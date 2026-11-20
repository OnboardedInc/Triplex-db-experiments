import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scaleHost, startScaleStack } from "../scale1/bench.ts";
import { stageReplay } from "../scale1/source.ts";
import { checkImage, restoreSeed, sealSeed } from "../scale1/seed-image.ts";
import { fileHash } from "../scale1/measurements.ts";
import { measurementWindow } from "../thin1/measure.ts";
import { canonical, sha256 } from "../../../bench/lib/w0-world.ts";
import { atomicJson, createArm, executeArm } from "./everything-arm.ts";
import { collect, openPlan } from "./everything-collect.ts";
import { gatewayJvmOptions, planSummary, scorecardCases, treatment } from "./everything-plan.ts";

const repo = fileURLToPath(new URL("../../../../", import.meta.url));
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
const previous = (dir: string, c: { people: number; profile: string; load: string }) =>
  c.load === "zero"
    ? undefined
    : path.join(dir, `${c.people}-${c.profile}-zero`, "ns-writes.jsonl");

export async function localPreflight(dir: string) {
  const fixtureSource = process.env.DX_V01_FIXTURE_SOURCE;
  const source = fixtureSource ?? git("rev-parse", "HEAD");
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
  try {
    fs.mkdirSync(dir);
    const oracle = path.join(dir, "oracle");
    if (fixtureSource) {
      // [DX-V01] Why: mount source read-only and use the oracle bytes staged on the Mac by the holder.
      // Rejected: exposing the shared Git checkout inside the slot.
      const prepared = path.join(path.dirname(dir), "oracle-input");
      fs.cpSync(path.join(prepared, "oracle"), oracle, { recursive: true, errorOnExist: true, force: false });
      fs.copyFileSync(path.join(prepared, "manifest.json"), path.join(dir, "oracle-source.json"), fs.constants.COPYFILE_EXCL);
    } else atomicJson(path.join(dir, "oracle-source.json"), stageReplay(repo, oracle));
    atomicJson(path.join(dir, "physical-inputs.json"), {
      source,
      slot: stack.prefix,
      containers: stack.containers,
      gatewaySource: stack.gatewaySourceSha256,
    });
    const cases = openPlan(dir, source, true, "leased-mac");
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
          undefined,
          "owned-ext4",
        ),
        0,
      );
      await collect(dir, "produce");
    }
    const result = await collect(dir, "verify");
    assert.equal(result.results.filter((r) => r.state === "preflight").length, cases.length);
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
  overnight: boolean,
  held?: { folder: string; hash: string },
) {
  const oracle = path.join(dir, "oracle");
  atomicJson(path.join(dir, "oracle-source.json"), stageReplay(repo, oracle));
  atomicJson(path.join(dir, "physical-inputs.json"), {
    source,
    topology,
    placement: scaleHost.planCpus,
  });
  if (held) {
    const seal = path.join(dir, "held-seal.json");
    fs.copyFileSync(path.join(held.folder, "seed-image.json"), seal, fs.constants.COPYFILE_EXCL);
    assert.equal(await fileHash(seal), held.hash);
    const probe = createArm(source, `tx2-dxscale1-int1-${tag}-0`, scorecardCases()[0]!, false);
    checkImage(JSON.parse(fs.readFileSync(seal, "utf8")), probe.identity);
  }
  const cases = openPlan(dir, source, smoke, "physical", overnight, held?.hash);
  const seeds = path.join(dir, "seeds");
  if (!smoke && !held) fs.mkdirSync(seeds);
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
  };
  process.on("SIGTERM", interrupt);
  process.on("SIGINT", interrupt);
  try {
    for (const [i, c] of cases.entries()) {
      assert(!interrupted && Date.now() + 60_000 < end);
      const minimum = (c.people === 100000 ? 240 : smoke ? 10 : 45) * 1024 ** 3;
      for (const folder of [repo, dir]) {
        const space = fs.statfsSync(folder);
        assert(
          space.bavail * space.bsize >= minimum,
          "Disk headroom for raw seed, WAL and observations",
        );
      }
      // [DX-INT1] Why: the deep identity admits 40-person physical fixtures only under the smoke slot namespace.
      // Rejected: letting a short run use a full campaign slot identity.
      const out = path.join(dir, c.key),
        slot = `tx2-dxscale1-${smoke ? "smoke-" : ""}int1-${tag}-${i}`;
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
          DX_GW_WRITE_JAVA_OPTS: gatewayJvmOptions["gw-w"].join(" "),
          DX_GW_READ_JAVA_OPTS: gatewayJvmOptions["gw-r"].join(" "),
        });
        atomicJson(path.join(out, "placement.json"), engines);
        const snapshot = () => scaleHost.snapshot(slot);
        atomicJson(path.join(out, "before.json"), snapshot());
        const seedDir = path.join(seeds, String(c.people));
        const capture = !held && !smoke && c.profile === "frozen" && c.load === "zero";
        if (capture) fs.mkdirSync(seedDir);
        if (!capture && !smoke) {
          // [DX-V01] Why: both arms restore the same operator-held seal before they mutate it.
          // Rejected: deriving the reader baseline from a database changed by the zero-reader arm.
          await restoreSeed(out, "", id.identity, engines, held?.folder ?? seedDir, held?.hash,
            held ? Math.min(end, Date.now() + 12 * 60_000) : undefined);
        }
        const observedOptions = held ? { ...gatewayJvmOptions, tx: ["-Xmx5g", "-XX:+UseG1GC"] } : gatewayJvmOptions;
        const vm = Object.entries(observedOptions).map(([role, expected]) => {
          const container = engines[role].id;
          const actual = execFileSync(
            "docker",
            [
              "exec",
              container,
              "sh",
              "-ec",
              [
                "for p in /proc/[0-9]*; do",
                '  [ "$(cat "$p/comm" 2>/dev/null)" = java ] || continue',
                '  tr "\\000" "\\n" < "$p/cmdline" | grep -E "^(-Xm[sx]|-XX:|-Ddatomic.objectCacheMax=)"',
                "done",
              ].join("\n"),
            ],
            { encoding: "utf8", timeout: 10_000 },
          )
            .trim()
            .split("\n");
          assert(expected.every((flag) => actual.includes(flag)));
          assert.equal(actual.filter((flag) => /^-XX:\+Use.*GC$/.test(flag)).length, 1);
          assert.equal(actual.filter((flag) => flag.startsWith("-Xmx")).at(-1), role === "tx" ? "-Xmx5g" : "-Xmx384m");
          return { role, container, actual };
        });
        atomicJson(path.join(out, "gateway-jvm.json"), {
          identity: id.identity,
          capturedAt: Date.now(),
          vm,
        });
        const seed = smoke
          ? undefined
          : {
              ...(capture
                ? {
                    capture: async (ready: {
                      scope: string;
                      seed: { facts: number; people: number; position: number; sha256: string };
                    }) => {
                      const proof = await sealSeed(
                        seedDir,
                        slot,
                        { identity: id.identity, ...ready },
                        engines.pg.id,
                      );
                      atomicJson(path.join(out, "captured-seed.json"), proof);
                    },
                  }
                : { restore: path.join(out, "restored-seed.json") }),
            };
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
            DX_MODEL_COMPACT: "1",
            ...(held ? { TX2_ENGINE_CPUS: "5" } : {}),
            NODE_OPTIONS: `--max-old-space-size=${c.people === 100_000 ? 32_768 : 8_192}`,
            TRIPLEX_BENCH_SPILL_MAX_BYTES: String(48 * 1024 ** 3),
          },
          end,
          previous(dir, c),
          [scaleHost.planCpus.senders, scaleHost.planCpus.readers].join(","),
          undefined,
          seed,
        );
        atomicJson(path.join(out, "after.json"), snapshot());
      } finally {
        scaleHost.clean(out, slot);
      }
      const partial = await collect(dir, "produce");
      const state = partial.results[i]?.state;
      assert(smoke ? state === "preflight" : state === "measured" || state === "diagnostic");
      assert.equal(exit, 0);
    }
    const verified = await collect(dir, "verify");
    assert.equal(verified.results.length, cases.length);
    assert(
      verified.results.every((r) =>
        smoke ? r.state === "preflight" : r.state === "measured" || r.state === "diagnostic",
      ),
    );
    atomicJson(path.join(dir, "comparison.json"), verified);
  } finally {
    process.removeListener("SIGTERM", interrupt);
    process.removeListener("SIGINT", interrupt);
  }
}

async function physicalCampaign(dir: string, cutoff: string, overnight: boolean, held?: {folder: string; hash: string}) {
  scaleHost.physical();
  const lock = fs.statSync("/var/tmp/triplex-bm1/dx-bm1-day.lock"),
    queueFd = fs.statSync(`/proc/${process.ppid}/fd/9`);
  assert(queueFd.ino === lock.ino && queueFd.dev === lock.dev, "Use the shared queue wrapper");
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
  if (held) {
    assert(tag.startsWith("v01-"));
    await physicalCases(dir, end, source, tag, topology, false, false, held);
    return;
  }
  const preflight = path.join(dir, "preflight");
  fs.mkdirSync(preflight);
  // [DX-THIN1] Why: consume the separately saved terminal bytes before admitting a long arm. Rejected: a collector that was only tested on synthesized summary JSON.
  await physicalCases(preflight, end, source, tag + "-check", topology, true, overnight);
  assert.equal((await collect(preflight, "verify")).source, source);
  await physicalCases(dir, end, source, tag, topology, false, overnight);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(repo);
  const [action = "--plan", dest, cutoff, selection = "--both", seedFolder, sealHash] = process.argv.slice(2);
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
    assert(["--both", "--overnight", "--scorecard"].includes(selection));
    let held;
    if (selection === "--scorecard") {
      assert(seedFolder && path.isAbsolute(seedFolder) && sealHash && /^[a-f0-9]{64}$/.test(sealHash));
      held = { folder: fs.realpathSync(seedFolder), hash: sealHash };
    }
    await physicalCampaign(dest, cutoff, selection === "--overnight", held);
  }
}
