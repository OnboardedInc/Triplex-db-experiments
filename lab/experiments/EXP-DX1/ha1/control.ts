import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { Satellite } from "./satellite.ts";
import { replayLive } from "../load1/live-evidence.ts";
import { pacedArms } from "../load1/pacing.ts";
import { pipelineArms, pipelineComparison } from "../load1/pipeline.ts";
import { hash, head, modeOf, root, runFile, supportsSingleHost } from "./common.ts";
import { benchTrials, seeds, subjects, workingMs } from "../hasync1/v2/bench-plan.ts";
import { recountTraffic } from "../hasync1/offers.ts";
import { measurements, score, type Identity } from "../p9/score.ts";
import { priorityModes, verifyPriority9 } from "../p9/verify.ts";
import { seedDirectory } from "../p9/seed.ts";
import { runSuite } from "../p9/suite.ts";

const [action, tag, layout = "two-host", extra] = process.argv.slice(2),
  mode = modeOf(action ?? "");
assert(tag && /^[a-z][a-z0-9-]{2,40}$/.test(tag), "Expected experiment and a new attempt tag");
assert(mode !== "native-checks");
assert(!extra && (layout === "two-host" || (layout === "one-host" && supportsSingleHost(mode))));
if (mode === "hasync-suite") process.exit(await runSuite(tag));
const single = layout === "one-host";
const p9 = mode === "hasync-p9";
const scale = mode === "hasync-scale";
const sync = p9 || scale;
const scaleBudget = Math.min(workingMs, Number(process.env["HA1_SCALE_BUDGET_MS"] ?? workingMs));
const recovery = process.env["HA1_RECOVERY_POLICY"] ?? "B";
if (scale)
  assert(Number.isSafeInteger(scaleBudget) && scaleBudget > 0 && ["A", "B"].includes(recovery));
const holder = sync ? "DX-HASYNC1" : "DX-HA1";
const observerSite = sync && !single ? 1 : 0;
const satelliteSite = observerSite === 1 ? 0 : 1;
const sites = single ? [0] : [0, 1];
const servers = single
    ? [process.env["BENCH_SERVER"]]
    : [process.env["BENCH_SERVER"], process.env["BENCH_SERVER_B"]],
  addrs = single ? [] : [process.env["HA1_LINK_A"], process.env["HA1_LINK_B"]];
assert(servers.every((s) => s && /^[a-z0-9_]+@[a-zA-Z0-9.-]+$/.test(s)));
assert(
  single ||
    (servers[0] !== servers[1] &&
      addrs[0] !== addrs[1] &&
      addrs.every((s) => s && /^\d+(?:\.\d+){3}$/.test(s))),
);

const pipelineTrial = mode === "load-pipeline";
const pacedTrial = mode === "load-paced";
const shortCampaign = pipelineTrial || pacedTrial;
const hours = Number(process.env["HA1_BENCH_HOURS"] ?? (shortCampaign ? 1 : 6));
assert(!shortCampaign || (single && hours === 1 && !process.env["HA1_PEOPLE"]));
const deadline = Date.now() + 90 * 60_000;
assert(Number.isInteger(hours) && hours >= 1 && hours <= 72);
const sha = head(),
  base = "/var/tmp/triplex-ha1",
  build = base + "/build-" + sha,
  src = build + "/repository",
  bin = build + "/tools/bin/node";
