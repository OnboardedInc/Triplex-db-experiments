import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const batch = process.argv[2];
if (batch === "--plan") {
  console.log(
    "Two fresh 100,000-subject populations. Each runs individual/zero, range/zero, range/reader, individual/reader, with its own matched zero baseline. Thin uses the BM1 900-second prefix and deep uses the full SCALE1 schedule. Eight bounded native arms. SQL reads/commit, native apply and scheduled-offer-to-ACK p50/p99 are sealed in comparison.json.",
  );
  process.exit(0);
}
assert(batch && /^[a-z][a-z0-9]{2,14}$/.test(batch), "supply a fresh batch name, or --plan");
const dest = process.env.BENCH_SERVER,
  root = "/var/tmp/triplex-w1",
  dir = root + "/" + batch;
assert(
  dest && /^[a-z0-9_]+@[a-zA-Z0-9.-]+$/.test(dest),
  "set BENCH_SERVER to the assigned machine",
);
const repo = path.resolve(import.meta.dirname, "../../../..");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
const branch = "exp/DX-W1-commit-tail-reads",
  source = git("rev-parse", "HEAD"),
  url = new URL(git("remote", "get-url", "origin"));
assert.equal(git("branch", "--show-current"), branch);
assert.match(source, /^[0-9a-f]{40}$/);
assert.equal(git("status", "--porcelain"), "");
assert(
  url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.hash &&
    !url.search &&
    url.pathname === "/OnboardedInc/Triplex-db-experiments.git",
);
const ref = execFileSync(
  "git",
  ["-c", "credential.helper=", "ls-remote", url.href, "refs/heads/" + branch],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_TERMINAL_PROMPT: "0",
    },
  },
);
assert.equal(ref.trim().split(/\s+/)[0], source, "Publish the tested W1 head first");
const q = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
const ssh = [
  "-n",
  "-F",
  "/dev/null",
  "-i",
  process.env.DX_BENCH_KEY ?? path.join(os.homedir(), ".ssh", "triplex_bench_ed25519"),
  "-o",
  "IdentitiesOnly=yes",
  "-o",
  "ForwardAgent=no",
  "-o",
  "StrictHostKeyChecking=yes",
  "-o",
  "BatchMode=yes",
  "-o",
  "ConnectTimeout=8",
  dest,
];
const remote = (...args: string[]) =>
  execFileSync("ssh", [...ssh, args.map(q).join(" ")], {
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 16 * 1024 ** 2,
  });
