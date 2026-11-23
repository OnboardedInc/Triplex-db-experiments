import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { seedToy } from "../actv-lazy/join/held-campaign.ts";
import { until } from "../ha1/common.ts";
import type { Stack } from "../ha1/stack.ts";
import { hex, openScaleSeal } from "../v01/adopt.ts";
import { runFair } from "./fair-campaign.ts";

export async function fairLocal(stack: Stack) {
  const { e, a, b } = stack;
  // [DX-LOAD2] Why: the yield gate needs live saves that actually wait for a credit beside the import.
  // Rejected: the 9 saves/s toy tape, where the live queue is almost never non-empty, and 120/s, which
  // saturated the Mac stack so the importer yielded nearly always (3 frames in 6 s).
  const policy = process.env.DX_LOAD2_IMPORT_POLICY ?? "fair";
  assert(policy === "fair" || policy === "yield");
  const toyBusy = Number(process.env.DX_LOAD2_TOY_BUSY ?? (policy === "yield" ? "20" : "9"));
  const memoryIndex = process.env.DX_LOAD2_MEMORY_INDEX;
  assert(memoryIndex === undefined || (policy === "yield" && /^[0-9]+m,[0-9]+m$/.test(memoryIndex)));
  assert(process.platform === "darwin" && a === b);
  assert.equal(process.env.TRIPLEX_DATOMIC_FAST_PATHS, "save-wire");
  await stack.tool();
  await stack.postgres("pg", a);
  await stack.database("pg", "moving");
  assert.equal(
    await stack.sql("pg", "SHOW synchronous_commit; SHOW fsync; SHOW full_page_writes", "moving"),
    "on\non\non",
  );
  await stack.tx("active", a, "pg", "moving");
  await until("ordered writer", async () => (await stack.broker("active")) || undefined);
  await stack.gateway("write", a, "pg", "moving");
  await stack.gateway("read", a, "pg", "moving");
  const [write, read] = await Promise.all([stack.ready("write"), stack.ready("read")]);
  const fixture = path.join(e.dir, "fixture");
  fs.mkdirSync(fixture);
  seedToy(fixture, randomUUID(), write, e.source.git);
  const file = path.join(fixture, "fixture.json");
  const seed = openScaleSeal(file, hex(fs.readFileSync(file)), true);
  // [DX-ACT3] Why: the held Publish campaign (with or without DX_ACT3_RELEASE) at toy size on this same stack.
  // Rejected: a second Mac stack recipe for the same toy seed.
  if (process.env.DX_ACT3_HELD === "1") {
    const { runHeld } = await import("../actv-lazy/join/held-campaign.ts");
    const peer = { slot: e.slot, attempt: e.nonce, write, read, gatewaySource: e.source.gateway,
      java: { origin: "managed-laptop" } };
    await runHeld(e.dir, e.source.git, peer, seed, true);
    return { held: true, release: process.env.DX_ACT3_RELEASE ?? null };
  }
  return runFair(
    e.dir,
    e.source.git,
    {
      slot: e.slot,
      attempt: e.nonce,
      write,
      read,
      gatewaySource: e.source.gateway,
      java: { origin: "managed-laptop" },
    },
    seed,
    "rolling6",
    memoryIndex ? [32] : policy === "yield" ? [32, 40] : 32,
    2,
    true,
    policy,
    toyBusy,
    memoryIndex ? "-mi" + memoryIndex.split(",")[0] : "",
  );
}
