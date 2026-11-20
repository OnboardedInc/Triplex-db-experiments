import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { catalog } from "./catalog.ts";
import { updateReport } from "./owner-report.ts";
import { fileHash } from "./measurements.ts";
import { activeUnitArgs, summaryFiles } from "./source.ts";

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
const checkedRevision = (s: string) => {
  assert.match(s, /^[a-f0-9]{40}$/);
  return s;
};
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
  const now = new Date();
  const cost = (((now.getTime() - Date.parse("2026-11-19T18:30:00Z")) / 3600000) * 1.09).toFixed(2);
  const updated = old.replace(
    /Server 2 accrued about USD \d+\.\d{2} through [\d-]+ [\d:]+ UTC/,
    "Server 2 accrued about USD " +
      cost +
      " through " +
      now.toISOString().slice(0, 16).replace("T", " ") +
      " UTC",
  );
  fs.writeFileSync(
    file,
    updated.replace(
      expression,
      `<!-- state -->\n${new Date().toISOString()} · ${line}\n<!-- end state -->`,
    ),
  );
}
function state() {
  const script =
    'date -u; systemctl list-units --all --no-pager "triplex-scale1-*"; test ! -d "$1" || find "$1" -mindepth 2 -maxdepth 2 -name STATUS.json -print -exec cat {} \\;';
  return sudo(
    "sh",
    "-c",
    script +
      '; for f in "$1"/queues/*/state.json "$1"/decision/state.json "$1"/decision/attempts/*/STATUS.json; do test ! -f "$f" || cat "$f"; done',
    "state",
    root,
  );
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
  const assignment = JSON.parse(sudo("cat", root + "/platform/dedicated.json"));
  assert(
    assignment.role === "DX-SCALE1" &&
      assignment.machineIdSha256 === sudo("sha256sum", "/etc/machine-id").split(/\s/)[0],
  );
  assert.equal(
    remote(
      "systemctl",
      ...activeUnitArgs,
      "triplex-scale1-prepare-*.service",
      "triplex-scale1-arm-*.service",
    ),
    "",
  );
  assert.equal(sudo("env", "DOCKER_HOST=unix:///var/run/docker.sock", "docker", "ps", "-q"), "");
}
async function collect(tag: string) {
  const base = root + (tag.startsWith("arm-d7-") ? "/decision/attempts/" : "/") + tag;
  const entry = JSON.parse(sudo("cat", base + "/transfer.json"));
  assert.equal(entry.tag, tag);
  assert.match(entry.source, /^[a-f0-9]{40}$/);
  assert.match(entry.nonce, /^[a-f0-9-]{36}$/);
  const evidence =
      process.env.TRIPLEX_TRACE_EVIDENCE ??
      path.join(os.homedir(), "Claude", "Projects", "triplex-db-2", "evidence"),
    dir = path.join(evidence, "DX-SCALE1", tag);
  fs.mkdirSync(dir, { recursive: true });
  const remoteAttempt = JSON.parse(sudo("cat", base + "/attempt.json"));
  assert(
    remoteAttempt.tag === tag &&
      remoteAttempt.source === entry.source &&
      remoteAttempt.nonce === entry.nonce,
  );
  const priorBytes = fs.readdirSync(path.dirname(dir)).reduce((total, other) => {
    const otherDir = path.join(path.dirname(dir), other),
      identity = path.join(otherDir, "summaries/attempt.json");
    if (
      other === tag ||
      !fs.existsSync(identity) ||
      JSON.parse(fs.readFileSync(identity, "utf8")).item !== remoteAttempt.item
    )
      return total;
    return (
      total +
      fs.statSync(path.join(otherDir, "summaries.tar.zst")).size +
      fs.statSync(path.join(otherDir, "transfer.json")).size +
      fs
        .readdirSync(path.dirname(identity), { recursive: true, encoding: "utf8" })
        .reduce((sum, f) => {
          const stat = fs.lstatSync(path.join(path.dirname(identity), f));
          return sum + (stat.isFile() ? stat.size : 0);
        }, 0)
    );
  }, 0);
  // [DX-SCALE1] Why: the Mac's 500 MiB transfer budget covers all attempts and arms of this item. Rejected: downloading a raw archive when its compressed size happens to fit.
  const unpacked = Number(sudo("du", "-sb", "--", base + "/transfer").split(/\s/)[0]);
  assert(Number.isSafeInteger(unpacked) && unpacked > 0);
  assert(
    priorBytes +
      entry.summary.bytes +
      unpacked +
      Buffer.byteLength(JSON.stringify(entry, null, 2)) <
      500 * 1024 ** 2,
    "Item summary transfers would exceed 500 MiB",
  );
  const transfer = async (spec: { name: string; bytes: number; sha256: string }) => {
    assert(
      spec.name === "summaries.tar.zst" &&
        Number.isSafeInteger(spec.bytes) &&
        spec.bytes > 0 &&
        /^[a-f0-9]{64}$/.test(spec.sha256),
    );
    const local = path.join(dir, spec.name);
    if (!fs.existsSync(local)) {
      const stat = fs.statfsSync(dir);
      // [DX-SCALE1] Why: small terminal summaries must remain collectible as other Mac jobs consume disk. Rejected: applying the raw-archive headroom to the compact evidence needed to diagnose a failed arm.
      const headroom = Math.max(64 * 1024 ** 2, 6 * spec.bytes);
      assert(stat.bavail * stat.bsize > spec.bytes + headroom);
      const tmp = local + `.${process.pid}.partial`;
      const fd = fs.openSync(tmp, "wx");
      const child = spawn(
        "ssh",
        [...ssh, ["sudo", "-n", "cat", `${base}/${spec.name}`].map(q).join(" ")],
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
    const copy = fs.existsSync(path.join(dir, entry.raw.name));
    fs.writeFileSync(
      path.join(dir, "raw-location.json"),
      JSON.stringify({
        source: entry.source,
        nonce: entry.nonce,
        serverTag: tag,
        archive: entry.raw,
        copyOnMac: copy,
        reason: copy
          ? "retained from an earlier collection"
          : "compressed raw archive retained on the assigned server",
      }) + "\n",
    );
  }
  fs.writeFileSync(path.join(dir, "transfer.json"), JSON.stringify(entry, null, 2) + "\n");
  await catalog(evidence, dir, terminal, entry, repo);
  // [DX-SCALE1] Why: a public, per-attempt manifest identifies the durable summary archive and the manifest of raw bytes even if the large raw archive stays on the bench. Rejected: committing raw traces or relying on an editable index entry alone.
  const proofDir = path.join(repo, "lab/experiments/EXP-DX1/scale1/evidence");
  fs.mkdirSync(proofDir, { recursive: true });
  const proof = path.join(proofDir, tag + ".sha256");
  const manifest = [entry.summary.name, "transfer.json"].map((name) => ({
    name,
    filepath: path.join(dir, name),
  }));
  const bytes =
    (
      await Promise.all(
        manifest.map(async (f) => (await fileHash(f.filepath)) + "  " + tag + "/" + f.name),
      )
    ).join("\n") + "\n";
  if (fs.existsSync(proof)) assert.equal(fs.readFileSync(proof, "utf8"), bytes);
  else fs.writeFileSync(proof, bytes, { flag: "wx" });
  updateReport(path.join(evidence, "DX-SCALE1"));
  const live = remote("systemctl", ...activeUnitArgs, "triplex-scale1-arm-*.service");
  const current = /triplex-scale1-(arm-[a-z0-9-]+)\.service/.exec(live)?.[1];
  let activity = "";
  if (current && current !== tag) {
    const currentBase = root + (current.startsWith("arm-d7-") ? "/decision/attempts/" : "/");
    const next = JSON.parse(sudo("cat", currentBase + tags(current) + "/attempt.json"));
    assert(
      next.tag === current && Number.isSafeInteger(next.at) && Number.isSafeInteger(next.ceiling),
    );
    activity =
      " " +
      current +
      " started at " +
      new Date(next.at).toISOString() +
      " with execution ceiling " +
      new Date(next.at + next.ceiling * 1000).toISOString() +
      ".";
  }
  updateHandoff(
    "Collected " +
      tag +
      " with service result " +
      terminal.service +
      ", " +
      terminal.scopeReports +
      " physical-scope report(s) and verified cleanup." +
      activity,
  );
  console.log(dir);
}
function campaign(label: string) {
  const { sha } = source(),
    dir = root + "/queues/" + label;
  const plan = JSON.parse(sudo("cat", dir + "/plan.json"));
  assert(plan.label === label && plan.steps.length);
  const units = remote(
    "systemctl",
    ...activeUnitArgs,
    "triplex-scale1-queue-" + label + "*.service",
  );
  if (units) {
    console.log(state());
    return;
  }
  const tool = root + "/build-" + plan.steps[0].source + "/tools/bin/node",
    op = root + "/controller-" + sha;
  const install =
    'set -eu; if ! test -d "$1"; then git -c credential.helper= clone --no-checkout "$2" "$1"; git -C "$1" checkout --detach "$3"; fi; test "$(git -C "$1" rev-parse HEAD)" = "$3"; if ! test -e "$1/node_modules"; then ln -s "$4" "$1/node_modules"; fi';
  sudo(
    "env",
    "GIT_TERMINAL_PROMPT=0",
    "GIT_CONFIG_GLOBAL=/dev/null",
    "GIT_CONFIG_NOSYSTEM=1",
    "sh",
    "-c",
    install,
    "stage",
    op,
    "https://github.com/OnboardedInc/Triplex-db-experiments.git",
    sha,
    root + "/build-" + plan.steps[0].source + "/repository/node_modules",
  );
  console.log(
    sudo(
      "systemd-run",
      "--no-block",
      "--unit=triplex-scale1-queue-" + label + "-" + sha.slice(0, 9),
      "--property=Nice=15",
      "--property=KillMode=control-group",
      tool,
      "--experimental-strip-types",
      op + "/lab/experiments/EXP-DX1/scale1/remote-sequence.ts",
      label,
    ),
  );
}
if (action === "status") console.log(state());
else if (action === "campaign") await campaign(tags(args[0]));
else if (action === "collect") await collect(tags(args[0]));
else if (action === "prepare") {
  const { sha, url } = source();
  released();
  const src = `${root}/source-${sha}`,
    build = `${root}/build-${sha}`;
  // [DX-SCALE1] Why: the bench obtains every source byte by anonymous HTTPS on the assigned machine. Rejected: copying local source, caches, SSH configuration or credentials to the bench.
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
      ...(process.env.DX_SCALE1_BUILD_CACHE
        ? [
            "--setenv=DX_NATIVE_BOOTSTRAP_CACHE=" +
              root +
              "/build-" +
              checkedRevision(process.env.DX_SCALE1_BUILD_CACHE),
          ]
        : []),
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
    /^[1-5]$/.test(args[0] ?? "") &&
      ["zero", "reader", "activation", "seed", "interference", "small"].includes(args[2] ?? ""),
  );
  for (let i = 0; i < opts.length; i += 2) {
    if (opts[i] === "--account-layout") assert(["pooled", "separate"].includes(opts[i + 1]!));
    else {
      assert(["--sizing", "--baseline", "--seed-image"].includes(opts[i]!));
      tags(opts[i + 1]);
    }
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
