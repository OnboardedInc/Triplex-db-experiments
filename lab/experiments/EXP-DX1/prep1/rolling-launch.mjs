import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { checkProfileFlags, launchProfile } from "../jvm1/launch.mjs";

export const tx5ArmId = "1-rolling6-tx5-S";
export const cache32ArmIds = ["1-rolling6-cache32-S", "1-rolling6-tx5-cache32-S"];

// [DX-REAL2] Production-shaped arms run Saturday's rolling 6 profile, or its three-core 32 GiB cache variant.
export const productionCache32ArmIds = ["1-prodR-cache32-S", "1-prodS-cache32-S", "1-prodR-394-cache32-S", "1-prodS-394-cache32-S"];
export const productionArmIds = ["1-prodR-S", "1-prodS-S", "1-prodS-394-S", "1-prodR-394-S", ...productionCache32ArmIds];

export function rollingLaunchProfile(arm) {
  if (productionArmIds.includes(arm))
    return rollingLaunchProfile(productionCache32ArmIds.includes(arm) ? cache32ArmIds[0] : "1-rolling6-S");
  const cache32 = cache32ArmIds.includes(arm);
  const tx5 = arm === tx5ArmId || arm === cache32ArmIds[1];
  const depth = tx5 || cache32 ? "6" : arm.match(/(6|8|12|16)-S$/)?.[1];
  const profile = launchProfile("server", {
    txJvm: "j25-zgc",
    creditMode: arm.includes("barrier") ? "barrier6" : "rolling" + depth,
    writeJvm: arm.startsWith("1-fresh-zgc") ? "j25-zgc" : "j21-g1",
  });
  if (cache32) {
    // [DX-PREP1] Why: fit 32 GiB of decoded objects while keeping heap, direct and host headroom explicit.
    // Rejected: doubling the cache inside the 24 GiB control heap or hiding direct memory in the budget.
    profile.tx.cacheMiB = 32768;
    profile.tx.memoryMiB = 61440;
    profile.tx.flags = profile.tx.flags.map((flag) =>
      flag.startsWith("-Xmx") ? "-Xmx49152m" :
      flag.startsWith("-XX:MaxDirectMemorySize=") ? "-XX:MaxDirectMemorySize=8192m" :
      flag.startsWith("-Ddatomic.objectCacheMax=") ? "-Ddatomic.objectCacheMax=32768m" : flag);
  }
  if (!tx5) return profile;

  // [DX-PREP1] Why: give apply room alongside the existing index and ZGC workers.
  // Rejected: raising the transactor's worker counts with its CPU allowance (would confound the comparison).
  profile.tx = {
    ...profile.tx, cpus: "0,4,5,7,8", cores: 5,
    flags: profile.tx.flags.map((flag) => flag === "-XX:ActiveProcessorCount=3" ? "-XX:ActiveProcessorCount=5" : flag),
  };
  profile["gw-w"] = {
    ...profile["gw-w"], cpus: "2,3", cores: 2,
    flags: profile["gw-w"].flags.map((flag) =>
      flag === "-XX:ActiveProcessorCount=4" ? "-XX:ActiveProcessorCount=2" :
      flag === "-XX:ParallelGCThreads=4" ? "-XX:ParallelGCThreads=2" : flag),
  };
  return profile;
}

export function verifyPlacement(profile, txLog, writeLog, properties, arm = tx5ArmId) {
  assert(arm === tx5ArmId || cache32ArmIds.includes(arm) || productionCache32ArmIds.includes(arm));
  assert.deepEqual(profile, rollingLaunchProfile(arm));
  checkProfileFlags(profile.tx, txLog);
  checkProfileFlags(profile["gw-w"], writeLog);
  const configured = Object.fromEntries(["write-concurrency", "read-concurrency", "index-parallelism",
    "memory-index-threshold", "memory-index-max", "object-cache-max"].map((key) => {
    const matches = [...properties.matchAll(new RegExp(`^\\s*${key}\\s*=\\s*(\\S+)\\s*$`, "gm"))];
    assert.equal(matches.length, 1, `Expected one transactor property ${key}`);
    return [key, matches[0][1]];
  }));
  assert.deepEqual(configured, {
    "write-concurrency": "4", "read-concurrency": "8", "index-parallelism": "1",
    "memory-index-threshold": "256m", "memory-index-max": "1g", "object-cache-max": `${profile.tx.cacheMiB}m`,
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [, , arm, ...files] = process.argv;
  assert.equal(files.length, 4);
  const [profile, txLog, writeLog, properties] = files.map((file) => readFileSync(file, "utf8"));
  verifyPlacement(JSON.parse(profile), txLog, writeLog, properties, arm);
}
