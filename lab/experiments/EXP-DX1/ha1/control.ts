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
import { pipelineArms, pipelineComparison } from "../load1/pipeline.ts";
import { head, modeOf, root, runFile, supportsSingleHost } from "./common.ts";

const [action, tag, layout = "two-host", extra] = process.argv.slice(2),
  mode = modeOf(action ?? "");
assert(tag && /^[a-z][a-z0-9-]{2,40}$/.test(tag), "Expected experiment and a new attempt tag");
assert(mode !== "native-checks");
assert(!extra && (layout === "two-host" || (layout === "one-host" && supportsSingleHost(mode))));
const single = layout === "one-host";
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
const hours = Number(process.env["HA1_BENCH_HOURS"] ?? (pipelineTrial ? 1 : 6));
assert(!pipelineTrial || (single && hours === 1 && !process.env["HA1_PEOPLE"]));
const deadline = Date.now() + 90 * 60_000;
assert(Number.isInteger(hours) && hours >= 1 && hours <= 72);
const sha = head(),
  base = "/var/tmp/triplex-ha1",
  build = base + "/build-" + sha,
  src = build + "/repository",
  bin = build + "/tools/bin/node";
const url = execFileSync("git", ["remote", "get-url", "origin"], {
  cwd: root,
  encoding: "utf8",
}).trim();
assert.equal(url, "https://github.com/OnboardedInc/Triplex-db-experiments.git");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const branch = git("branch", "--show-current");
assert(["exp/DX-HA1-failover-move", "exp/DX-INT1"].includes(branch));
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
const remote = async (i: number, ...args: string[]) =>
  (
    await runFile("ssh", argv(i, ["sudo", "-n", ...args]), {
      encoding: "utf8",
      timeout: pipelineTrial ? Math.max(1, Math.min(25 * 60_000, deadline - Date.now())) : 2400000,
      maxBuffer: 16 * 2 ** 20,
    })
  ).stdout.trim();
