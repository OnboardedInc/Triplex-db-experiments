import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createReadStream, readFileSync, readdirSync, statfsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "../../../bench/lib/w0-world.ts";
const dir = process.env.DX_LAZY_OUT!,
  ownerPath = process.env.TRIPLEX_LAB_SLOT_OWNER!;
const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 << 20 }).trim();
const source = git("rev-parse", "HEAD"),
  owner = readFileSync(ownerPath),
  slot = JSON.parse(owner.toString());
assert(
  slot.holder === "DX-ACT1" &&
    slot.mode === "exclusive" &&
    slot.endpoint === process.env.DATOMIC_URL &&
    slot.volume.endsWith("-" + process.env.TX2_EXCLUSIVE_VOLUME_ID),
);
const base = "lab/experiments/EXP-DX1/actv-lazy/",
  pins: Record<string, string> = {};
const tracked = git(
  "ls-files",
  base,
  "lab/bench/lib",
  "lab/experiments/EXP-DX1/act1",
  "lab/experiments/EXP-DX1/act2",
  "lab/experiments/EXP-DX1/actv-delta",
  "lab/experiments/EXP-DX1/notify1",
  "lab/experiments/EXP-DX1/import1/source.ts",
  "lab/experiments/EXP-DX1/scale1/tenants.ts",
  "lab/experiments/EXP-DX1/scale1/deep-live.ts",
  "lab/world/W0",
  "lab/oracles/domain",
  "packages/datomic/src",
  "packages/datomic/gateway",
  "packages/w0/src",
  "lab/bin/engine.mjs",
  "lab/bin/heavy-lock.mjs",
  "lab/bin/lib.mjs",
  "pnpm-lock.yaml",
)
  .split("\n")
  .filter((f) => !f.endsWith(".md") && !f.endsWith("SHA256SUMS"));
for (const f of tracked) {
  pins[f] = sha256(readFileSync(f));
  assert.equal(
    pins[f],
    sha256(execFileSync("git", ["show", source + ":" + f], { maxBuffer: 32 << 20 })),
    f,
  );
}
for (const pkg of ["core", "host", "qualification", "datomic", "w0"]) {
  const root = "packages/" + pkg + "/dist";
  for (const f of readdirSync(root, { recursive: true, encoding: "utf8" }))
    if (f.endsWith(".js")) pins[join(root, f)] = sha256(readFileSync(join(root, f)));
}
const cfg = join(process.env.TX2_CONFIG_DIR!, "lab/config/slots.json");
const save = (file: string, x: unknown) =>
  writeFileSync(join(dir, file), JSON.stringify(x, null, 2) + "\n", { flag: "wx" });
