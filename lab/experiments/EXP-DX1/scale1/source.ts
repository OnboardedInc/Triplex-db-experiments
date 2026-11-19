import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
export const replayRevision = "03d86f3346cccd6794487b77293fb56077dd020e";
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
// [DX-SCALE1] Why: BM1 invokes a frozen O-REPLAY revision that differs from the working-tree oracle. Rejected: assuming an interchangeable executable from a similar checkout.
export function stageReplay(repo: string, destination: string) {
  fs.mkdirSync(destination, { recursive: true });
  const names = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", replayRevision, "--", "lab/oracles/replay"],
    { cwd: repo, encoding: "utf8" },
  )
    .trim()
    .split("\n");
  assert(names.includes("lab/oracles/replay/cli.py"));
  const files = names.map((name) => {
    assert(name.startsWith("lab/oracles/replay/") && !name.includes(".."));
    const bytes = execFileSync("git", ["show", `${replayRevision}:${name}`], {
        cwd: repo,
        maxBuffer: 32 * 1024 ** 2,
      }),
      target = path.join(destination, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (!fs.existsSync(target)) fs.writeFileSync(target, bytes, { flag: "wx" });
    assert(fs.readFileSync(target).equals(bytes));
    return { path: name, sha256: digest(bytes), bytes: bytes.length };
  });
  return { revision: replayRevision, files };
}
export function sourceInventory(repo: string) {
  const inputs = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "lab/bench",
      "lab/trace",
      "lab/oracles/domain",
      "lab/world/W0",
      "lab/experiments/EXP-DX1/scale1",
      "lab/experiments/EXP-DX1/act2",
      "lab/experiments/EXP-DX1/stack",
      "packages/datomic/gateway",
      "pnpm-lock.yaml",
    ],
    { cwd: repo },
  )
    .toString()
    .split("\0")
    .filter(Boolean);
  const built: string[] = [];
  for (const pkg of ["core", "qualification", "w0", "datomic", "host"]) {
    const dir = path.join(repo, `packages/${pkg}/dist`);
    assert(fs.existsSync(dir));
    for (const rel of fs.readdirSync(dir, { recursive: true, encoding: "utf8" }))
      if (rel.endsWith(".js")) built.push(`packages/${pkg}/dist/${rel}`);
  }
  return {
    node: process.version,
    nodeSha256: digest(fs.readFileSync(process.execPath)),
    files: Object.fromEntries(
      [...inputs, ...built].sort().map((f) => [f, digest(fs.readFileSync(path.join(repo, f)))]),
    ),
  };
}

// [DX-SCALE1] Why: a private delivery receipt binds this campaign to its own physical machine. Rejected: waiting for a different server's lease or treating an empty Docker daemon as proof of assignment.
export function dedicatedHost(
  assignment: { role: string; machineIdSha256: string; deliveredSha256: string },
  machineHash: string,
  deliveredHash: string,
  governors: string[],
  smt: string,
) {
  assert(
    assignment.role === "DX-SCALE1" &&
      /^[a-f0-9]{64}$/.test(machineHash) &&
      machineHash === assignment.machineIdSha256,
  );
  assert(/^[a-f0-9]{64}$/.test(deliveredHash) && deliveredHash === assignment.deliveredSha256);
  assert(
    governors.length && governors.every((g) => g === "performance") && smt === "1",
    "Dedicated bench condition changed",
  );
}
export const activeUnitArgs = [
  "list-units",
  "--type=service",
  "--state=activating,active,deactivating,reloading",
  "--no-legend",
  "--plain",
];

// [DX-SCALE1] Why: previously extracted reports remain on disk across collection retries. Rejected: checking only the compressed download while reporting a changed or added loose summary.
export function summaryFiles(directory: string) {
  return Object.fromEntries(
    fs
      .readdirSync(directory, { recursive: true, encoding: "utf8" })
      .sort()
      .flatMap((name) => {
        const f = path.join(directory, name),
          stat = fs.lstatSync(f);
        if (stat.isDirectory()) return [];
        assert(stat.isFile() && name.endsWith(".json"), "Unexpected summary entry");
        return [[name, digest(fs.readFileSync(f))]];
      }),
  );
}
