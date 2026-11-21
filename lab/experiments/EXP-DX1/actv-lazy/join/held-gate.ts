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
const ownerBytes = fs.readFileSync(owned);
const owner = JSON.parse(ownerBytes.toString());
const managed = process.env.DX_ACT1_MANAGED_STACK;
const launch = managed && JSON.parse(fs.readFileSync(managed, "utf8"));
const expectedAttempt = process.env.TX2_WRITE_OPTIONS_ATTEMPT;
assert(owner.volume && owner.container);
if (launch) {
  // [DX-INT1] Why: tie the adopted gate to the specific engine reservation and live startup.
  // Rejected: accepting any endpoint with an ACT1-shaped fixture or borrowing ACT1's holder.
  assert(process.platform === "darwin" && owner.holder === "DX-THIN1");
  assert(owner.mode === "exclusive" && fs.realpathSync(owner.worktree) === process.cwd());
  assert.equal(owner.endpoint, write);
  assert.equal(read, write);
  assert.equal(owner.volume, owner.container + "-data-" + launch.managed.nonce);
  assert.equal(launch.containers[0]?.name, owner.container);
  assert(expectedAttempt);
  assert.equal(expectedAttempt, launch.managed.writeOptionsAttempt);
} else assert(owner.holder === "DX-ACT1");
const attempt = launch ? expectedAttempt! : randomUUID(),
  source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const fixture = path.join(out, "fixture");
fs.mkdirSync(fixture);
seedToy(fixture, randomUUID(), write, source);
const file = path.join(fixture, "fixture.json");
const seed = openScaleSeal(file, hex(fs.readFileSync(file)), true);
const client = new DatomicClient(read);
try {
  await checkAdoptedPeer(client, seed, seed.scope.cut);
  const options = await client.request<{ gatewaySourceHash: string; attempt: string }>(
    "GET",
    "/v1/db/" + seed.scope.db + "/write-options",
  );
  if (launch) {
    assert.equal(options.attempt, attempt);
    assert.equal(options.gatewaySourceHash, launch.gatewaySourceSha256);
  }
  await runHeld(
    out,
    source,
    {
      slot: owner.container,
      attempt,
      write,
      read,
      gatewaySource: options.gatewaySourceHash,
      java: { origin: "managed-laptop", volume: owner.volume, owner: hex(ownerBytes) },
    },
    seed,
    true,
  );
  assert(fs.readFileSync(owned).equals(ownerBytes));
} finally {
  client.close();
}
