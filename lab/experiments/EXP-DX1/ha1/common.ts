import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

export const root = path.resolve(import.meta.dirname, "../../../..");
export const loopback = Object.values(os.networkInterfaces())
  .flat()
  .find((i) => i?.internal && i.family === "IPv4")!.address;
export const hash = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
export const head = () =>
  execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
export const runFile = promisify(execFile);
export const clock = () => performance.now();
export { sleep };
export const modes = [
  "failures",
  "move",
  "replication",
  "one-failover",
  "one-backup",
  "one-sync",
  "one-whole",
  "one-account",
  "load-profile",
  "load-proof",
  "load-quiet",
  "load-live",
  "load-tail",
  "load-micro",
  "load-volume",
  "load-pipeline",
  "load-paced",
  "load-fair",
  "native-checks",
  "load-frontier-low",
  "load-frontier-high",
  "load-frontier-allowance",
  "load-split-sql",
  "load-split-pg",
  "hasync-smoke",
  "hasync-cold",
  "hasync-commit",
  "hasync-ack",
  "hasync-index",
  "hasync-import",
  "hasync-cut-wal",
  "hasync-cut-reply",
  "hasync-restart",
  "hasync-cost-plain",
  "hasync-cost-group",
  "hasync-move",
  "hasync-seed-legacy",
  "hasync-seed-lean",
  "hasync-seed-edited",
  "hasync-fleet-shared",
  "hasync-fleet-dedicated",
  "hasync-suite",
  "hasync-scale",
  "hasync-p9",
  "hasync-second",
] as const;
export type Mode = (typeof modes)[number];
export const roles = {
  pg: 192,
  target: 192,
  active: 560,
  standby: 560,
  write: 672,
  read: 672,
  tool: 640,
} as const;
export type Role = keyof typeof roles | "write-b" | `fleet-${"a" | "b"}-${"pg" | "tx"}${number}`;
// [DX-LOAD1] Why: peak-rate arms keep several fresh databases in one transactor process. Rejected: reusing the 560 MiB failure-drill cap after a measured cgroup OOM.
// [DX-LOAD2] Why: the same bound campaign can reserve just one machine for a same-host comparison.
export function microLoad(mode: string) {
  return (
    mode === "load-micro" ||
    mode === "load-volume" ||
    mode === "load-pipeline" ||
    mode === "load-paced" ||
    mode === "load-fair"
  );
}
export function supportsSingleHost(mode: Mode) {
  return (
    mode === "hasync-p9" ||
    mode === "one-failover" ||
    mode === "load-tail" ||
    mode.startsWith("load-frontier-") ||
    splitLoad(mode) ||
    microLoad(mode)
  );
}
export function splitLoad(mode: string) {
  return mode === "load-split-sql" || mode === "load-split-pg";
}
export function loadRoles(mode: Mode): Role[] {
  return [
    "pg",
    "active",
    "write",
    "tool",
    ...(mode === "load-fair" ? (["read"] as Role[]) : splitLoad(mode)
      ? (["standby", "read", ...(mode === "load-split-pg" ? ["target"] : [])] as Role[])
      : []),
  ];
}
export function localRoleMiB(mode: Mode, role: Role) {
  if (mode === "native-checks" && role === "tool") return 1280;
  if (splitLoad(mode)) {
    if (role === "active") return 896;
    if (role === "standby") return 768;
    if (role === "tool") return 96;
  }
  if (mode === "load-tail" || mode.startsWith("load-frontier-") || microLoad(mode)) {
    if (role === "active") return 1024;
    if (role === "tool") return 96;
  }
  return mode === "load-live" && role === "active" ? 896 : (roles[role as keyof typeof roles] ?? 0);
}
export function modeOf(s: string): Mode {
  assert(modes.includes(s as Mode), "Unknown HA experiment");
  return s as Mode;
}
export async function until<T>(label: string, fn: () => Promise<T | undefined>, ms = 120000) {
  const end = clock() + ms;
  for (;;) {
    const value = await fn();
    if (value !== undefined) return value;
    if (clock() > end) throw Error("Deadline waiting for " + label);
    await sleep(250);
  }
}
export function tree(dir: string) {
  const files = fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .sort()
    .filter((f) => fs.statSync(path.join(dir, f)).isFile());
  return hash(JSON.stringify(files.map((f) => [f, hash(fs.readFileSync(path.join(dir, f)))])));
}
export function inputs(mode?: Mode) {
  return {
    ...(mode?.startsWith("load-")
      ? {
          traceSettings: hash(
            fs.readFileSync(path.join(root, "packages/datomic/gateway/trace.jfc")),
          ),
          loadSources: hash(
            JSON.stringify([
              ...["lab/bench/lib", "packages/qualification/dist", "packages/w0/dist"].map((dir) =>
                tree(path.join(root, dir)),
              ),
              ...fs
                .readdirSync(path.join(root, "lab/experiments/EXP-DX1/load1"))
                .filter((f) => f.endsWith(".ts"))
                .sort()
                .map((f) => [
                  f,
                  hash(fs.readFileSync(path.join(root, "lab/experiments/EXP-DX1/load1", f))),
                ]),
            ]),
          ),
        }
      : {}),
    git: head(),
    experiment: treeCode(mode),
    gateway: tree(path.join(root, "packages/datomic/gateway/src")),
    codec: hash(fs.readFileSync(path.join(root, "packages/datomic/src/codec-spec.json"))),
    client: tree(path.join(root, "packages/datomic/dist")),
    core: tree(path.join(root, "packages/core/dist")),
  };
}
function treeCode(mode?: Mode) {
  const paths = fs
    .readdirSync(import.meta.dirname)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => path.join(import.meta.dirname, f));
  paths.push(
    ...[
      "lab/bin/engine.mjs",
      "lab/bin/lib.mjs",
      "lab/bin/heavy.mjs",
      "packages/datomic/test/ha1-account.ts",
    ].map((f) => path.join(root, f)),
  );
  if (mode === "load-fair" || mode === "hasync-ack") {
    const checks = path.join(import.meta.dirname, "../chk1");
    paths.push(...fs.readdirSync(checks).filter((f) => f.endsWith(".ts")).map((f) => path.join(checks, f)));
  }
  if (mode === "load-fair")
    for (const f of [
      "actv-lazy/join/held-campaign.ts", "age1/scale1-fixture.mjs", "scale1/decision/observer.ts",
      "scale1/decision/plan.ts", "scale1/decision/writes.ts", "prep1/fair-turns.ts",
      "prep1/rolling-credits.ts", "v01/adopt.ts", "v01/adopted.ts", "w1/group/workload.ts",
    ]) paths.push(path.join(root, "lab/experiments/EXP-DX1", f));
  if (mode?.startsWith("hasync-")) {
    const dir = path.join(import.meta.dirname, "../hasync1");
    for (const f of fs
      .readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((name) => name.endsWith(".ts")))
      paths.push(path.join(dir, f));
    for (const f of fs
      .readdirSync(path.join(root, "lab/oracles/replay"))
      .filter((name) => name.endsWith(".py")))
      paths.push(path.join(root, "lab/oracles/replay", f));
    for (const f of ["deep-command", "deep-trace", "deep-world", "world", "trace", "rng"])
      paths.push(path.join(root, "lab/bench/lib", f + ".ts"));
    for (const f of ["tenants", "small-plan", "deep-live", "tenant-proof"])
      paths.push(path.join(root, "lab/experiments/EXP-DX1/scale1", f + ".ts"));
    for (const f of ["ack-audit", "runner", "score", "seed", "suite", "verify"])
      paths.push(path.join(root, "lab/experiments/EXP-DX1/p9", f + ".ts"));
    for (const f of [
      "jvm1/launch.mjs",
      "v01/profile.ts",
      "v01/source.ts",
      "v01/adopt.ts",
      "scale1/decision/plan.ts",
      "scale1/decision/field-save.ts",
      "w1/group/workload.ts",
      "w1/group/population.ts",
      "w1/write-options.ts",
    ])
      paths.push(path.join(root, "lab/experiments/EXP-DX1", f));
  }
  return hash(
    JSON.stringify(paths.sort().map((f) => [path.relative(root, f), hash(fs.readFileSync(f))])),
  );
}
export class Evidence {
  readonly nonce = randomUUID();
  readonly prefix = "tx2-ha1-" + this.nonce.slice(0, 8);
  readonly source: ReturnType<typeof inputs>;
  readonly dir: string;
  readonly start = clock();
  readonly mode: Mode;
  readonly slot: string;
  readonly shape: "deep" | "mixed";
  readonly faultCell: "all" | "tail-burst";
  readonly holder: string;
  constructor(
    parent: string,
    mode: Mode,
    slot: string,
    shape: "deep" | "mixed" = "deep",
    faultCell: "all" | "tail-burst" = "all",
    holder = mode.startsWith("hasync-") ? "DX-HASYNC1" : "DX-HA1",
  ) {
    assert(
      shape === "deep" || ["one-failover", "one-backup", "one-sync", "one-whole"].includes(mode),
      "This mode has a fixed population",
    );
    this.mode = mode;
    this.slot = slot;
    this.shape = shape;
    this.faultCell = faultCell;
    this.holder = holder;
    this.source = inputs(mode);
    fs.mkdirSync(parent, { recursive: true });
    this.dir = path.join(parent, mode + "-" + this.nonce);
    fs.mkdirSync(this.dir);
    this.write("attempt", {
      nonce: this.nonce,
      mode,
      slot,
      shape,
      faultCell,
      holder,
      source: this.source,
      utc: new Date().toISOString(),
    });
  }
  write(name: string, data: unknown) {
    fs.writeFileSync(path.join(this.dir, name + ".json"), JSON.stringify(data, null, 2) + "\n", {
      flag: "wx",
    });
  }
  log(type: string, data: unknown) {
    fs.appendFileSync(
      path.join(this.dir, "events.jsonl"),
      JSON.stringify({ nonce: this.nonce, ms: clock() - this.start, type, data }) + "\n",
    );
  }
}