save("inputs.json", pins);
const binding = {
  source,
  inputs: sha256(readFileSync(join(dir, "inputs.json"))),
  nonce: randomUUID(),
  slot: slot.container,
  volume: slot.volume,
  owner: sha256(owner),
  config: sha256(readFileSync(cfg)),
  image: JSON.parse(readFileSync(cfg, "utf8")).lanes.datomic.imageId,
  mode: process.argv[2],
  size: process.argv[3] ?? null,
};
save("attempt.json", binding);
const run = (file: string, args: string[]) => {
  const disk = statfsSync(dir);
  assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3);
  execFileSync(process.execPath, ["--experimental-strip-types", base + file, ...args], {
    stdio: "inherit",
  });
};
if (binding.mode === "--proof" || binding.mode === "--functional") {
  for (const f of [
    "admission-gate.ts",
    "read-gate.ts",
    "dispatch-gate.ts",
    "dependency-gate.ts",
    "boundary-gate.ts",
    "crash.ts",
    "service-gate.ts",
    ...(binding.mode === "--proof" ? ["pressure.ts"] : []),
  ])
    run(f, [dir]);
  const buf = execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--test",
      "--test-concurrency=1",
      "lab/experiments/EXP-DX1/act1/guard.test.ts",
      "lab/experiments/EXP-DX1/act1/page.test.ts",
    ],
    { encoding: "utf8", maxBuffer: 32 << 20 },
  );
  assert.match(buf, /# pass 23\b/);
  assert.match(buf, /# fail 0\b/);
  writeFileSync(join(dir, "legacy.tap"), buf, { flag: "wx" });
} else if (binding.mode === "--pressure") {
  run("pressure.ts", [dir]);
} else if (binding.mode === "--joined-proof") {
  run("join/gate.ts", [dir]);
  const buf = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--test", base + "join/ranges.test.ts"],
    { encoding: "utf8" },
  );
  assert.match(buf, /# pass 1\b/);
  assert.match(buf, /# fail 0\b/);
  writeFileSync(join(dir, "ranges.tap"), buf, { flag: "wx" });
} else if (binding.mode === "--joined-stage-proof") {
  run("join/stage-gate.ts", [dir]);
  run("join/deadline-gate.ts", [dir]);
  run("join/gate.ts", [dir]);
} else if (binding.mode === "--joined-fast-deep" || binding.mode === "--joined-fast-compact") {
  assert(["1000", "10000"].includes(binding.size!));
  run("join/fast-price.ts", [
    dir,
    binding.size!,
    binding.mode === "--joined-fast-deep" ? "deep" : "compact",
  ]);
} else if (binding.mode === "--joined-server-smoke") {
  run("join/server.ts", ["64", dir, "--local"]);
} else if (binding.mode === "--joined-settle-proof") {
  run("join/settle-gate.ts", [dir]);
} else if (binding.mode === "--joined-part7") {
  for (const f of ["settle-gate.ts", "future-gate.ts", "gate.ts"]) run("join/" + f, [dir]);
  process.env.NOTIFY_NATIVE = "1";
  const body = execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--test", "lab/experiments/EXP-DX1/notify1/coverage.test.ts"],
    { encoding: "utf8" },
  );
  assert.match(body, /# pass 7\b/);
  assert.match(body, /# fail 0\b/);
  writeFileSync(join(dir, "shared-coverage.tap"), body, { flag: "wx" });
} else if (binding.mode === "--joined-role-gate") {
  run("join/role-gate.ts", [dir]);
} else if (binding.mode === "--joined-settle-price") {
  assert(["64", "1000", "10000"].includes(binding.size!));
  run("join/settle-price.ts", [dir, binding.size!, binding.size === "64" ? "3" : "60"]);
} else if (binding.mode === "--joined-size") {
  const [profile, n] = binding.size!.split(":");
  assert((profile === "thin" || profile === "deep") && ["1000", "10000", "100000"].includes(n!));
  run("join/scope-price.ts", [dir, n!, profile]);
} else if (binding.mode === "--joined-fixed") {
  assert(["45", "180"].includes(binding.size!));
  run("join/interference.ts", [dir, binding.size!]);
} else if (binding.mode === "--joined-deep") {
  assert(["1000", "10000"].includes(binding.size!));
  run("join/deep-price.ts", [dir, binding.size!]);
} else if (binding.mode === "--joined-price") {
  assert(["1000", "10000"].includes(binding.size!));
  run("join/price.ts", [dir, binding.size!]);
} else if (binding.mode === "--timing") {
  assert(["legacy", "shared-cut"].includes(binding.size!));
  if (binding.size === "shared-cut") {
    process.env.DX_LAZY_READ_PATH = "shared-cut";
    run("read-gate.ts", [dir]);
  }
  run("timing.ts", [dir, binding.size!]);
} else if (binding.mode === "--smoke") {
  run("bench.ts", ["--smoke", dir]);
} else {
  assert(binding.mode === "--rung" && ["1000", "10000"].includes(binding.size!));
  run("price.ts", [dir, binding.size!]);
}
assert.equal(sha256(readFileSync(ownerPath)), binding.owner);
assert.equal(sha256(readFileSync(cfg)), binding.config);
for (const [f, h] of Object.entries(pins)) assert.equal(sha256(readFileSync(f)), h, f);
const outputs: Record<string, string> = {};
for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const f = join(entry.parentPath, entry.name).slice(dir.length + 1);
  if (["env", "admissions.log", "output.log", "cleanup.log"].includes(f)) continue;
  const h = createHash("sha256");
  for await (const b of createReadStream(join(dir, f))) h.update(b);
  outputs[f] = h.digest("hex");
}
save("verified.json", { ...binding, outputs });