const sudo = (...args: string[]) => remote("sudo", "-n", ...args);
const machine = remote("sha256sum", "/etc/machine-id").split(/\s/)[0]!;
assert.match(machine, /^[a-f0-9]{64}$/);
if (process.env.DX_W1_MACHINE_SHA256) assert.equal(machine, process.env.DX_W1_MACHINE_SHA256);
const unit = "triplex-w1-" + batch;
// [DX-W1] Why: the assigned physical host builds an anonymous checkout and owns the timeout, source and terminal files.
// Rejected: transferring local sources or private connection details to the bench, or borrowing a resident database.
const execute = `set -euo pipefail
umask 077
dir=$1; sha=$2; batch=$3; url=$4; machine=$5
finish() {
  rc=$?; trap - EXIT
  if test -f "$dir/active-slot"; then bash "$dir/bootstrap/lab/experiments/EXP-DX1/w1/release.sh" "$dir" || rc=1; fi
  echo "$rc $sha $machine" > "$dir/terminal.tmp"; mv "$dir/terminal.tmp" "$dir/terminal"
  exit "$rc"
}
trap finish EXIT
exec > "$dir/campaign.log" 2>&1
test "$(sha256sum /etc/machine-id | cut -d' ' -f1)" = "$machine"
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 DOCKER_HOST=unix:///var/run/docker.sock
git -c credential.helper= clone --no-checkout "$url" "$dir/bootstrap"
git -C "$dir/bootstrap" checkout --detach "$sha"
test "$(git -C "$dir/bootstrap" rev-parse HEAD)" = "$sha"
bash "$dir/bootstrap/lab/experiments/EXP-DX1/t1/bare-metal.sh" --prepare "$sha" "$dir/build"
export PATH="$dir/build/tools/bin:$PATH"
cd "$dir/build/repository"
node lab/bin/heavy.mjs --label DX-W1-native -- node --experimental-strip-types lab/experiments/EXP-DX1/w1/bench.ts "$dir" "$sha" "$batch"
sha256sum "$dir/results/comparison.json" > "$dir/comparison.sha256"`;
const launch = `set -euo pipefail
root=$1; dir=$2; sha=$3; batch=$4; unit=$5; url=$6; machine=$7; script=$8
umask 077
test "$(uname -s)" = Linux
if systemd-detect-virt --quiet; then exit 2; fi
export DOCKER_HOST=unix:///var/run/docker.sock
mkdir -p "$root"
exec 9>"$root/launch.lock"; flock -n 9
if test -e "$dir"; then
  test "$(cat "$dir/source")" = "$sha" && test "$(cat "$dir/machine")" = "$machine"
  test -f "$dir/terminal" || systemctl show -p ActiveState --value "$unit" | grep -Eq '^(activating|active|deactivating)$'
  exit
fi
test -z "$(systemctl list-units --state=activating,active,deactivating --no-legend 'triplex-*.service')"
test -z "$(docker ps -q)"
mkdir "$dir"; echo "$sha" > "$dir/source"; echo "$machine" > "$dir/machine"
systemd-run --no-block --unit="$unit" --property=RuntimeMaxSec=72h --property=KillMode=control-group --property=TimeoutStopSec=180s "--property=ExecStopPost=/usr/bin/bash $dir/bootstrap/lab/experiments/EXP-DX1/w1/release.sh $dir" flock -n "$root/exclusive.lock" bash -c "$script" campaign "$dir" "$sha" "$batch" "$url" "$machine"`;
sudo("bash", "-c", launch, "launch", root, dir, source, batch, unit, url.href, machine, execute);
console.log("Submitted or resumed", unit, "at", source);
const local = path.join(
  process.env.TRIPLEX_TRACE_EVIDENCE ??
    path.join(os.homedir(), "Claude", "Projects", "triplex-db-2", "evidence"),
  "DX-W1",
  batch,
);
fs.mkdirSync(local, { recursive: true });
const poll =
  'if test -f "$1/terminal"; then cat "$1/terminal"; elif systemctl show -p ActiveState --value "$2" | grep -Eq "^(activating|active|deactivating)$"; then echo active; else echo interrupted; fi';
for (;;) {
  const state = sudo("bash", "-c", poll, "poll", dir, unit).trim();
  if (state === "active") {
    await sleep(30000);
    continue;
  }
  assert.equal(
    state,
    "0 " + source + " " + machine,
    `Incomplete campaign (${state}). Inspect ${dir}/campaign.log and per-arm evidence on the assigned bench.`,
  );
  const hash = sudo("cat", dir + "/comparison.sha256").split(/\s/)[0];
  const bytes = sudo("cat", dir + "/results/comparison.json");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), hash);
  const { arms: rows, pairs } = JSON.parse(bytes);
  assert.equal(pairs.length, 4);
  assert.equal(rows.length, 8);
  assert(
    rows.every(
      (r: any) =>
        r.arm.source === source && r.arm.slot.startsWith("tx2-dxscale1-w1-" + batch + "-"),
    ),
  );
  const file = path.join(local, "comparison.json");
  if (fs.existsSync(file)) assert.equal(fs.readFileSync(file, "utf8"), bytes);
  else fs.writeFileSync(file, bytes, { flag: "wx" });
  console.log("Collected", file, "sha256", hash, "; raw evidence", dir + "/results");
  break;
}