const p9Identity = () => {
  const age = process.env["P9_AGE"] ?? "fresh";
  const seedSha256 = process.env["P9_SEAL_SHA256"];
  const policy = process.env["HA1_RECOVERY_POLICY"] ?? "B";
  assert(age === "fresh" || age === "1B");
  assert(
    seedSha256 && /^[0-9a-f]{64}$/.test(seedSha256),
    "Set the expected pooled seed manifest SHA256",
  );
  assert(policy === "A" || policy === "B");
  return { tag, sha, layout, age, policy, seedSha256 } satisfies Identity;
};
const priority = p9 ? p9Identity() : undefined;
const url = execFileSync("git", ["remote", "get-url", "origin"], {
  cwd: root,
  encoding: "utf8",
}).trim();
assert.equal(url, "https://github.com/OnboardedInc/Triplex-db-experiments.git");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const branch = git("branch", "--show-current");
assert(
  (sync
    ? ["exp/DX-HASYNC1-sync-failover", "exp/DX-INT1", "exp/DX-V01-scorecard"]
    : ["exp/DX-HA1-failover-move", "exp/DX-INT1"]
  ).includes(branch),
);
assert.equal(
  git("status", "--porcelain", "--untracked-files=normal"),
  "",
  "Publish changes before dispatch",
);
const advertised = execFileSync(
  "git",
  ["-c", "credential.helper=", "ls-remote", url, "refs/heads/" + branch],
  {
    encoding: "utf8",
    timeout: 30000,
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
    },
  },
).trim();
assert.equal(advertised.split(/\s/)[0], sha);
const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
function argv(i: number, args: string[]) {
  return [
    "-T",
    "-F",
    "/dev/null",
    "-i",
    process.env["DX_BENCH_KEY"] ?? path.join(os.homedir(), ".ssh", "triplex_bench_ed25519"),
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "BatchMode=yes",
    "-o",
    "ForwardAgent=no",
    "-o",
    "StrictHostKeyChecking=yes",
    "-o",
    "ConnectTimeout=10",
    servers[i]!,
    args.map(quote).join(" "),
  ];
}
const remoteTimed = async (i: number, timeout: number, ...args: string[]) =>
  (
    await runFile("ssh", argv(i, ["sudo", "-n", ...args]), {
      encoding: "utf8",
      timeout: shortCampaign ? Math.max(1, Math.min(timeout, deadline - Date.now())) : timeout,
      maxBuffer: 16 * 2 ** 20,
    })
  ).stdout.trim();
const remote = (i: number, ...args: string[]) => remoteTimed(i, 2400000, ...args);
const prepare = async (i: number) => {
  const assignment = JSON.parse(await remote(i, "cat", base + "/platform/dedicated.json")),
    machine = (await remote(i, "sha256sum", "/etc/machine-id")).split(/\s/)[0];
  assert.equal(assignment.role, holder);
  assert.equal(assignment.machineIdSha256, machine);
  assert.equal(await remote(i, "docker", "-H", "unix:///var/run/docker.sock", "ps", "-q"), "");
  if (!single) {
    const ips = JSON.parse(await remote(i, "ip", "-j", "-4", "addr", "show"));
    assert(ips.some((d: any) => d.addr_info.some((v: any) => v.local === addrs[i])));
  }
  return machine;
};
const ids = await Promise.all(sites.map(prepare));
if (!single) assert.notEqual(ids[0], ids[1]);
const lease = base + "/campaign.lock",
  held: number[] = [];
