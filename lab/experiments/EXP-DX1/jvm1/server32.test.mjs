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
  assert.throws(() => launchProfile("server-32", { ...headline, readTuned: true }));
  assert.throws(() => launchProfile("server-32", { ...headline, txJvm: "j21-g1" }), /ZGC/);
});

test("the server profile stays the default until the owner switches it", () => {
  assert.equal(defaultServerProfile, "server");
  assert.deepEqual(launchProfile("server", headline).tx.flags.filter((f) => /^-Xmx|^-Ddatomic.objectCacheMax/.test(f)),
    ["-Xmx24576m", "-Ddatomic.objectCacheMax=16384m"]);
});
