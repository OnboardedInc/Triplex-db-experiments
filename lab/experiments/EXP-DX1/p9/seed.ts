import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { hash } from "../ha1/common.ts";
import type { Checkpoint } from "../hasync1/seed.ts";
import { accounts, people, type Age } from "./score.ts";

export type PooledCheckpoint = Checkpoint & { scope: string };
export type SeedSeal = {
  format: "triplex-p9-seed/1";
  age: Age;
  source: string;
  accounts: number;
  records: number;
  originSha256: string;
  checkpoint: PooledCheckpoint;
};

export function seedDirectory(base: string, age: Age) {
  return path.join(base, "p9-seeds", age);
}

export function decodeSeed(raw: string, sha256: string, age: Age, source: string) {
  assert.match(sha256, /^[0-9a-f]{64}$/);
  assert.equal(hash(raw), sha256);
  const seed = JSON.parse(raw) as SeedSeal;
  const { checkpoint: cp } = seed;
  assert.equal(seed.format, "triplex-p9-seed/1");
  assert.equal(seed.age, age);
  assert.equal(seed.source, source);
  assert.equal(seed.accounts, accounts);
  assert.match(seed.originSha256, /^[0-9a-f]{64}$/);
  assert.equal(cp.people, people);
  assert(Number.isSafeInteger(cp.facts) && cp.facts >= 162_456_470);
  assert(Number.isSafeInteger(seed.records) && seed.records >= cp.facts);
  if (age === "1B") assert(seed.records >= 1_000_000_000);
  else assert(seed.records < 1_000_000_000);
  assert.equal(cp.layout, "legacy");
  assert.equal(cp.history, undefined);
  assert.match(cp.key, /^[a-zA-Z0-9-]+$/);
  assert.match(cp.manifest, /^[0-9a-f]{64}$/);
  assert.match(cp.cluster, /^\d+$/);
  assert(Number.isSafeInteger(cp.bytes) && cp.bytes > 0);
  const scope = JSON.parse(cp.scope);
  assert.equal(JSON.stringify(scope), cp.scope);
  assert.equal(scope.length, 5);
  assert.equal(scope[0], "triplex-scope-v1");
  assert.deepEqual(scope, ["triplex-scope-v1", "test", "test", cp.key, 0]);
  assert.equal(cp.basis.t.t, "long");
  assert.equal(cp.basis.position.t, "long");
  assert(BigInt(cp.basis.t.v) > 0 && BigInt(cp.basis.position.v) > 0);
  assert(cp.receipts.length >= accounts);
  assert.equal(new Set(cp.receipts.map((r) => r.operationId)).size, cp.receipts.length);
  assert(
    cp.receipts.every(
      (r) => r.position.t === "long" && BigInt(r.position.v) <= BigInt(cp.basis.position.v),
    ),
  );
  assert.equal(cp.seal, hash(JSON.stringify({ receipts: cp.receipts, history: null })));
  return seed;
}

export function readSeed(directory: string, sha256: string, age: Age, source: string) {
  const raw = fs.readFileSync(path.join(directory, "p9-seed.json"), "utf8");
  const seed = decodeSeed(raw, sha256, age, source);
  const credentials = JSON.parse(
    fs.readFileSync(path.join(directory, "storage-credentials.json"), "utf8"),
  ) as { secret: string; admin: string };
  for (const value of [credentials.secret, credentials.admin])
    assert(
      typeof value === "string" && /^[0-9a-f]{36}$/.test(value),
      "Invalid storage credential format",
    );
  return { raw, seed, credentials };
}
