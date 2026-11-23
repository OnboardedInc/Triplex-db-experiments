// [DX-DEMO1] Why: the demo starts the same stack and launch policy as the measured runs, so its timings are comparable.
// Rejected: a second hand-written set of JVM, cache and PostgreSQL settings.
// Usage: node demo/server/profile.mjs server|toy  ->  prints NUL-free lines: KEY=VALUE environment, then "--" and up.sh arguments.
import assert from "node:assert/strict";
import { launchProfile } from "../../lab/experiments/EXP-DX1/jvm1/launch.mjs";

const kind = process.argv[2];
assert(kind === "server" || kind === "toy", "Use server or toy");
const policy = kind === "server"
  ? launchProfile("server", { txJvm: "j25-zgc", writeJvm: "j21-g1", creditMode: "rolling6" })
  : launchProfile("laptop");
if (kind === "server") {
  // The 32 GiB transactor cache arm (PREP1 `1-rolling6-cache32-S`, run on the 1 billion cut at cdc72d4d5).
  policy.tx.cacheMiB = 32768;
  policy.tx.memoryMiB = 61440;
  policy.tx.flags = policy.tx.flags.map((flag) =>
    flag.startsWith("-Xmx") ? "-Xmx49152m" :
    flag.startsWith("-XX:MaxDirectMemorySize=") ? "-XX:MaxDirectMemorySize=8192m" :
    flag.startsWith("-Ddatomic.objectCacheMax=") ? "-Ddatomic.objectCacheMax=32768m" : flag);
}
const env = {
  DX_LAUNCH_PROFILE: policy.profile,
  DX_TX_JAVA: policy.tx.major,
  DX_GW_WRITE_JAVA: policy["gw-w"].major,
  DX_JAVA: policy["gw-r"].major,
  DX_GW_WRITE_MEMORY: policy["gw-w"].memoryMiB + "m",
  DX_GW_READ_MEMORY: policy["gw-r"].memoryMiB + "m",
  DX_GW_WRITE_JAVA_OPTS: policy["gw-w"].flags.join(" "),
  DX_GW_READ_JAVA_OPTS: policy["gw-r"].flags.join(" "),
};
const args = [
  ...(policy.tx.cpus ? ["--cpus-tx", policy.tx.cpus, "--cpus-pg", policy.pg.cpus,
    "--cpus-gw-write", policy["gw-w"].cpus, "--cpus-gw-read", policy["gw-r"].cpus] : []),
  "--pg-memory", policy.pg.memoryMiB + "m", "--tx-memory", policy.tx.memoryMiB + "m",
  "--tx-java-opts", policy.tx.flags.join(" "), "--object-cache-max", policy.tx.cacheMiB + "m",
  "--memory-index-threshold", policy.index.threshold, "--memory-index-max", policy.index.max,
  "--pg-settings", Object.entries(policy.pg.settings).map(([k, v]) => "-c " + k + "=" + v).join(" "),
];
if (process.argv[3] === "--summary") {
  const flag = (flags, name) => flags.find((f) => f.startsWith(name))?.slice(name.length) ?? null;
  console.log(JSON.stringify({
    profile: kind === "server" ? "server, 32 GiB transactor cache arm" : "laptop (toy)",
    transactor: { containerMiB: policy.tx.memoryMiB, heap: flag(policy.tx.flags, "-Xmx"), objectCacheMiB: policy.tx.cacheMiB, java: policy.tx.major, collector: policy.tx.collector },
    writeGateway: { containerMiB: policy["gw-w"].memoryMiB, heap: flag(policy["gw-w"].flags, "-Xmx") },
    readGateway: { containerMiB: policy["gw-r"].memoryMiB, heap: flag(policy["gw-r"].flags, "-Xmx"), objectCacheMiB: policy["gw-r"].cacheMiB },
    postgres: { containerMiB: policy.pg.memoryMiB, sharedBuffers: policy.pg.settings.shared_buffers ?? "128MB (default)" },
    memoryIndex: policy.index,
  }));
  process.exit(0);
}
for (const [k, v] of Object.entries(env)) { assert(!/[\n\0]/.test(String(v))); console.log(k + "=" + v); }
console.log("--");
for (const a of args) { assert(!/[\n\0]/.test(a)); console.log(a); }
