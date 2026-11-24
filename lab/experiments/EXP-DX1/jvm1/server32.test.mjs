import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultServerProfile, hostHeadroomMiB, launchProfile, roleMemoryMiB, server32HostMiB } from "./launch.mjs";
import { rollingLaunchProfile } from "../prep1/rolling-launch.mjs";

// [DX-INT1] Why: server-32 must be exactly the launch PREP1 measured as its cache32 arm, apart from its name.
// Rejected: a second hand-written copy of the 48 GiB heap, 32 GiB cache and 8 GiB direct-memory flags.
const headline = { txJvm: "j25-zgc", writeJvm: "j21-g1", creditMode: "rolling6" };

test("server-32 is PREP1's measured cache32 launch under its own name", () => {
  const named = launchProfile("server-32", headline);
  assert.equal(named.profile, "server-32");
  assert.deepEqual({ ...named, profile: "server" }, rollingLaunchProfile("1-rolling6-cache32-S"));
  assert.deepEqual([named.tx.memoryMiB, named.tx.cacheMiB, named.tx.collector, named.tx.major], [61440, 32768, "ZGC", "25"]);
  for (const flag of ["-Xmx49152m", "-XX:MaxDirectMemorySize=8192m", "-Ddatomic.objectCacheMax=32768m", "-XX:+UseZGC"])
    assert(named.tx.flags.includes(flag), flag);
});

test("server-32 changes only the transactor's memory against server", () => {
  const server = launchProfile("server", headline), named = launchProfile("server-32", headline);
  for (const role of ["gw-w", "gw-r"]) assert.deepEqual(named[role], server[role]);
  assert.deepEqual([named.pg, named.index, named.clients, named.creditMode], [server.pg, server.index, server.clients, server.creditMode]);
  assert.deepEqual([named.tx.cpus, named.tx.cores], [server.tx.cpus, server.tx.cores]);
});

test("server-32 role caps fit a 96 GB machine with the host headroom guard", () => {
  const named = launchProfile("server-32", headline);
  assert.equal(roleMemoryMiB(named), 79 * 1024);
  assert.equal(roleMemoryMiB(launchProfile("server", headline)), 49 * 1024);
  assert(roleMemoryMiB(named) + hostHeadroomMiB <= server32HostMiB);
  assert.throws(() => launchProfile("server-32", { ...headline, readCacheMiB: 3072 }), /96 GB/);
  assert.throws(() => launchProfile("server-32", { ...headline, txJvm: "j21-g1" }), /ZGC/);
});

// [DX-CARD2] The 32 GiB transactor with the card's tuned reader (a 3 GiB cache in a 9 GiB heap): containers cut to the
// measured peaks (launch.mjs), every heap, cache, direct limit and core of the transactor unchanged, the sum exactly at
// the guard. The reader arms' own tuned reader (6 GiB heap, 9 GiB container) does not fit beside it.
test("server-32 with the card's tuned reader fits the guard: transactor 57, reader 11, PostgreSQL 5 GiB", () => {
  const card = { readTuned: true, readCacheMiB: 3072, readHeapThird: true };
  const both = launchProfile("server-32", { ...headline, ...card });
  const alone = launchProfile("server-32", headline), tuned = launchProfile("server", { ...headline, ...card });
  assert.deepEqual([both.tx.memoryMiB, both["gw-r"].memoryMiB, both["gw-w"].memoryMiB, both.pg.memoryMiB], [57 * 1024, 11 * 1024, 6 * 1024, 5 * 1024]);
  assert.equal(roleMemoryMiB(both) + hostHeadroomMiB, server32HostMiB);
  assert.deepEqual(both.tx.flags, alone.tx.flags);
  assert.deepEqual([both.tx.cpus, both.tx.cacheMiB], [alone.tx.cpus, 32768]);
  assert.deepEqual(both["gw-r"].flags, tuned["gw-r"].flags);
  assert.deepEqual([both["gw-r"].cpus, both["gw-r"].cores, both["gw-r"].cacheMiB], ["5,6,11", 3, 3072]);
  for (const flag of ["-Xmx9216m", "-XX:MaxDirectMemorySize=1024m", "-Ddatomic.objectCacheMax=3072m", "-XX:ActiveProcessorCount=3", "-XX:ParallelGCThreads=3"])
    assert(both["gw-r"].flags.includes(flag), flag);
  assert.deepEqual(both["gw-w"], tuned["gw-w"]);
  assert.deepEqual([both.clients, both.pg.settings], [tuned.clients, tuned.pg.settings]);
  // On the server profile the card's reader keeps PostgreSQL at 8 GiB and the 30 GiB transactor.
  assert.deepEqual([tuned.tx.memoryMiB, tuned["gw-r"].memoryMiB, tuned.pg.memoryMiB], [30 * 1024, 11 * 1024, 8 * 1024]);
  // The reader arms' own launch is unchanged, and does not fit beside the 32 GiB transactor.
  const arms = launchProfile("server", { ...headline, readTuned: true, readCacheMiB: 3072 });
  assert.deepEqual([arms.tx.memoryMiB, arms["gw-r"].memoryMiB, arms.pg.memoryMiB], [30 * 1024, 9 * 1024, 8 * 1024]);
  assert(arms["gw-r"].flags.includes("-Xmx6144m"));
  assert.throws(() => launchProfile("server-32", { ...headline, readTuned: true, readCacheMiB: 3072 }), /96 GB/);
  assert.throws(() => launchProfile("server", { ...headline, readHeapThird: true }), /readHeapThird/);
});
