import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { activeUnitArgs, dedicatedHost } from "../source.ts";

const root = "/var/tmp/triplex-scale1";
const dir = path.join(root, "decision");
const tag = "arm-d7-wfix-pool-seed";
const read = (f: string) => JSON.parse(fs.readFileSync(f, "utf8"));
const hash = (f: string) => createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const call = (bin: string, args: string[]) =>
  execFileSync(bin, args, {
    timeout: 30000,
    encoding: "utf8",
  }).trim();

assert(process.platform === "linux" && process.getuid?.() === 0);
assert.equal(process.env.DOCKER_HOST, "unix:///var/run/docker.sock");
const platform = path.join(root, "platform"),
  governors = "/sys/devices/system/cpu/cpufreq";
dedicatedHost(
  read(path.join(platform, "dedicated.json")),
  hash("/etc/machine-id"),
  hash(path.join(platform, "delivered.txt")),
  fs
    .readdirSync(governors)
    .filter((d) => /^policy\d+$/.test(d))
    .map((d) => fs.readFileSync(path.join(governors, d, "scaling_governor"), "utf8").trim()),
  fs.readFileSync("/sys/devices/system/cpu/smt/active", "utf8").trim(),
);
assert.equal(call("systemctl", [...activeUnitArgs, "triplex-scale1-arm-*.service"]), "");
assert.equal(call("docker", ["ps", "-q"]), "");
const old = read(path.join(dir, "plan.json")),
  state = read(path.join(dir, "state.json"));
const [source, review] = process.argv.slice(2);
assert.match(source ?? "", /^[0-9a-f]{40}$/);
assert.match(review ?? "", /^[0-9a-f]{64}$/);
assert.equal(call("git", ["rev-parse", "HEAD"]), source);
assert.equal(state.stage, "plan-consumed");
assert.deepEqual(
  old.steps.map((s: { tag: string }) => s.tag),
  ["arm-d7-wfix-pilot-b", tag],
);
assert.equal(old.maxHours, 40);
const sourceDir = path.join(dir, "attempts", tag);
const transferPath = path.join(sourceDir, "transfer.json");
const transfer = read(transferPath),
  attempt = read(path.join(sourceDir, "attempt.json"));
assert(
  state.results.some(
    (r: { tag: string; outcome: string }) => r.tag === tag && r.outcome === "success",
  ),
);
assert.deepEqual(
  [transfer.tag, transfer.source, transfer.nonce, transfer.result],
  [tag, old.source, attempt.nonce, "success"],
);
const image = path.join(sourceDir, "image.json");
assert.equal(hash(image), transfer.summaryFiles["image.json"]);
const original = read(image);
assert(
  original.facts === 162456470 &&
    original.scopes.length === 1 &&
    original.scopes[0].accounts.length === 10,
);
assert.deepEqual(
  [original.source, original.nonce, original.slot],
  [old.source, attempt.nonce, attempt.slot],
);
const plan = read(new URL("./held-placement.json", import.meta.url).pathname);
const next = {
  source,
  review,
  bootstrapCache: old.source,
  continuedFrom: old.source,
  maxHours: old.maxHours,
  steps: plan.steps.map((s: object) => ({ ...s, fromTransfer: hash(transferPath) })),
};
// [DX-SCALE1] Why: only the released predecessor can promote the original immutable image.
// Rejected: replacing a live queue's pinned source or reseeding after an evidence-export failure.
const planPath = path.join(dir, "plan.json");
fs.copyFileSync(planPath, path.join(dir, "completed-seed-plan.json"), fs.constants.COPYFILE_EXCL);
fs.writeFileSync(planPath + ".next", JSON.stringify(next) + "\n", { flag: "wx" });
fs.renameSync(planPath + ".next", planPath);
await import("./queue.ts");
