import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { Histogram } from "../../../bench/lib/hist.ts";
import { memberOf, SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { checkRealisticPeer, load, readPerson } from "../real1/load.ts";
import { namespace, facts, subject, type Account } from "../real1/population.ts";
import { fileHash, openRealisticSeal, verifyPgdata, write, type Image, type Parent } from "../real1/seal.ts";
import { field, task, type Write } from "../scale1/decision/plan.ts";
import { now } from "../scale1/decision/observer.ts";
import { hex, openScaleSeal, scopeKey, type AdoptedSeed } from "./adopt.ts";
import type { Residency } from "./adopted.ts";
import { realPin, sweepSize, thinLimit } from "./realistic-plan.ts";

export const binding = (image: Image, imagePin: string, transferPin: string) => ({
  imagePin, transferPin, parent: image.parent, cut: image.proof.cut, profile: image.profile,
  seedSource: image.source, seedSlot: image.slot, pgdata: image.pgdata, census: image.census,
  rosterSha: hex(JSON.stringify(image.accounts)), terminal: image.proof.terminal,
});
export type RealisticBinding = ReturnType<typeof binding>;

export async function realSeed(dir: string, pin: string, transfer: string, source: string, copies: string[]) {
  const image = openRealisticSeal(dir, pin, transfer);
  assert.equal(image.source, realPin, "Expected the pinned REAL1 physical producer");
  assert.equal(await fileHash(path.join(dir, "extension-ledger.sqlite")), image.proof.ledgerSha);
  for (const pgdata of [source, ...copies]) await verifyPgdata(pgdata, image);
  const parent = openScaleSeal(path.join(dir, "parent", image.parent.tag, "image.json"), image.parent.imageSha,
    false, image.parent.transferSha, false);
  return { ...parent, realistic: image, realisticBinding: binding(image, pin, transfer) };
}

export async function proveRealistic(url: string, image: Image, container: string) {
  const client = new DatomicClient(url, 35000);
  try {
    assert.match(image.parent.db, /^s2-[A-Za-z0-9_-]+$/);
    await checkRealisticPeer(client, image, false);
    const raw = execFileSync("docker", ["exec", "-i", "-e", "DATOMIC_JAVA_OPTS=-Xms128m -Xmx512m -XX:+UseSerialGC",
      container, "/opt/datomic/bin/run", "/dev/stdin"], { encoding: "utf8", timeout: 120_000, input: `
(require '[datomic.api :as d] '[triplex.gateway.main :as g] '[triplex.gateway.storage :as s])
(let [conn (d/connect (g/db-uri "${image.parent.db}")) view (d/db conn)]
  (println "DX_REAL1_CENSUS" (s/head-position view) (d/basis-t view) (:datoms (d/db-stats view))))
(shutdown-agents)
(System/exit 0)` });
    const match = /^DX_REAL1_CENSUS (\d+) (\d+) (\d+)$/m.exec(raw);
    assert(match, "Missing native REAL1 census");
    const observed = match.slice(1).map(Number);
    assert.deepEqual(observed, [image.census.head, image.census.nativeT, image.census.nativeRecords]);
    return observed;
  } finally { client.close(); }
}

export async function toyRealSeed(dir: string, nonce: string, slot: string, revision: string, url: string): Promise<AdoptedSeed> {
  const scope = "dx-real1-toy-" + nonce, key = scopeKey(scope), db = "s2-" + Buffer.from(key).toString("base64url");
  const parent: Parent = { tag: "toy-parent", imageSha: hex(key), transferSha: hex(nonce),
    pgdataSha: hex("toy"), scope, db, cut: 0, facts: 0, people: 500 };
  let original: AdoptedSeed["proof"] | undefined;
  fs.mkdirSync(dir);
  const proof = await load(parent, "toy", revision, url, dir, () => {
    const disk = fs.statfsSync(dir);
    assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3);
  }, p => { original = p; });
  assert(original);
  const { roster } = await import("../real1/population.ts");
  const accounts = roster("toy"), image: Image = {
    format: "scale1-realistic-pgdata/1", source: revision, slot, nonce, profile: "toy", layout: "pooled",
    verification: "extension-commands-feed-and-pinned-members", parent, accounts,
    census: { head: proof.cut, nativeT: 0, nativeRecords: 0, sqlBytes: 0 },
    people: parent.people + proof.cursor, facts: parent.facts + proof.facts, pgdata: null, proof,
    scopes: [{ name: scope, db, seedCut: proof.cut, cut: proof.cut, accounts: accounts.map(a => a.id) }],
  };
  write(path.join(dir, "image.json"), image);
  const imagePin = await fileHash(path.join(dir, "image.json"));
  write(path.join(dir, "transfer.json"), { source: revision, nonce, slot, tag: path.basename(dir),
    result: "success", summaryFiles: { "image.json": imagePin } });
  const transferPin = await fileHash(path.join(dir, "transfer.json"));
  openRealisticSeal(dir, imagePin, transferPin, true);
  const reader = new DatomicClient(url, 35000);
  try { await checkRealisticPeer(reader, image, false); } finally { reader.close(); }
  return {
    scope: { name: scope, db, cut: parent.cut, seedCut: parent.cut, accounts: accounts.slice(0, 10).map(a => a.id) },
    image: { people: 50 } as AdoptedSeed["image"], proof: original, key, pin: parent.imageSha, dump: "",
    transferPin: parent.transferSha, realistic: image, realisticBinding: binding(image, imagePin, transferPin),
  };
}

