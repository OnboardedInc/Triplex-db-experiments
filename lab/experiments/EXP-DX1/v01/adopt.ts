import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { fieldValue } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { accounts, field, keyFor, root, sha, task, width } from "../scale1/decision/plan.ts";
import type { Scope } from "../scale1/decision/observer.ts";

export const hex = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
const digest = /^[a-f0-9]{64}$/;
const population = "346b8a8f77c1d6374deb7ad140a447d084cfff223a5982f6918f3b4608a97e7e";
type Image = {
  source: string; slot: string; nonce: string; people: number; facts: number; population: string;
  layout: string; verification: string; scopes: Scope[]; bytes: number; sha256: string;
  proofs: { cursor: number; facts: number; cut: number; observed: number; sourceSeal: string }[];
};
export type AdoptedSeed = ReturnType<typeof openScaleSeal>;
export const scopeKey = (name: string) => JSON.stringify(["triplex-scope-v1", "test", "test", name, 0]);

export function readScaleSeal(file: string, pin: string, toy = false, transferPin?: string) {
  const bytes = fs.readFileSync(file);
  assert.match(pin, digest);
  assert.equal(hex(bytes), pin, "SCALE1 image digest differs");
  const image: Image = JSON.parse(bytes.toString());
  assert.equal(image.layout, "pooled");
  assert.equal(image.verification, "full-command-and-feed-with-pinned-member-probes");
  assert.match(image.source, /^[a-f0-9]{40}$/);
  assert.match(image.nonce, /^[a-f0-9-]{36}$/);
  assert(image.slot);
  assert.equal(image.scopes.length, 1);
  assert.equal(image.proofs.length, 1);
  const [scope] = image.scopes as [Scope];
  const [proof] = image.proofs as [Image["proofs"][number]];
  assert.deepEqual(scope.accounts, accounts);
  assert.equal(scope.name, "dx-scale-decision-" + image.nonce + "-0");
  const key = scopeKey(scope.name);
  assert.equal(scope.db, "s2-" + Buffer.from(key).toString("base64url"));
  assert(Number.isSafeInteger(scope.cut) && scope.cut > 1);
  assert.equal(new Set([scope.cut, scope.seedCut, proof.cut, proof.observed + 1]).size, 1);
  assert.match(image.population, digest);
  assert.equal(proof.sourceSeal, sha(["deep-field-decision/1", image.population, image.people, accounts, width]));
  assert.deepEqual([proof.facts, proof.cursor], [image.facts, image.people * accounts.length]);
  const dump = path.join(path.dirname(file), "seed.pgdump");
  if (toy) {
    assert(Number.isSafeInteger(image.people) && image.people >= 2 && image.people <= 32 && image.facts > 0);
  } else {
    assert.deepEqual([image.people, image.facts, image.population, scope.cut], [100_000, 162_456_470, population, 87002]);
    // [DX-V01] Why: carry the original SCALE1 transfer and image bytes as separate pins.
    // Rejected: accepting a replacement manifest from the same directory based on its fact count.
    assert(transferPin && digest.test(transferPin));
    const transferBytes = fs.readFileSync(path.join(path.dirname(file), "transfer.json"));
    assert.equal(hex(transferBytes), transferPin);
    const transfer = JSON.parse(transferBytes.toString());
    assert.deepEqual([transfer.source, transfer.nonce, transfer.result, transfer.summaryFiles["image.json"]],
      [image.source, image.nonce, "success", pin]);
    assert.equal(path.basename(path.dirname(file)), transfer.tag);
    assert.match(image.sha256, digest);
    assert(Number.isSafeInteger(image.bytes) && image.bytes > 0);
  }
  return { image, scope, proof, key, pin, dump, transferPin };
}

export function openScaleSeal(file: string, pin: string, toy = false, transferPin?: string) {
  const seed = readScaleSeal(file, pin, toy, transferPin);
  if (!toy) assert.equal(fs.statSync(seed.dump).size, seed.image.bytes);
  return seed;
}

export async function checkAdoptedPeer(client: DatomicClient, seed: AdoptedSeed, expectedHead: number) {
  const { scope, image, proof } = seed;
  const at = await client.begin(scope.db);
  try { assert.equal(at.position, expectedHead, "Restored logical head differs"); }
  finally { await client.release(scope.db, at.handle); }
  const named = scopeKey(scope.name);
  const opened = await client.create(named, "lean", true, 35000);
  assert(!opened.created && opened.strictRecordClocks && opened.db === scope.db);
  const prefix = "load1/" + sha([scope.name, proof.sourceSeal, width]) + "/";
  // The loader sequence is a group cursor, so obtain its command from the original durable journal.
  const result = await client.request<{ transactions: [string, number, string[]][] }>(
    "POST", "/v2/db/" + scope.db + "/transactions", { after: scope.cut - 1, limit: 1 });
  const [last] = result.transactions;
  assert(last && result.transactions.length === 1, "Missing original terminal transaction");
  const [tx, position, encoded] = last;
  assert.equal(position, scope.cut);
  const terminal = encoded.map(decodeRowText).find((row) => row.attribute === ":_tx/command-id")?.value_string;
  assert(typeof terminal === "string" && terminal.startsWith(prefix));
  assert.match(terminal.split("/").at(-1)!, /^[0-9]+$/);
  assert.equal(await client.claim(scope.db, terminal, scope.cut), tx);
  const manifest = "load1/manifest/" + hex("acct/");
  assert(await client.claim(scope.db, manifest, 1), "Original loader manifest receipt is absent");
  const positions = [...new Set([0, Math.min(79, image.people - 1), image.people - 1])];
  const members = accounts.flatMap((a) => positions.map((i) => ({ a, i, id: root(a, i), owner: task(a, i) })));
  const basis = { recordedPosition: scope.cut, validAt: SEED_VALID_FROM };
  const rows = await client.rows(scope.db, { entityIds: members.map((m) => m.id), basis });
  for (const m of members) {
    const own = rows.filter((r) => r.entity_id === m.id);
    assert.deepEqual(own.filter((r) => r.attribute === ":subject/account").map((r) => r.value_string), [keyFor(m.a)]);
    assert.deepEqual(own.filter((r) => r.attribute === ":subject/member").map((r) => r.value_string), [String(m.i)]);
  }
  const fields = await client.rows(scope.db, { entityIds: members.map((m) => m.owner), basis });
  for (const { owner, i } of members) for (const n of [0, 1, 2]) {
    const found = fields.filter((row) => row.entity_id === owner && row.attribute === field(n));
    assert.equal(found.length, 1);
    const [r] = found;
    assert.equal(r?.value_string, fieldValue(i, 0, n, 0).value);
    assert(r.recorded_position > 0 && r.recorded_position <= scope.cut && Number.isFinite(r.recorded_at) && r.id);
  }
  return { head: at.position, database: scope.db, originalCut: scope.cut, checkedMembers: members.length,
    checkedFields: 3 * members.length, terminal, manifest, imageSha256: seed.pin };
}
