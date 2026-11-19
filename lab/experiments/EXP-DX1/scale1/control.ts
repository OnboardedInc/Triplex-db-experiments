import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { catalog } from "./catalog.ts";
import { updateReport } from "./owner-report.ts";
import { fileHash } from "./measurements.ts";
import { activeUnitArgs, bm1Released, priorUnits, summaryFiles } from "./source.ts";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.."),
  root = "/var/tmp/triplex-scale1",
  program = "lab/experiments/EXP-DX1/scale1/bench.ts";
const q = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
const dest = process.env.BENCH_SERVER,
  key = process.env.DX_BENCH_KEY ?? path.join(os.homedir(), ".ssh", "triplex_bench_ed25519");
assert(
  dest && /^[a-z0-9_]+@[a-zA-Z0-9.-]+$/.test(dest),
  "Set BENCH_SERVER to the destination provided in the brief",
);
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
  "ConnectTimeout=8",
  dest,
];
const remote = (...args: string[]) =>
  execFileSync("ssh", [...ssh, args.map(q).join(" ")], {
    encoding: "utf8",
    timeout: 120000,
  }).trim();
const sudo = (...args: string[]) => remote("sudo", "-n", ...args);
const tags = (tag: string | undefined): string => {
  assert(tag && /^[a-z][a-z0-9-]{2,40}$/.test(tag));
  return tag;
};
const [action, ...args] = process.argv.slice(2);
function updateHandoff(line: string) {
  const file = path.join(repo, "lab/experiments/EXP-DX1/scale1/HANDOFF.md"),
    old = fs.readFileSync(file, "utf8"),
    expression = /<!-- state -->[\s\S]*?<!-- end state -->/;
  assert(expression.test(old));
  fs.writeFileSync(
    file,
    old.replace(
      expression,
      `<!-- state -->\n${new Date().toISOString()} · ${line}\n<!-- end state -->`,
    ),
  );
}
function state() {
  const script =
    'date -u; systemctl list-units --all --no-pager "triplex-drv1-*" "triplex-bm1-*"; test ! -f /var/tmp/triplex-bm1/STATUS || cat /var/tmp/triplex-bm1/STATUS; systemctl list-units --all --no-pager "triplex-scale1-*"; test ! -d "$1" || find "$1" -mindepth 2 -maxdepth 2 -name STATUS.json -print -exec cat {} \\;';
  return sudo("sh", "-c", script, "state", root);
}
function source() {
  git("fetch", "origin", "refs/heads/exp/DX-BM1-bare-metal");
  const base = git("rev-parse", "FETCH_HEAD"),
    head = git("rev-parse", "HEAD"),
    sha = process.env.DX_SCALE1_SOURCE ?? head;
  assert.match(sha, /^[a-f0-9]{40}$/);
  git("merge-base", "--is-ancestor", sha, head);
  git(
    "diff",
    "--quiet",
    sha,
    head,
    "--",
    ".",
    ":(exclude)lab/experiments/EXP-DX1/scale1/REPORT.md",
    ":(exclude)lab/experiments/EXP-DX1/scale1/HANDOFF.md",
    ":(exclude)lab/experiments/EXP-DX1/scale1/SHA256SUMS",
  );
  git("merge-base", "--is-ancestor", base, sha);
  const changed = git(
    "status",
    "--porcelain",
    "--",
    ".",
    ":(exclude)lab/experiments/EXP-DX1/scale1/REPORT.md",
    ":(exclude)lab/experiments/EXP-DX1/scale1/HANDOFF.md",
  );
  assert.equal(changed, "", "Publish and test executable changes before launching");
  const url = git("remote", "get-url", "origin"),
    u = new URL(url);
  assert.equal(u.protocol, "https:");
  assert(!u.username && !u.password && !u.search && !u.hash);
  assert.equal(u.pathname, "/OnboardedInc/Triplex-db-experiments.git");
  const branch = git("branch", "--show-current");
  assert.equal(branch, "exp/DX-SCALE1-deep-accounts");
  const publicRef = execFileSync(
    "git",
    ["-c", "credential.helper=", "ls-remote", url, `refs/heads/${branch}`],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
      },
    },
  ).trim();
  assert.equal(
    publicRef.split(/\s/)[0],
    head,
    "The tested source is not published at the experiment ref",
  );
  return { sha, url, base };
}
function released() {
  const s = sudo("cat", "/var/tmp/triplex-bm1/STATUS");
  assert(bm1Released(s), "BM1 has not published its timestamped FREE handoff");
  assert.equal(remote("systemctl", ...activeUnitArgs, ...priorUnits), "");
  assert.equal(sudo("env", "DOCKER_HOST=unix:///var/run/docker.sock", "docker", "ps", "-q"), "");
}
async function collect(tag: string) {
  const entry = JSON.parse(sudo("cat", `${root}/${tag}/transfer.json`));
  assert.equal(entry.tag, tag);
  assert.match(entry.source, /^[a-f0-9]{40}$/);
  assert.match(entry.nonce, /^[a-f0-9-]{36}$/);
  const evidence =
      process.env.TRIPLEX_TRACE_EVIDENCE ??
      path.join(os.homedir(), "Claude", "Projects", "triplex-db-2", "evidence"),
    dir = path.join(evidence, "DX-SCALE1", tag);
  fs.mkdirSync(dir, { recursive: true });
  const transfer = async (spec: { name: string; bytes: number; sha256: string }) => {
    assert(
      ["summaries.tar.zst", "raw.tar.zst"].includes(spec.name) &&
        Number.isSafeInteger(spec.bytes) &&
        spec.bytes > 0 &&
        /^[a-f0-9]{64}$/.test(spec.sha256),
    );
    const local = path.join(dir, spec.name);
    if (!fs.existsSync(local)) {
      const stat = fs.statfsSync(dir);
      assert(stat.bavail * stat.bsize > spec.bytes + 5 * 1024 ** 3);
      const tmp = local + `.${process.pid}.partial`;
      const fd = fs.openSync(tmp, "wx");
      const child = spawn(
        "ssh",
        [...ssh, ["sudo", "-n", "cat", `${root}/${tag}/${spec.name}`].map(q).join(" ")],
        { stdio: ["ignore", fd, "inherit"] },
      );
      fs.closeSync(fd);
      const code = await new Promise<number | null>((resolve, reject) => {
        child.once("error", reject);
        child.once("close", resolve);
      });
      assert.equal(code, 0);
      assert.equal(fs.statSync(tmp).size, spec.bytes);
      assert.equal(await fileHash(tmp), spec.sha256);
      fs.renameSync(tmp, local);
    }
    assert.equal(fs.statSync(local).size, spec.bytes);
    assert.equal(await fileHash(local), spec.sha256);
    return local;
  };
  assert.equal(entry.summary.name, "summaries.tar.zst");
  const summary = await transfer(entry.summary),
    files = execFileSync("tar", ["-tf", summary], { encoding: "utf8" }).trim().split("\n");
  assert(files.every((s) => /^\.\/(?:[\w.-]+(?:\/[\w.-]+)?\/?)?$/.test(s) && !s.includes("..")));
  if (!fs.existsSync(path.join(dir, "summaries"))) {
    const stage = fs.mkdtempSync(path.join(dir, "extract-"));
    execFileSync("tar", ["-xf", summary, "-C", stage]);
    fs.renameSync(stage, path.join(dir, "summaries"));
  }
  assert.deepEqual(summaryFiles(path.join(dir, "summaries")), entry.summaryFiles);
  const terminal = JSON.parse(
    fs.readFileSync(path.join(dir, "summaries", "terminal.json"), "utf8"),
  );
  assert.equal(terminal.tag, tag);
  assert.equal(terminal.source, entry.source);
  assert.equal(terminal.nonce, entry.nonce);
  assert.equal(terminal.cleanup, true);
  if (entry.raw) {
    assert.equal(entry.raw.name, "raw.tar.zst");
    if (entry.raw.bytes < 2 * 1024 ** 3) await transfer(entry.raw);
  }
  fs.writeFileSync(path.join(dir, "transfer.json"), JSON.stringify(entry, null, 2) + "\n");
  await catalog(evidence, dir, terminal, entry, repo);
  updateReport(path.join(evidence, "DX-SCALE1"));
  updateHandoff(
    `Collected ${tag}. The service result was ${terminal.service}, with ${terminal.scopeReports} scope reports. The terminal cleanup inventory was empty.`,
  );
  console.log(dir);
}
async function campaign(label: string) {
  const { sha } = source(),
    script = fileURLToPath(import.meta.url),
    build = `${root}/build-${sha}`;
  const invoke = (...args: string[]) =>
    new Promise<number | null>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", script, ...args], {
        cwd: repo,
        stdio: "inherit",
        env: { ...process.env, DX_SCALE1_SOURCE: sha },
      });
      child.once("error", reject);
      child.once("close", resolve);
    });
  const exists = (file: string) =>
    sudo("sh", "-c", 'if test -f "$1"; then echo yes; else echo no; fi', "file", file) === "yes";
  const until = async (predicate: () => boolean, deadline: number, failed?: () => boolean) => {
    while (!predicate()) {
      if (Date.now() >= deadline || failed?.())
        throw Error("A bounded bench stage stopped without terminal evidence");
      await sleep(45000);
    }
  };
  // [DX-SCALE1] Why: poll locally until BM1 publishes terminal ownership and its service drains. Rejected: reserving the remote machine or installing a remote waiter during someone else's window.
  await until(
    () => {
      if (!exists("/var/tmp/triplex-bm1/STATUS")) return false;
      const status = sudo("cat", "/var/tmp/triplex-bm1/STATUS");
      return bm1Released(status) && remote("systemctl", ...activeUnitArgs, ...priorUnits) === "";
    },
    Date.now() + 24 * 3600000,
  );
  const endedWithoutEvidence = (unit: string, since: number) => {
    const status = remote("systemctl", "show", unit, "-p", "ActiveState", "--value");
    return status === "failed" || (status === "inactive" && Date.now() - since > 90_000);
  };
  if (!exists(`${build}/results/bootstrap.exit`)) {
    const submitted = Date.now();
    assert.equal(await invoke("prepare"), 0);
    await until(
      () => exists(`${build}/results/bootstrap.exit`),
      Date.now() + 36 * 60000,
      () => endedWithoutEvidence("triplex-scale1-prepare-" + sha.slice(0, 12), submitted),
    );
  }
  assert.equal(sudo("cat", `${build}/results/bootstrap.exit`), "0");
  await until(
    () =>
      ["inactive", "failed"].includes(
        remote(
          "systemctl",
          "show",
          `triplex-scale1-prepare-${sha.slice(0, 12)}`,
          "-p",
          "ActiveState",
          "--value",
        ),
      ),
    Date.now() + 180000,
  );
  const stage = async (item: number, mode: string, opts: string[]) => {
    const tag = tags(`${label}-${item}-${mode}`),
      base = `${root}/${tag}`;
    if (!exists(`${base}/attempt.json`)) {
      const code = await invoke("launch", String(item), tag, mode, ...opts);
      if (code !== 0 && code !== 75) throw Error(`Stage ${tag} could not launch`);
    }
    const a = JSON.parse(sudo("cat", `${base}/attempt.json`));
    assert(a.source === sha && a.item === item && a.mode === mode);
    await until(
      () => exists(`${base}/transfer.json`),
      a.at + (a.ceiling + 3750) * 1000,
      () => endedWithoutEvidence("triplex-scale1-" + tag, a.at),
    );
    assert.equal(await invoke("collect", tag), 0);
    const terminal = JSON.parse(sudo("cat", `${base}/terminal.json`));
    assert(terminal.cleanup && terminal.nonce === a.nonce && terminal.source === sha);
    await until(
      () =>
        ["inactive", "failed"].includes(
          remote("systemctl", "show", `triplex-scale1-${tag}`, "-p", "ActiveState", "--value"),
        ),
      Date.now() + 180000,
    );
    return { tag, terminal, capacity: a.capacity };
  };
  const singles: Record<number, string> = {};
  for (const item of [1, 2, 3, 4]) {
    const size = item === 4 ? (singles[2] ?? singles[1]) : singles[1],
      opts = size ? ["--sizing", size] : [];
    const zero = await stage(item, "zero", opts);
    if (zero.terminal.service === "capacity-refused") {
      if (zero.capacity.fitsSeed) await stage(item, "seed", opts);
      continue;
    }
    if (item <= 2 && zero.terminal.scopeReports === 1) singles[item] = zero.tag;
    assert(zero.terminal.scopeReports > 0, `Missing zero baseline for item ${item}`);
    const loaded = await stage(item, "reader", [...opts, "--baseline", zero.tag]);
    if (loaded.terminal.service === "capacity-refused") {
      if (loaded.capacity.fitsSeed) await stage(item, "seed", opts);
      continue;
    }
    if (item <= 2 && loaded.terminal.scopeReports === 1) singles[item] = loaded.tag;
    if (item > 1) await stage(item, "activation", opts);
  }
}
if (action === "status") console.log(state());
else if (action === "campaign") await campaign(tags(args[0]));
else if (action === "collect") await collect(tags(args[0]));
else if (action === "prepare") {
  const { sha, url } = source();
  released();
  const src = `${root}/source-${sha}`,
    build = `${root}/build-${sha}`;
  // [DX-SCALE1] Why: the bench obtains every source byte by anonymous HTTPS after the previous controller has released it. Rejected: copying local source, caches, SSH configuration or credentials to the bench.
  const boot =
    'set -eu; test ! -e "$2"; mkdir -p "$1"; git -c credential.helper= clone --no-checkout "$4" "$2"; git -C "$2" checkout --detach "$5"; test "$(git -C "$2" rev-parse HEAD)" = "$5"; cd "$2"; exec bash lab/experiments/EXP-DX1/t1/bare-metal.sh --prepare "$5" "$3"';
  console.log(
    sudo(
      "systemd-run",
      "--no-block",
      `--unit=triplex-scale1-prepare-${sha.slice(0, 12)}`,
      "--property=RuntimeMaxSec=2100s",
      "--property=KillMode=control-group",
      "--setenv=GIT_TERMINAL_PROMPT=0",
      "--setenv=GIT_CONFIG_GLOBAL=/dev/null",
      "--setenv=GIT_CONFIG_NOSYSTEM=1",
      "--setenv=DX_NATIVE_BOOTSTRAP_CACHE=/var/tmp/triplex-bm1/queue-20261118r/scale",
      "sh",
      "-c",
      boot,
      "bootstrap",
      root,
      src,
      build,
      url,
      sha,
    ),
  );
  updateHandoff(`Submitted native preparation for source ${sha}, with a 35-minute ceiling.`);
} else if (action === "launch") {
  const { sha } = source();
  released();
  const build = `${root}/build-${sha}`,
    opts = args.slice(3);
  assert(
    /^[1-4]$/.test(args[0] ?? "") &&
      ["zero", "reader", "activation", "seed"].includes(args[2] ?? ""),
  );
  for (let i = 0; i < opts.length; i += 2) {
    assert(["--sizing", "--baseline"].includes(opts[i]!));
    tags(opts[i + 1]);
  }
  try {
    console.log(
      sudo(
        "env",
        "DOCKER_HOST=unix:///var/run/docker.sock",
        "GIT_CONFIG_NOSYSTEM=1",
        "GIT_CONFIG_GLOBAL=/dev/null",
        "GIT_TERMINAL_PROMPT=0",
        `PATH=${build}/tools/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
        `${build}/tools/bin/node`,
        "--experimental-strip-types",
        `${build}/repository/${program}`,
        "launch",
        args[0]!,
        tags(args[1]),
        args[2]!,
        ...opts,
      ),
    );
  } catch (e: any) {
    if (e.status !== 75) throw e;
    const refusal = JSON.parse(sudo("cat", `${root}/${tags(args[1])}/attempt.json`));
    updateHandoff(
      `Admission refused ${refusal.tag} on ${refusal.capacity.limits.join(" and ")}. The capacity calculation is in its terminal bundle. Measured seed scopes that fit: ${refusal.capacity.seedScopeLimit}.`,
    );
    process.exit(75);
  }
  const attempt = JSON.parse(sudo("cat", `${root}/${tags(args[1])}/attempt.json`));
  updateHandoff(
    `Submitted ${attempt.tag} for item ${attempt.item}, ${attempt.mode}, ${attempt.spec.scopes} scopes of ${attempt.spec.people} people. Its ceiling is ${Math.round(attempt.ceiling / 60)} minutes, source ${attempt.source}.`,
  );
} else
  throw Error(
    "Use status, prepare, launch ITEM TAG ARM [--baseline TAG] [--sizing TAG], or collect TAG",
  );