export function realisticOwner(account: Account, person: number) {
  return account.kind === "thin" ? subject(account, person) + "/ans:0" :
    account.kind === "small" ? namespace + task(account.id, person).slice("acct/".length) : task(account.id, person);
}
export function ownerFields(account: Account | undefined) {
  return account?.kind === "thin" ? ["value"] : [0, 1, 2].map(field);
}
export const withOwners = (image: Image, tape: Write[]) => tape.map(item =>
  ({ ...item, owner: realisticOwner(image.accounts[item.account]!, item.subject) }));

export async function checkRealisticField(client: DatomicClient, seed: AdoptedSeed, account: Account, person: number) {
  const owner = realisticOwner(account, person), attribute = ownerFields(account)[0]!;
  const rows = await client.rows(seed.scope.db, { entityIds: [owner], pattern: { attribute },
    basis: { recordedPosition: seed.realistic!.proof.cut, validAt: SEED_VALID_FROM } });
  assert.equal(rows.length, 1);
  const r = rows[0]!;
  assert.deepEqual([r.entity_id, r.attribute, r.value_string], [owner, attribute,
    account.kind === "thin" ? "source-key-" + person : fieldValue(person, 0, 0, 0).value]);
  assert(r.recorded_position <= seed.realistic!.proof.cut);
}

export async function thinSweep(client: DatomicClient, seed: AdoptedSeed, residency: () => Residency | Promise<Residency>) {
  const image = seed.realistic!, thin = image.accounts[10]!, cut = image.proof.cut;
  const start = thinLimit(thin, image.profile), n = sweepSize(image.profile);
  const before = { at: now(), roles: await residency() };
  const duration = new Histogram();
  for (let i = start; i < start + n; i++) {
    const at = now();
    const rows = await readPerson(client, seed.key, thin, i, cut);
    const elapsed = now() - at;
    assert.deepEqual(rows.map(r => memberOf(r.entityId, r.attribute, r.value)).sort(),
      facts(thin, i).map(r => memberOf(r.e, r.a, r.v)).sort());
    duration.recordMs(elapsed);
  }
  const after = { roles: await residency(), at: now() };
  return { cut, start, n, thin: thin.people, before, after, read: duration.summary() };
}
