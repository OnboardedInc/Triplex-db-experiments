import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { validateComparison } from "./field/bench-check.ts";
const study =
  process.argv[2] === "--pulse"
    ? "pulse"
    : process.argv[2] === "--field-rates"
      ? "rates"
      : undefined;
const grouped = process.argv[2] === "--group";
const batch = process.argv[grouped || study ? 3 : 2];
if (batch === "--plan") {
  console.log(
    study
      ? study === "pulse"
        ? "Four timed minutes. Each of two freshly seeded pooled arms runs 600 quiet saves alone and another 600 with nine live neighbors at depth 12."
        : "Ten 10k deep accounts in one scope. Match 3.5, 4.9, 23.5 and 39.4 saves/s with individual, subject-only and all-ready writes, matched alone controls and nine-neighbor windows."
      : grouped
        ? "Two fresh native SQL arms seed ten accounts of 10,000 deep subjects in one database. Measure the quiet account alone, with one or nine bursting neighbors, and with all ten bursting. Compare durable command rate, per-account latency and the quiet-account p99 ratio."
        : "Two fresh 100,000-subject populations. Each runs individual/zero, range/zero, range/reader, individual/reader, with its own matched zero baseline. Thin uses the BM1 900-second prefix and deep uses the full SCALE1 schedule. Eight bounded native arms. SQL reads/commit, native apply and scheduled-offer-to-ACK p50/p99 are sealed in comparison.json.",
  );
  process.exit(0);
}
assert(
  batch &&
    /^[a-z][a-z0-9]{2,14}$/.test(batch) &&
    (!grouped || batch.startsWith("grp")) &&
    (!study || batch.startsWith(study === "pulse" ? "pulse" : "fld")),
  "supply a fresh batch name, or --plan",
);
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
node lab/bin/heavy.mjs --label DX-W1-native -- node --experimental-strip-types ${study ? "lab/experiments/EXP-DX1/w1/field/server.ts run" : grouped ? "lab/experiments/EXP-DX1/w1/group/server.ts run" : "lab/experiments/EXP-DX1/w1/bench.ts"} "$dir" "$sha" "$batch"${study ? " " + study : ""}
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
  const collected = JSON.parse(bytes);
  const { arms: rows, pairs } = collected;
  if (study) {
    validateComparison(collected, study, source, batch);
    const expected = createHash("sha256")
      .update(fs.readFileSync(path.join(import.meta.dirname, "field/predictions.json")))
      .digest("hex");
    assert.equal(collected.predictionSha256, expected);
    for (const [i, row] of rows.entries()) {
      const armDir = dir + "/results/arm-" + (i + 1);
      assert.deepEqual(JSON.parse(sudo("cat", armDir + "/identity.json")), row.arm);
      assert.deepEqual(JSON.parse(sudo("cat", armDir + "/cleanup.json")), {
        containers: [],
        volumes: [],
        networks: [],
      });
      for (const [name, hash] of [
        ["raw.json", row.rawSha256],
        ["seed-readback.json", row.seedReadbackSha256],
      ])
        assert.equal(sudo("sha256sum", armDir + "/" + name).split(/\s/)[0], hash);
    }
  } else if (grouped) {
    assert.equal(collected.kind, "group-commit");
    assert.equal(collected.source, source);
    assert.deepEqual(
      rows.map((r: any) => r.grouped),
      [false, true],
    );
    assert(
      rows.every(
        (r: any) =>
          r.seed === "2720380f5b5e6f31fd632380e6ef6d16acc4d646735962d2cb908e0ab40e1146" &&
          r.seeds.length === 10 &&
          r.phases.length === 4 &&
          r.phases.every((p: any) => p.count > 0 && p.quietP99Ratio > 0),
      ),
    );
    for (const [index, row] of rows.entries()) {
      const armDir = dir + "/results/arm-" + (index + 1);
      assert.equal(row.arm.slot, "tx2-dxscale1-w1-" + batch + "-" + (index + 1));
      assert.deepEqual(JSON.parse(sudo("cat", armDir + "/identity.json")), row.arm);
      assert.deepEqual(JSON.parse(sudo("cat", armDir + "/cleanup.json")), {
        containers: [],
        volumes: [],
        networks: [],
      });
      assert.equal(JSON.parse(row.scope)[3], row.arm.nonce + "-load");
      assert.equal(row.db, "s2-" + Buffer.from(row.scope).toString("base64url"));
      for (const [name, hash] of [
        ["raw.json", row.rawSha256],
        ["seed-readback.json", row.seedReadbackSha256],
      ]) {
        assert.match(hash, /^[a-f0-9]{64}$/);
        assert.equal(sudo("sha256sum", armDir + "/" + name).split(/\s/)[0], hash);
      }
      const alone = row.phases[0].quietMs.p99;
      assert.deepEqual(
        row.phases.map((p: any) => p.name),
        ["alone", "one", "nine", "all"],
      );
      for (const phase of row.phases) {
        assert.equal(phase.quietP99Ratio, phase.quietMs.p99 / alone);
        assert.equal(phase.throughput, (phase.count * 1000) / phase.wall);
        assert.equal(
          Object.values(phase.byAccount).reduce<number>((n, a: any) => n + a.count, 0),
          phase.count,
        );
      }
    }
  } else {
    assert.equal(pairs.length, 4);
    assert.equal(rows.length, 8);
  }
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
