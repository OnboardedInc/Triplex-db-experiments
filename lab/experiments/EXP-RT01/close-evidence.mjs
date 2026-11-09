import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { inspect, DOCKER_HOST } from "../../bin/lib.mjs";
const dir = import.meta.dirname;
const root = path.resolve(dir, "../../..");
const evidence = path.join(dir, "evidence");
const write = (name, value) =>
  fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + "\n");
const before = JSON.parse(
  fs.readFileSync(path.join(evidence, "resident-identities-before-probes.json"), "utf8"),
);
const engines = before.engines.map(({ lane, name }) => {
  const c = inspect(name);
  if (!c) throw new Error(`Missing resident ${name}`);
  return {
    lane,
    name,
    id: c.Id,
    image: c.Image,
    status: c.State.Status,
    memoryCap: c.HostConfig.Memory,
    cpuCap: c.HostConfig.NanoCpus,
    mounts: c.Mounts.map((m) => ({
      Type: m.Type,
      ...(m.Type === "volume" ? { Name: m.Name } : {}),
      Destination: m.Destination,
      RW: m.RW,
    })),
    labels: c.Config.Labels,
  };
});
const canonical = (value) =>
  JSON.stringify(value, (_, entry) =>
    entry && !Array.isArray(entry) && typeof entry === "object"
      ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)))
      : entry,
  );
// [EXP-RT01] Why: compare fresh exact identities/caps, not merely resident names. Rejected: interpreting a running container as semantic acceptance.
write("resident-identities-final.json", {
  observedAt: new Date().toISOString(),
  host: DOCKER_HOST,
  engines,
  sameAsBefore: canonical(before.engines) === canonical(engines),
});
const processes = [3977, 35477, 9427].map((pid) => {
  const r = spawnSync("ps", ["-p", String(pid), "-o", "pid=,ppid=,command="], { encoding: "utf8" });
  return { pid, exit: r.status, stdout: r.stdout, stderr: r.stderr };
});
const scratch = ["/tmp/rt01-record-cut-template", "/tmp/rt01-core-microbench-template"].map(
  (file) => {
    const existed = fs.existsSync(file);
    if (existed) fs.unlinkSync(file);
    return { file, existed, existsAfter: fs.existsSync(file) };
  },
);
const capacity = fs.statfsSync(root);
write("cleanup-final.json", {
  observedAt: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  processes,
  scratch,
  availableBytes: capacity.bavail * capacity.bsize,
  oracleAndAcceptanceDiff: execFileSync(
    "git",
    [
      "diff",
      "59e07afb7a25dfb22bca60f8d769b74651aa835a",
      "--name-only",
      "--",
      "lab/oracles/replay",
      "lab/acceptance",
    ],
    { cwd: root, encoding: "utf8" },
  ),
  residualOwnedTemporaryFiles: execFileSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "packages"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .filter((f) => f.includes("__rt01_main")),
  microbenchLockExists: fs.existsSync(path.join(dir, ".microbench.lock")),
  retention:
    "Retain failures, raw probes, source snapshots, tarballs, consumers and ignored local dependency caches; no engine lifecycle or backend cleanup",
});
const paths = [
  ...new Set(
    execFileSync("git", ["ls-files", "-co", "--exclude-standard", "lab/experiments/EXP-RT01"], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split("\n"),
  ),
]
  .filter((file) => file && !file.endsWith("/SHA256SUMS"))
  .sort();
fs.writeFileSync(
  path.join(dir, "SHA256SUMS"),
  paths
    .map(
      (file) =>
        `${createHash("sha256")
          .update(fs.readFileSync(path.join(root, file)))
          .digest("hex")}  ${path.relative(dir, path.join(root, file))}`,
    )
    .join("\n") + "\n",
);
console.log(
  JSON.stringify({
    filesHashed: paths.length,
    residentIdentitiesUnchanged: canonical(before.engines) === canonical(engines),
    ownedClientsGone: processes.every((p) => p.exit === 1 && p.stdout.trim() === ""),
  }),
);
