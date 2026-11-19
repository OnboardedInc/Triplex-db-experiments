import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const program = "lab/experiments/EXP-DX1/import1/server.ts",
  lab = "/var/tmp/triplex-import1";
const [op = "--plan", given] = process.argv.slice(2);
const git = (...a: string[]) => execFileSync("git", a, { encoding: "utf8" }).trim();
const branch = "exp/DX-ACT1-activation",
  tag = given ?? "import-" + randomUUID().slice(0, 12);
assert(/^import-[a-z0-9-]{3,48}$/.test(tag));
const dir = lab + "/" + tag;
if (op === "--plan") {
  console.log(
    JSON.stringify(
      {
        command:
          "node --experimental-strip-types lab/experiments/EXP-DX1/import1/control.ts --campaign",
        environment: ["BENCH_SERVER", "DX_BENCH_KEY"],
        stages: [
          "native oracle, history price and queue collision",
          "four operating points at four million facts each",
          "100000 deep subjects",
          "4500000 thin subjects",
        ],
        neighbors: 9,
        livePeoplePerScope: 10000,
        readers: 256,
        trace: "aa8a7636ff027ab3",
        targets: { factsPerSecond: 3000, neighborReadAndCommitP99: 1.5 },
        sourceBranch: branch,
      },
      null,
      2,
    ),
  );
} else {
  assert(op === "--campaign" || op === "--collect");
  const dest = process.env.BENCH_SERVER,
    key = process.env.DX_BENCH_KEY;
  assert(dest && /^[a-z0-9_-]+@[a-zA-Z0-9.-]+$/.test(dest) && key && existsSync(key));
  const quote = (x: string) => "'" + x.replaceAll("'", "'\\''") + "'";
  const ssh = [
    "-n",
    "-F",
    "/dev/null",
    "-i",
    key,
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
    dest,
  ];
  const remote = (...args: string[]) =>
    execFileSync("ssh", [...ssh, args.map(quote).join(" ")], {
      encoding: "utf8",
      timeout: 120000,
      maxBuffer: 32 << 20,
    }).trim();
  const sudo = (...args: string[]) => remote("sudo", "-n", ...args);
  const source = git("rev-parse", "HEAD"),
    url = git("remote", "get-url", "origin"),
    u = new URL(url);
  assert.equal(u.protocol, "https:");
  assert(!u.username && !u.password && !u.search && !u.hash);
  assert.equal(git("branch", "--show-current"), branch);
  assert.equal(git("status", "--porcelain"), "");
  if (op === "--campaign") {
    assert.equal(git("ls-remote", "origin", "refs/heads/" + branch).split(/\s/)[0], source);
    assert.equal(sudo("sh", "-c", "systemd-detect-virt || true"), "none");
    const boot =
      'set -eu; umask 077; test -d "$1"; test ! -e "$1/source"; git -c credential.helper= clone --no-checkout "$3" "$1/source"; git -C "$1/source" checkout --detach "$2"; test "$(git -C "$1/source" rev-parse HEAD)" = "$2"; cd "$1/source"; bash lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare "$2" "$1/build"; cd "$1/build/repository"; exec "$1/build/tools/bin/node" --experimental-strip-types "$4" --execute "$1" "$2"';
    // [DX-ACT1] Why: anonymous clone at the pushed revision, bounded systemd group, and an independent stop hook follow the scale controller. Rejected: shipping a local build or touching an existing bench stack.
    const unit = "triplex-bm1-" + tag;
    const stop =
      "/bin/sh -c " +
      quote(
        "test ! -f " +
          dir +
          "/active.json || exec " +
          dir +
          "/build/tools/bin/node --experimental-strip-types " +
          dir +
          "/build/repository/" +
          program +
          " --cleanup " +
          dir +
          " " +
          source,
      );
    sudo("mkdir", "-p", lab, "/var/tmp/triplex-bm1");
    sudo("mkdir", "-m", "0700", dir);
    sudo(
      "systemd-run",
      "--no-block",
      "--unit=" + unit,
      "--property=KillMode=control-group",
      "--property=RuntimeMaxSec=172800s",
      "--property=TimeoutStopSec=180s",
      "--property=ExecStopPost=" + stop,
      "--setenv=GIT_TERMINAL_PROMPT=0",
      "--setenv=GIT_CONFIG_GLOBAL=/dev/null",
      "--setenv=GIT_CONFIG_NOSYSTEM=1",
      "/usr/bin/flock",
      "-n",
      "/var/tmp/triplex-bm1/dx-bm1-day.lock",
      "/bin/bash",
      "-c",
      boot,
      "import",
      dir,
      source,
      url,
      program,
    );
    console.log("Submitted " + tag + " at " + source);
    for (;;) {
      await delay(45000);
      const state = sudo("systemctl", "show", unit, "-p", "ActiveState", "--value");
      if (state === "failed") throw Error("Bench service failed. Retained attempt " + tag);
      if (state === "inactive") break;
    }
  }
  const raw = sudo("cat", dir + "/terminal.json"),
    bytes = Buffer.from(raw + "\n");
  const receipt = JSON.parse(raw);
  assert.equal(receipt.source, source);
  assert.equal(receipt.tag, tag);
  assert.equal(receipt.cleanup, true);
  assert(receipt.stages.length === 7);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    sudo("sha256sum", dir + "/terminal.json").split(/\s/)[0],
  );
  const local = resolve(process.env.DX_IMPORT_COLLECTION ?? "runs/import-collections", tag);
  mkdirSync(local, { recursive: true });
  const file = join(local, "terminal.json");
  if (existsSync(file)) assert(readFileSync(file).equals(bytes));
  else writeFileSync(file, bytes, { flag: "wx" });
  console.log(file);
}
