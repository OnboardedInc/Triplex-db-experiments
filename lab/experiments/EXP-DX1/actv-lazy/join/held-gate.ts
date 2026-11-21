import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { checkAdoptedPeer, hex, openScaleSeal } from "../../v01/adopt.ts";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { runHeld, seedToy } from "./held-campaign.ts";

const [out] = process.argv.slice(2);
assert(out && process.env.DX_ACT1_NATIVE === "1" && !process.env.DX_JOIN_LEASE_TOKEN);
const owned = process.env.TRIPLEX_LAB_SLOT_OWNER!,
  write = process.env.DATOMIC_URL!,
  read = process.env.DATOMIC_READ_URLS!;
assert(owned && write && read);
const owner = JSON.parse(fs.readFileSync(owned, "utf8"));
assert(owner.holder === "DX-ACT1" && owner.volume && owner.container);
const attempt = randomUUID(),
  source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const fixture = path.join(out, "fixture");
fs.mkdirSync(fixture);
seedToy(fixture, randomUUID(), write, source);
const file = path.join(fixture, "fixture.json");
const seed = openScaleSeal(file, hex(fs.readFileSync(file)), true);
const client = new DatomicClient(read);
try {
  await checkAdoptedPeer(client, seed, seed.scope.cut);
  const options = await client.request<{ gatewaySourceHash: string }>(
    "GET",
    "/v1/db/" + seed.scope.db + "/write-options",
  );
  await runHeld(
    out,
    source,
    {
      slot: owner.container,
      attempt,
      write,
      read,
      gatewaySource: options.gatewaySourceHash,
      java: { origin: "managed-laptop", volume: owner.volume, owner: hex(fs.readFileSync(owned)) },
    },
    seed,
    true,
  );
} finally {
  client.close();
}