const dockerOpts = ["docker", "-H", "unix:///var/run/docker.sock"];
let attempt: { nonce: string; prefix: string; mode?: string; sequence?: number } | undefined;
let satellite: Satellite | undefined;
const trialSatellites = new Map<string, Satellite>();
const store = base + "/" + tag;
let seedDirCreated = false;
let suiteArchiveVerified = false;
try {
  for (const i of sites) {
    await remote(i, "mkdir", lease);
    held.push(i);
  }
  await Promise.all(
    sites.map(async (i) => {
      const prepareScript =
        'set -eu; if ! test -e "$2"; then test "$5" = build; git -c credential.helper= clone -q --no-checkout "$3" "$1"; git -C "$1" checkout -q --detach "$4"; cd "$1"; bash lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare "$4" "$2"; fi; test "$(cat "$2/results/bootstrap.exit")" = 0; test "$(git -C "$2/repository" rev-parse HEAD)" = "$4"; test -z "$(git -C "$2/repository" status --porcelain)"; test -s "$2/repository/packages/datomic/dist/index.js"';
      await remote(
        i,
        "env",
        "GIT_CONFIG_GLOBAL=/dev/null",
        "GIT_CONFIG_NOSYSTEM=1",
        "GIT_TERMINAL_PROMPT=0",
        "sh",
        "-c",
        prepareScript,
        "prepare",
        base + "/clone-" + sha,
        build,
        url,
        sha,
        sync ? "prepared" : "build",
      );
      if (priority) {
        const dir = seedDirectory(base, priority.age);
        assert.equal(
          (await remote(i, "sha256sum", dir + "/p9-seed.json")).split(/\s/)[0],
          priority.seedSha256,
        );
      }
    }),
  );
  const remoteImage = single
    ? "-"
    : await remote(
        satelliteSite,
        ...dockerOpts,
        "image",
        "inspect",
        "tx2-datomic:1.0.7745-da00",
        "--format",
        "{{.Id}}",
      );
  const pgImage = single
    ? "-"
    : await remote(
        satelliteSite,
        ...dockerOpts,
        "image",
        "inspect",
        "postgres:17-alpine",
        "--format",
        "{{.Id}}",
      );
  // [DX-HA1] Why: the installation shares the server budget. Rejected: granting a fresh 90 minutes after setup.
  const runtime = shortCampaign
    ? Math.min(3600, Math.floor((deadline - Date.now() - 5 * 60_000) / 1000))
    : hours * 3600;
  assert(runtime > 0, "Server window expired before dispatch");
  const campaign = randomUUID(),
    nonces: string[] = [];
  const trials = new Map<string, number>();
  if (sync && !p9) {
    await remote(satelliteSite, "mkdir", store);
    await remote(satelliteSite, "mkdir", "-m", "700", store + "/seed");
    seedDirCreated = true;
  }
  const remoteArgs = [
    "sudo",
    "-n",
    "systemd-run",
    "--quiet",
    "--wait",
    "--pipe",
    "--collect",
    "--unit=triplex-ha1-" + tag,
    "--property=RuntimeMaxSec=" +
      (p9 ? "26min" : scale ? Math.floor(scaleBudget / 1000) + "s" : runtime),
    "--property=KillMode=control-group",
    "--working-directory=" + src,
    bin,
    "--import",
    "tsx",
    src + "/lab/experiments/EXP-DX1/ha1/bench.ts",
    mode,
    tag,
    sha,
    addrs[0] ?? "-",
    addrs[1] ?? "-",
    remoteImage,
    store,
    campaign,
    sync ? "" : (process.env["HA1_PEOPLE"] ?? ""),
    process.env["HA1_BENCH_SHAPE"] ?? "deep",
    layout,
    priority?.age ?? "",
    priority?.seedSha256 ?? "",
    priority?.policy ?? recovery,
    scale ? String(scaleBudget) : "",
  ];
  const child = spawn("ssh", argv(observerSite, remoteArgs), {
    stdio: ["pipe", "pipe", "inherit"],
  });
  const done = new Promise<number | null>((ok, fail) => {
    child.once("error", fail);
    child.once("close", ok);
  });
  const lines = createInterface({ input: child.stdout });
  const pending = new Set<Promise<void>>();
  for await (const line of lines) {
    if (line.startsWith("@attempt ")) {
      attempt = JSON.parse(line.slice(9));
      assert(
        attempt &&
          /^[a-f0-9-]{36}$/.test(attempt.nonce) &&
          attempt.prefix === "tx2-ha1-" + attempt.nonce.slice(0, 8),
      );
      assert(!nonces.includes(attempt.nonce));
      if (sync) {
        const sequence = attempt.sequence!;
        assert(Number.isSafeInteger(sequence) && ![...trials.values()].includes(sequence));
        assert.equal(attempt.mode, p9 ? priorityModes[sequence] : benchTrials[sequence]?.mode);
        trials.set(attempt.nonce, sequence);
      }
      nonces.push(attempt.nonce);
      const key = sync && !p9 ? benchTrials[attempt.sequence!]?.checkpoint : undefined;
      if (!single)
        satellite = new Satellite(
          attempt.nonce,
          attempt.prefix,
          src,
          [pgImage, remoteImage],
          priority
            ? seedDirectory(base, priority.age)
            : sync
              ? store + "/seed" + (key ? "/" + key : "")
              : undefined,
          attempt.mode?.startsWith("hasync-fleet-") ?? false,
        );
      if (sync && satellite) trialSatellites.set(attempt.nonce, satellite);
      continue;
    }
    if (!line.startsWith("@ha1 ")) {
      console.log(line);
      continue;
    }
    const msg = JSON.parse(line.slice(5));
    assert(!single && attempt && Number.isSafeInteger(msg.id) && Array.isArray(msg.args));
    const activeTrial = sync ? trialSatellites.get(msg.nonce) : satellite;
    assert(activeTrial, "Unknown attempt on the management channel");
    const req = msg.args as string[];
    assert(
      [
        "network",
        "image",
        "create",
        "inspect",
        "start",
        "ps",
        "volume",
        "exec",
        "logs",
        "kill",
        "rm",
        ...(sync ? ["stop"] : []),
      ].includes(req[0]!),
    );
    const task = (async () => {
      try {
        const timeout = msg.timeout ?? 2400000;
        assert(Number.isSafeInteger(timeout) && timeout > 0 && timeout <= 2400000);
        const out = await activeTrial.call(req, (args) =>
          args[0] === "logs"
            ? remoteTimed(
                satelliteSite,
                timeout,
                "sh",
                "-c",
                'exec "$@" 2>&1',
                "logs",
                ...dockerOpts,
                ...args,
              )
            : remoteTimed(satelliteSite, timeout, ...dockerOpts, ...args),
        );
        child.stdin.write(JSON.stringify({ id: msg.id, out }) + "\n");
      } catch (err: any) {
        child.stdin.write(
          JSON.stringify({ id: msg.id, error: String(err.stderr || "Remote command failed") }) +
            "\n",
        );
      }
    })();
    pending.add(task);
    void task.finally(() => pending.delete(task));
  }
  await Promise.allSettled(pending);
  const code = await done;
  const evidence = path.join(
    process.env["TRIPLEX_TRACE_EVIDENCE"] ??
      path.join(os.homedir(), "Claude", "Projects", "triplex-db-2", "evidence"),
    holder,
    tag,
  );
  fs.mkdirSync(path.dirname(evidence), { recursive: true });
  fs.mkdirSync(evidence);
  const archive = store + ".tar.gz";
  // Snapshot data stays in the owned scratch directory and is omitted from the receipt archive.
  await remote(
    observerSite,
    "tar",
    ...(sync ? ["--exclude=" + tag + "/seed"] : []),
    "-C",
    base,
    "-czf",
    archive,
    tag,
  );
  const expected = (await remote(observerSite, "sha256sum", archive)).split(/\s/)[0]!;
  if (sync) assert(Number(await remote(observerSite, "stat", "-c", "%s", archive)) <= 2 ** 30);
  const copy = spawn("ssh", argv(observerSite, ["sudo", "-n", "cat", archive]), {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const copied = new Promise<number | null>((ok, fail) => {
    copy.once("error", fail);
    copy.once("close", ok);
  });
  const file = path.join(evidence, "raw.tar.gz");
  const transferTimeout = shortCampaign
    ? setTimeout(() => copy.kill("SIGTERM"), Math.max(1, deadline - Date.now() - 30_000))
    : undefined;
  try {
    await pipeline(copy.stdout, createWriteStream(file, { flags: "wx" }));
    assert.equal(await copied, 0);
  } finally {
    clearTimeout(transferTimeout);
  }
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  assert.equal(digest.digest("hex"), expected);
  const raw = (name: string) =>
    execFileSync("tar", ["-xOzf", file, tag + "/" + name], {
      encoding: "utf8",
      maxBuffer: 64 * 2 ** 20,
    });
  const member = (name: string) => JSON.parse(raw(name));
  const declaration = member("campaign.json");
  assert.deepEqual(
    [declaration.tag, declaration.sha, declaration.mode, declaration.campaign, declaration.layout],
    [tag, sha, mode, campaign, layout],
  );
  fs.writeFileSync(
    path.join(evidence, "transfer.json"),
    JSON.stringify({
      tag,
      sha,
      mode,
      code,
      sha256: expected,
      bytes: fs.statSync(file).size,
      hosts: ids,
      layout,
      campaign,
      nonces,
    }) + "\n",
    { flag: "wx" },
  );
  let p9Verified = false;
  if (priority && trials.size === 2) {
    const members = new Set(
      execFileSync("tar", ["-tzf", file], { encoding: "utf8" }).trim().split("\n"),
    );
    const attemptFor = (sequence: number) => [...trials].find(([, n]) => n === sequence)![0];
    const proof = verifyPriority9(
      { has: (name) => members.has(tag + "/" + name), raw },
      priority,
      campaign,
      expected,
      { fault: attemptFor(0), move: attemptFor(1) },
    );
    const bytes = JSON.stringify(proof, null, 2) + "\n";
    p9Verified = true;
    fs.writeFileSync(path.join(evidence, "p9-verified.json"), bytes, { flag: "wx" });
    for (const id of measurements) console.log(JSON.stringify(score(id, proof.metrics, priority)));
  }
  if (p9) {
    assert(p9Verified, "Both priority 9 attempts are required; raw archive retained");
  } else if (sync) {
    assert.deepEqual(declaration.trials, benchTrials);
    assert.equal(declaration.budget, scaleBudget);
    assert.deepEqual(
      declaration.sizes,
      benchTrials.map((t) => t.people),
    );
    const members = new Set(
      execFileSync("tar", ["-tzf", file], { encoding: "utf8" }).trim().split("\n"),
    );
    const has = (name: string) => members.has(tag + "/" + name);
    const checks = [];
    const sizePoints: { mode: string; nonce: string; facts: number; ms: number }[] = [];
    const checkpoints = new Map<keyof typeof seeds, { nonce: string; observation: any }>();
    const replacements = [];
    const suite = has("suite.json") ? member("suite.json") : undefined;
    if (suite) {
      assert.deepEqual([suite.tag, suite.sha, suite.campaign], [tag, sha, campaign]);
      assert.equal(suite.expected, benchTrials.length);
      assert.equal(suite.subjects, subjects);
    }
    if (code === 0) {
      assert(suite && suite.measured <= scaleBudget && suite.status.length <= benchTrials.length);
      assert.equal(nonces.length, suite.status.length);
      assert.equal(suite.stopped, nonces.length < benchTrials.length ? "budget" : null);
      assert(
        suite.status.every(
          (r: any, i: number) => r.sequence === i && trials.get(r.nonce) === i && r.complete,
        ),
      );
    }
    for (const [nonce, sequence] of trials) {
      const t = benchTrials[sequence]!;
      const key = t.checkpoint;
      if (!key || t.mode !== seeds[key].mode) continue;
      const sub = t.mode + "-" + nonce + "/";
      if (has(sub + "observations.json")) {
        const observation = member(sub + "observations.json");
        const seed = observation.result;
        assert.deepEqual(
          [observation.nonce, observation.slot, observation.source.git],
          [nonce, tag, sha],
        );
        assert.equal(seed.people, t.people);
        assert.equal(
          seed.seal,
          hash(JSON.stringify({ receipts: seed.receipts, history: seed.history ?? null })),
        );
        checkpoints.set(key, { nonce, observation });
      }
    }
    for (const nonce of nonces) {
      const expectedTrial = benchTrials[trials.get(nonce)!]!;
      const sub = expectedTrial.mode + "-" + nonce + "/";
      const attempt = member(sub + "attempt.json");
      assert.deepEqual(
        [attempt.nonce, attempt.mode, attempt.slot, attempt.shape, attempt.source.git],
        [nonce, expectedTrial.mode, tag, "deep", sha],
      );
      const key = expectedTrial.checkpoint;
      const baseline =
        key && expectedTrial.mode !== seeds[key].mode ? checkpoints.get(key) : undefined;
      const events = has(sub + "events.jsonl")
        ? raw(sub + "events.jsonl")
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line))
        : [];
      assert(events.every((event) => event.nonce === nonce));
      let phases;
      if (has(sub + "observations.json")) {
        const obs = member(sub + "observations.json"),
          clean = member(sub + "cleanup.json");
        assert.deepEqual([obs.nonce, obs.slot, obs.source], [nonce, tag, attempt.source]);
        assert.deepEqual(obs.profile, {
          people: expectedTrial.people,
          scopes: expectedTrial.systems,
          capacity: "two-host",
        });
        assert.deepEqual(clean, { nonce, containers: 0, networks: 0 });
        if (key && expectedTrial.mode !== seeds[key].mode) {
          // [DX-HASYNC1] Why: each recovery must read the exact edited snapshot prepared for its own rung. Rejected: binding it by subject count or layout alone.
          assert(baseline);
          const seed = baseline.observation.result;
          assert.deepEqual(obs.source, baseline.observation.source);
          for (const stage of ["before", "after"])
            assert(
              events.some(
                ({ type, data }) =>
                  type === "seed-identity" &&
                  data.stage === stage &&
                  data.manifest === seed.manifest &&
                  data.seal === seed.seal &&
                  data.receipts === seed.receipts.length,
              ),
            );
          const stageMs = (type: string) => events.find((event) => event.type === type)?.ms;
          const between = (start: string, end: string) => {
            const a = stageMs(start),
              b = stageMs(end);
            return typeof a === "number" && typeof b === "number" ? b - a : null;
          };
          if (seed.history)
            phases = {
              replayMs: obs.result.nativeReplay.reduce(
                (n: number, entry: { ms: number }) => n + entry.ms,
                0,
              ),
              replayBytes: obs.result.nativeReplay.reduce(
                (n: number, entry: { bytes: number }) => n + entry.bytes,
                0,
              ),
              brokerMs: between("promoted", "broker-ready"),
              peerMs: between("broker-ready", "peer-ready"),
              rewindMs: events.find((event) => event.type === "rejoined")?.data.ms ?? null,
            };
        }
        if (expectedTrial.mode === "hasync-ack") {
          // [DX-HASYNC1] Why: bind replacement settlement to the archived caller bytes and oracle. Rejected: treating a successful worker exit or a summary count as a receipt.
          const scope = JSON.stringify([
            "triplex-scope-v1",
            "ha1",
            "tx2-ha1-" + nonce.slice(0, 8) + "-replace",
            "test",
            0,
          ]);
          const db = "s2-" + Buffer.from(scope).toString("base64url");
          const binding: {
            nonce: string;
            slot: string;
            source: unknown;
            scope: string;
            db: string;
          } = {
            nonce,
            slot: tag,
            source: attempt.source,
            scope,
            db,
          };
          const pending = member(sub + "replacement-pending.json");
          const wire = member(sub + "replacement-withheld.json");
          const settled = member(sub + "replacement-settled.json");
          const oracleCase = raw(sub + "replacement-oracle-case.json");
          const oracleBytes = raw(sub + "replacement-oracle-expected.json");
          const oracle = JSON.parse(oracleBytes);
          for (const artifact of [pending, wire, settled])
            assert.deepEqual(artifact.binding, binding);
          assert.deepEqual(settled, obs.result.replacementRetry);
          assert.equal(settled.first, "Transport");
          assert.equal(settled.operations, 2);
          assert.equal(pending.sha256, hash(JSON.stringify(pending.input)));
          const bytes = Buffer.from(wire.bytes, "base64");
          assert.equal(hash(bytes), wire.sha256);
          assert.equal(settled.request, wire.sha256);
          const submitted = JSON.parse(bytes.toString("utf8"));
          assert.equal(submitted.operationId, pending.input.operationId);
          assert.deepEqual(submitted.claims, pending.input.claims);
          const [claim] = pending.input.claims;
          assert.deepEqual(wire.survivor, wire.original);
          assert.deepEqual(settled.receipt, {
            commandId: claim.commandId,
            txId: claim.txId,
            operationId: pending.input.operationId,
            position: 2,
            t: wire.original.t.v,
            recordedAt: claim.timestamp,
          });
          assert.deepEqual(wire.original, {
            operationId: settled.receipt.operationId,
            t: { t: "long", v: settled.receipt.t },
            position: { t: "long", v: "2" },
            recordedAt: { t: "double", v: claim.timestamp },
          });
          assert.equal(settled.oracle.case, nonce + "/hasync-ack/replacement");
          assert.equal(oracle.caseId, settled.oracle.case);
          assert.equal(oracle.caseSha256, hash(oracleCase));
          assert.equal(oracle.oracle.id, "O-REPLAY");
          assert.deepEqual(oracle.oracle.sourceSha256, settled.oracle.source);
          assert.equal(oracle.verdict, "PASS");
          assert.equal(hash(oracleBytes), settled.oracle.output);
          replacements.push({ nonce, db, receipt: settled.receipt, oracle: settled.oracle.output });
        }
      } else assert.notEqual(code, 0);
      const labels = expectedTrial.mode.startsWith("hasync-fleet-")
        ? Array.from({ length: expectedTrial.systems }, (_, i) => "cell-" + i)
        : expectedTrial.mode.startsWith("hasync-seed-") ||
            expectedTrial.mode.startsWith("hasync-cost-")
          ? []
          : ["field"];
      for (const label of labels) {
        const leaf = "traffic-" + label;
        if (!has(sub + leaf + "-timing.json")) {
          assert.notEqual(code, 0);
          continue;
        }
        const timing = member(sub + leaf + "-timing.json");
        assert.equal(timing.raw, leaf + ".jsonl");
        const anchor = baseline?.nonce ?? nonce;
        const scopeKey = label.startsWith("cell-")
          ? (10 + Number(label.slice(5))).toString(36)
          : "tx2-ha1-" + anchor.slice(0, 8) + "-sync";
        const database =
          "s2-" +
          Buffer.from(JSON.stringify(["triplex-scope-v1", "ha1", scopeKey, "test", 0])).toString(
            "base64url",
          );
        const counts = recountTraffic(raw(sub + timing.raw), timing, {
          nonce,
          slot: tag,
          source: attempt.source,
          database,
        });
        assert.equal(counts.plan.label, label);
        if (code === 0) assert.equal(counts.read["wrong"], 0);
        if (phases && baseline && counts.faultToNewWriteMs !== null)
          sizePoints.push({
            mode: expectedTrial.mode,
            nonce,
            facts: baseline.observation.result.facts,
            ms: counts.faultToNewWriteMs,
          });
        checks.push({
          nonce,
          label,
          mode: expectedTrial.mode,
          newWriteMs: counts.faultToNewWriteMs,
          gapMs: counts.writeGapMs,
          readGapMs: counts.maxReadGapMs,
          ...(phases && baseline
            ? {
                facts: baseline.observation.result.facts as number,
                phases,
                firstDeepServiceMs: counts.firstDeepServiceMs,
              }
            : {}),
          fate: counts.during,
          targetMs: expectedTrial.mode === "hasync-move" ? 30000 : 60000,
        });
      }
    }
    const sizeFits = ["hasync-ack", "hasync-index", "hasync-move"].flatMap((mode) => {
      const points = sizePoints.filter((point) => point.mode === mode);
      const sizes = new Set(points.map((point) => point.facts));
      if (sizes.size < 2) return [];
      const x = points.map((point) => Math.log2(point.facts));
      const centerX = x.reduce((sum, value) => sum + value, 0) / points.length;
      const centerY = points.reduce((sum, point) => sum + point.ms, 0) / points.length;
      const covariance = points.reduce(
        (sum, point, i) => sum + (x[i]! - centerX) * (point.ms - centerY),
        0,
      );
      const spread = x.reduce((sum, value) => sum + (value - centerX) ** 2, 0);
      return [{ mode, points, millisecondsPerDoubling: covariance / spread }];
    });
    fs.writeFileSync(
      path.join(evidence, "recount.json"),
      JSON.stringify(
        {
          ...declaration,
          sha256: expected,
          checks,
          sizeFits,
          replacements,
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    suiteArchiveVerified = true;
  } else if (code === 0) {
    assert(nonces.length > 0 && nonces.length === declaration.sizes.length);
    for (const [i, nonce] of nonces.entries()) {
      const sub: string = mode + "-" + nonce + "/",
        attempt = member(sub + "attempt.json"),
        summary = member(sub + "observations.json"),
        clean = member(sub + "cleanup.json");
      assert.equal(attempt.nonce, nonce);
      assert.equal(attempt.source.git, sha);
      assert.equal(attempt.slot, tag);
      assert.equal(attempt.mode, mode);
      assert.equal(attempt.shape, declaration.shape);
      assert.equal(declaration.shape, process.env["HA1_BENCH_SHAPE"] ?? "deep");
      assert.deepEqual(summary.source, attempt.source);
      assert.equal(summary.slot, tag);
      assert.equal(summary.nonce, nonce);
      assert.equal(summary.profile.people, declaration.sizes[i]);
      assert.equal(summary.profile.capacity, layout);
      assert.deepEqual(clean, { nonce, containers: 0, networks: 0 });
      if (mode.startsWith("load-") && supportsSingleHost(mode)) {
        for (const arm of summary.result) {
          assert(/^[a-z0-9-]+$/.test(arm.arm) && arm.rate === declaration.sizes[i]);
          replayLive(
            member(sub + arm.arm + ".offers.json"),
            attempt,
            arm,
            false,
            pacedTrial ? summary.result[0]?.neighbors : undefined,
          );
        }
      }
      if (shortCampaign) {
        const order = pacedTrial ? pacedArms : pipelineArms;
        const name = pacedTrial ? "load-paced" : "load-pipeline";
        const bookends = [order[0]!, order.at(-1)!];
        // [DX-HA1] Why: compare every published cell to its actual matched offers and controls.
        // Rejected: an early two-cell observation as the complete campaign.
        assert.deepEqual(
          summary.result.map((r: { arm: string }) => r.arm),
          order,
        );
        assert.deepEqual(
          member(sub + name + "-early.json"),
          pipelineComparison(summary.result.slice(0, 3), bookends),
        );
        assert.deepEqual(
          member(sub + name + "-comparison.json"),
          pipelineComparison(summary.result, bookends),
        );
      }
    }
  }
  assert.equal(code, 0, "Run failed; collected its evidence");
  console.log(evidence);
} finally {
  for (const i of held.reverse()) {
    // [DX-HA1] Why: retain ownership when a disconnected run leaves a role on a physical host. Rejected: freeing a machine on SSH exit alone.
    const leftovers = await remote(
      i,
      ...dockerOpts,
      "ps",
      "-aq",
      "--filter",
      "label=tx2.holder=" + holder,
    );
    const nets = await remote(
      i,
      ...dockerOpts,
      "network",
      "ls",
      "-q",
      "--filter",
      "label=ha1.attempt",
    );
    const active = await remote(
      observerSite,
      "systemctl",
      "list-units",
      "--type=service",
      "--state=activating,active,deactivating",
      "--no-legend",
      "--plain",
      "triplex-ha1-" + tag + ".service",
    );
    const volumes = sync
      ? await remote(i, ...dockerOpts, "volume", "ls", "-q", "--filter", "label=ha1.attempt")
      : "";
    if (leftovers || nets || active || volumes)
      console.error("Bench lease retained; inspect attempt resources on site " + i);
    else {
      if (sync && seedDirCreated && suiteArchiveVerified) {
        await remote(i, "rm", "-r", "--", store + "/seed");
        if (i === satelliteSite) await remote(i, "rmdir", store);
      }
      await remote(i, "rmdir", lease);
    }
  }
}
