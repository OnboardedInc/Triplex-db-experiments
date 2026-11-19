import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { benchRowWire, cases } from "./bench-cases.ts";
const [action = "--plan", tag, cutoff] = process.argv.slice(2);
const wire = benchRowWire(process.env.DX_INT1_ROW_WIRE);
if (action === "--plan") {
  console.log(
    JSON.stringify(
      {
        branch: "exp/DX-INT1",
        cases,
        readers: "reach-touched, revision-validated on demand",
        gateways: "32 MiB peer object cache, 8 MiB row cache, 4096 ID and session entries",
        activity: "2%",
        rowWire: wire,
        deepCold: "200 first reads across all five task classes after the first wide case",
        releases: ["R1", "EAD selector R2"],
        comparison: "same 100 account rosters, command intents and guarded decisions",
        usage: "control.ts launch BATCH UTC_CUTOFF",
      },
      null,
      2,
    ),
  );
} else {
  assert.equal(action, "launch");
  assert(tag && /^[a-z0-9]{1,12}$/.test(tag));
  assert(
    cutoff &&
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(cutoff) &&
      Date.parse(cutoff) > Date.now() + 600000,
  );
  const repo = fileURLToPath(new URL("../../../../", import.meta.url)),
    git = (...a: string[]) => execFileSync("git", a, { cwd: repo, encoding: "utf8" }).trim();
  assert.equal(git("branch", "--show-current"), "exp/DX-INT1");
  assert.equal(git("status", "--porcelain"), "");
  const sha = git("rev-parse", "HEAD"),
    url = git("remote", "get-url", "origin"),
    u = new URL(url);
  assert(
    u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.hash &&
      !u.search &&
      u.pathname === "/OnboardedInc/Triplex-db-experiments.git",
  );
  const published = execFileSync(
    "git",
    ["-c", "credential.helper=", "ls-remote", url, "refs/heads/exp/DX-INT1"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_CONFIG_GLOBAL: "/dev/null",
      },
    },
  ).trim();
  assert.equal(published.split(/\s+/)[0], sha);
  const destination = process.env.BENCH_SERVER;
  assert(
    destination && /^[\w-]+@[a-zA-Z0-9.-]+$/.test(destination),
    "Set BENCH_SERVER to the assigned physical machine",
  );
  const key = process.env.DX_BENCH_KEY ?? path.join(os.homedir(), ".ssh", "triplex_bench_ed25519");
  const root = "/var/tmp/triplex-int1",
    queue = "/var/tmp/triplex-bm1";
  // [DX-INT1] Why: prepare and launch the exact public revision under BM1's physical-host exclusion with an absolute end time and systemd cleanup.
  // Rejected: copying an uncommitted checkout or contacting a bench during local validation.
  const body = `set -eu
 test "$(systemd-detect-virt || true)" = none
 test -z "$(docker ps -q)"
 mkdir -p "$1" "$2"
 test ! -e "$1/$3"
 mkdir "$1/$3"
 exec 9>"$2/dx-bm1-day.lock"
 flock -n 9
 test -z "$(docker ps -q)"
 git -c credential.helper= clone --no-checkout "$4" "$1/$3/source"
 git -C "$1/$3/source" checkout --detach "$5"
 test "$(git -C "$1/$3/source" rev-parse HEAD)" = "$5"
 cd "$1/$3/source"
 bash lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare "$5" "$1/$3/build"
 test "$(cat "$1/$3/build/results/bootstrap.exit")" = 0
 flock -u 9
 exec "$1/$3/build/tools/bin/node" --no-warnings --experimental-transform-types "$1/$3/build/repository/lab/experiments/EXP-DX1/thin1/queue-bench.ts" --launch "$3" "$6" "$1/$3/build" --int1 "--row-wire=$7"`;
  const seconds = Math.floor((Date.parse(cutoff) - Date.now()) / 1000);
  const remote = [
    "sudo",
    "-n",
    "systemd-run",
    "--no-block",
    "--unit=triplex-int1-prepare-" + tag,
    "--property=KillMode=control-group",
    "--property=RuntimeMaxSec=" + seconds,
    "--setenv=DOCKER_HOST=unix:///var/run/docker.sock",
    "--setenv=GIT_CONFIG_GLOBAL=/dev/null",
    "--setenv=GIT_CONFIG_NOSYSTEM=1",
    "--setenv=GIT_TERMINAL_PROMPT=0",
    "sh",
    "-c",
    body,
    "prepare",
    root,
    queue,
    tag,
    url,
    sha,
    cutoff,
    wire,
  ];
  const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
  execFileSync(
    "ssh",
    [
      "-n",
      "-F",
      "/dev/null",
      "-i",
      key,
      "-o",
      "BatchMode=yes",
      "-o",
      "IdentitiesOnly=yes",
      "-o",
      "ForwardAgent=no",
      "-o",
      "StrictHostKeyChecking=yes",
      "-o",
      "ConnectTimeout=8",
      destination,
      remote.map(quote).join(" "),
    ],
    { stdio: ["ignore", "inherit", "inherit"], timeout: 30000 },
  );
  console.log("Evidence " + root + "/" + tag + "/build/state/evidence/DX-INT1/" + tag);
}
