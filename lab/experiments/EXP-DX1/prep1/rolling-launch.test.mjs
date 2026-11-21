import assert from "node:assert/strict";
import test from "node:test";
import { launchProfile } from "../jvm1/launch.mjs";
import { cells, rollingArms, rollingTx5Arm } from "./server-tape.ts";
import { rollingLaunchProfile, tx5ArmId, verifyPlacement } from "./rolling-launch.mjs";

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