const prepare = async (i: number) => {
  const assignment = JSON.parse(await remote(i, "cat", base + "/platform/dedicated.json")),
    machine = (await remote(i, "sha256sum", "/etc/machine-id")).split(/\s/)[0];
  assert.equal(assignment.role, "DX-HA1");
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
let attempt: { nonce: string; prefix: string } | undefined;
let satellite: Satellite | undefined;
try {
  for (const i of sites) {
    await remote(i, "mkdir", lease);
    held.push(i);
  }
  await Promise.all(
    sites.map(async (i) => {
      const prepareScript =
        'set -eu; if ! test -e "$2"; then git -c credential.helper= clone -q --no-checkout "$3" "$1"; git -C "$1" checkout -q --detach "$4"; cd "$1"; bash lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare "$4" "$2"; fi; test "$(cat "$2/results/bootstrap.exit")" = 0; test "$(git -C "$2/repository" rev-parse HEAD)" = "$4"; test -z "$(git -C "$2/repository" status --porcelain)"; test -s "$2/repository/packages/datomic/dist/index.js"';
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
      );
    }),
  );
  const remoteImage = single
    ? "-"
    : await remote(
        1,
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
        1,
        ...dockerOpts,
        "image",
        "inspect",
        "postgres:17-alpine",
        "--format",
        "{{.Id}}",
      );
  // [DX-HA1] Why: the installation shares the server budget. Rejected: granting a fresh 90 minutes after setup.
  const runtime = pipelineTrial
    ? Math.min(3600, Math.floor((deadline - Date.now() - 5 * 60_000) / 1000))
    : hours * 3600;
  assert(runtime > 0, "Server window expired before dispatch");
  const campaign = randomUUID(),
    nonces: string[] = [];
  const store = base + "/" + tag,
    remoteArgs = [
      "sudo",
      "-n",
      "systemd-run",
      "--quiet",
      "--wait",
      "--pipe",
      "--collect",
      "--unit=triplex-ha1-" + tag,
      "--property=RuntimeMaxSec=" + runtime,
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
      process.env["HA1_PEOPLE"] ?? "",
      process.env["HA1_BENCH_SHAPE"] ?? "deep",
      layout,
    ];
  const child = spawn("ssh", argv(0, remoteArgs), { stdio: ["pipe", "pipe", "inherit"] });
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
      nonces.push(attempt.nonce);
      if (!single)
        satellite = new Satellite(attempt.nonce, attempt.prefix, src, [pgImage, remoteImage]);
      continue;
    }
    if (!line.startsWith("@ha1 ")) {
      console.log(line);
      continue;
    }
    const msg = JSON.parse(line.slice(5));
    assert(
      !single && satellite && attempt && Number.isSafeInteger(msg.id) && Array.isArray(msg.args),
    );
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
      ].includes(req[0]!),
    );
    const task = (async () => {
      try {
        const out = await satellite!.call(req, (args) =>
          args[0] === "logs"
            ? remote(1, "sh", "-c", 'exec "$@" 2>&1', "logs", ...dockerOpts, ...args)
            : remote(1, ...dockerOpts, ...args),
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
  await Promise.allSettled([...pending]);
  const code = await done;
  const evidence = path.join(
    process.env["TRIPLEX_TRACE_EVIDENCE"] ??
      path.join(os.homedir(), "Claude", "Projects", "triplex-db-2", "evidence"),
    "DX-HA1",
    tag,
  );
  fs.mkdirSync(path.dirname(evidence), { recursive: true });
  fs.mkdirSync(evidence);
  const archive = store + ".tar.gz";
  await remote(0, "tar", "-C", base, "-czf", archive, tag);
  const expected = (await remote(0, "sha256sum", archive)).split(/\s/)[0]!;
  const copy = spawn("ssh", argv(0, ["sudo", "-n", "cat", archive]), {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const copied = new Promise<number | null>((ok, fail) => {
    copy.once("error", fail);
    copy.once("close", ok);
  });
  const file = path.join(evidence, "raw.tar.gz");
  const transferTimeout = pipelineTrial
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
  const member = (name: string) =>
    JSON.parse(
      execFileSync("tar", ["-xOzf", file, tag + "/" + name], {
        encoding: "utf8",
        maxBuffer: 64 * 2 ** 20,
      }),
    );
  const declaration = member("campaign.json");
  assert.deepEqual(
    [declaration.tag, declaration.sha, declaration.mode, declaration.campaign, declaration.layout],
    [tag, sha, mode, campaign, layout],
  );
  if (code === 0) {
    assert(nonces.length > 0 && nonces.length === declaration.sizes.length);
    for (const [i, nonce] of nonces.entries()) {
      const sub = mode + "-" + nonce + "/",
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
          replayLive(member(sub + arm.arm + ".offers.json"), attempt, arm);
        }
      }
      if (pipelineTrial) {
        // [DX-HA1] Why: compare every published cell to its actual matched offers and controls.
        // Rejected: an early two-cell observation as the complete campaign.
        assert.deepEqual(
          summary.result.map((r: { arm: string }) => r.arm),
          pipelineArms,
        );
        assert.deepEqual(
          member(sub + "load-pipeline-early.json"),
          pipelineComparison(summary.result.slice(0, 3)),
        );
        assert.deepEqual(
          member(sub + "load-pipeline-comparison.json"),
          pipelineComparison(summary.result),
        );
      }
    }
  }
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
      "label=tx2.holder=DX-HA1",
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
      0,
      "systemctl",
      "list-units",
      "--type=service",
      "--state=activating,active,deactivating",
      "--no-legend",
      "--plain",
      "triplex-ha1-" + tag + ".service",
    );
    if (leftovers || nets || active)
      console.error("Bench lease retained; inspect attempt resources on site " + i);
    else await remote(i, "rmdir", lease);
  }
}
