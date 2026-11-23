import assert from "node:assert/strict";
import test from "node:test";
import { launchProfile } from "../jvm1/launch.mjs";
import { cells, rollingArms, rollingCache32Arms, rollingTx5Arm } from "./server-tape.ts";
import { cache32ArmIds, rollingLaunchProfile, tx5ArmId, verifyPlacement } from "./rolling-launch.mjs";

test("the new arm only moves two writer cores and keeps the control's tape bands", () => {
  const control = launchProfile("server", { creditMode: "rolling6", txJvm: "j25-zgc" });
  assert.deepEqual(rollingLaunchProfile("1-rolling6-S"), control);
  assert.deepEqual(rollingLaunchProfile("1-fresh6-S"), control);
  assert.deepEqual(rollingLaunchProfile("1-fresh-zgc6-S"),
    launchProfile("server", { creditMode: "rolling6", txJvm: "j25-zgc", writeJvm: "j25-zgc" }));
  const expected = structuredClone(control);
  expected.tx.cpus = "0,4,5,7,8";
  expected.tx.cores = 5;
  expected.tx.flags[expected.tx.flags.indexOf("-XX:ActiveProcessorCount=3")] = "-XX:ActiveProcessorCount=5";
  expected["gw-w"].cpus = "2,3";
  expected["gw-w"].cores = 2;
  for (const key of ["ActiveProcessorCount", "ParallelGCThreads"]) {
    expected["gw-w"].flags[expected["gw-w"].flags.indexOf(`-XX:${key}=4`)] = `-XX:${key}=2`;
  }
  assert.deepEqual(rollingLaunchProfile(tx5ArmId), expected);
  assert(expected.tx.flags.includes("-XX:ConcGCThreads=2"));
  assert(expected.tx.flags.includes("-XX:ParallelGCThreads=3"));
  const base = rollingArms.find((arm) => arm.id === "1-rolling6-S");
  assert.deepEqual(cells(rollingTx5Arm, 1), cells(base, 1).filter((cell) => cell.rate !== 235));
});

function finalFlags(role) {
  return role.flags.flatMap((flag) => {
    const boolean = flag.match(/^-XX:([+-])(\w+)$/);
    if (boolean) return [`bool ${boolean[2]} = ${boolean[1] === "+"} {fixture}`];
    const value = flag.match(/^-XX:(\w+)=(.+)$/);
    if (value) {
      const mebibytes = value[2].match(/^(\d+)m$/);
      return [`size_t ${value[1]} = ${mebibytes ? Number(mebibytes[1]) * 1024 ** 2 : value[2]} {fixture}`];
    }
    const heap = flag.match(/^-Xm([sx])(\d+)m$/);
    return heap ? [`size_t ${heap[1] === "s" ? "Initial" : "Max"}HeapSize = ${Number(heap[2]) * 1024 ** 2} {fixture}`] : [];
  }).concat(`[0ms][info][gc,init] Version: ${role.major}.1`).join("\n");
}

test("readback refuses a stale CPU split, surplus GC workers and wider indexing", () => {
  const profile = rollingLaunchProfile(tx5ArmId);
  const tx = finalFlags(profile.tx);
  const writer = finalFlags(profile["gw-w"]);
  const props = [
    "write-concurrency=4", "read-concurrency=8", "index-parallelism=1",
    "memory-index-threshold=256m", "memory-index-max=1g", "object-cache-max=16384m",
  ].join("\n");
  verifyPlacement(profile, tx, writer, props);
  assert.throws(() => verifyPlacement(profile, tx.replace("ActiveProcessorCount = 5", "ActiveProcessorCount = 3"), writer, props));
  assert.throws(() => verifyPlacement(profile, tx.replace("ParallelGCThreads = 3", "ParallelGCThreads = 5"), writer, props));
  assert.throws(() => verifyPlacement(profile, tx, writer, props.replace("index-parallelism=1", "index-parallelism=2")));
});

test("the 32 GiB arms keep tape, non-transactor memory and collector policy bound", () => {
  for (const [index, arm] of rollingCache32Arms.entries()) {
    assert.equal(arm.id, cache32ArmIds[index]);
    assert.equal(arm.cacheGiB, 32);
    const base = rollingLaunchProfile(index === 0 ? "1-rolling6-S" : tx5ArmId);
    const expected = structuredClone(base);
    expected.tx.cacheMiB = 32768;
    expected.tx.memoryMiB = 61440;
    for (const [old, value] of [["-Xmx24576m", "-Xmx49152m"], ["-XX:MaxDirectMemorySize=24576m",
      "-XX:MaxDirectMemorySize=8192m"], ["-Ddatomic.objectCacheMax=16384m", "-Ddatomic.objectCacheMax=32768m"]]) {
      expected.tx.flags[expected.tx.flags.indexOf(old)] = value;
    }
    const actual = rollingLaunchProfile(arm.id);
    assert.deepEqual(actual, expected);
    assert.equal(["tx", "pg", "gw-w", "gw-r"].reduce((n, role) => n + actual[role].memoryMiB, 0), 79 * 1024);
    assert.deepEqual(cells(arm, 1), cells(rollingTx5Arm, 1));
    const props = [
      "write-concurrency=4", "read-concurrency=8", "index-parallelism=1",
      "memory-index-threshold=256m", "memory-index-max=1g", "object-cache-max=32768m",
    ].join("\n");
    const tx = finalFlags(actual.tx);
    const writer = finalFlags(actual["gw-w"]);
    verifyPlacement(actual, tx, writer, props, arm.id);
    assert.throws(() => verifyPlacement(actual, tx, writer, props.replace("32768m", "16384m"), arm.id));
    assert.throws(() => verifyPlacement(actual, finalFlags(base.tx), writer, props, arm.id));
    assert.throws(() => verifyPlacement(actual, tx.replace("MaxDirectMemorySize = 8589934592",
      "MaxDirectMemorySize = 25769803776"), writer, props, arm.id));
  }
});
