import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { checkProfileFlags, launchProfile } from "../jvm1/launch.mjs";

export const tx5ArmId = "1-rolling6-tx5-S";

export function rollingLaunchProfile(arm) {
  const depth = arm === tx5ArmId ? "6" : arm.match(/(6|8|12|16)-S$/)?.[1];
  const profile = launchProfile("server", {
    txJvm: "j25-zgc",
    creditMode: arm.includes("barrier") ? "barrier6" : "rolling" + depth,
    writeJvm: arm.startsWith("1-fresh-zgc") ? "j25-zgc" : "j21-g1",
  });
  if (arm !== tx5ArmId) return profile;

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

export function verifyPlacement(profile, txLog, writeLog, properties) {
  assert.deepEqual(profile, rollingLaunchProfile(tx5ArmId));
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
    "memory-index-threshold": "256m", "memory-index-max": "1g", "object-cache-max": "16384m",
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const files = process.argv.slice(2);
  assert.equal(files.length, 4);
  const [profile, txLog, writeLog, properties] = files.map((file) => readFileSync(file, "utf8"));
  verifyPlacement(JSON.parse(profile), txLog, writeLog, properties);
}
