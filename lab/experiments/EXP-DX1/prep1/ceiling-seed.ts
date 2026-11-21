import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { DatomicClient } from "../../../../packages/datomic/dist/index.js";
import { decodeRowText } from "../../../../packages/datomic/dist/rowText.js";
import { fieldValue, taskId } from "../../../bench/lib/deep-world.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";
import { sha } from "../w1/field/schedule.ts";

type Row = Parameters<DatomicClient["transact"]>[1]["rows"][number];
type ScaleSeed = {
  scope: string;
  db: string;
  head: number;
  facts: number;
  imageSha256: string;
  transferSha256: string;
  dumpSha256: string;
  loaderSeal: string;
};
export const scaleAccount = (a: number) => "account-" + String(a + 1).padStart(3, "0");
export const scaleOwner = (a: number, i: number) => "acct/" + scaleAccount(a) + "/" + taskId(i, 0);
export const scaleFields = [":task/field-0", ":task/field-1"] as const;

// [DX-PREP1] Why: adopt the held SCALE1 loader's actual bytes and cut.
// Rejected: treating a matching fact count or the old small campaign's seal as the full-size seed.
export function scaleSeed(dir: string, imagePin: string, transferPin: string): ScaleSeed {
  function pinned(name: string, expected: string) {
    assert.match(expected, /^[0-9a-f]{64}$/);
    const bytes = readFileSync(path.join(dir, name));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
    return JSON.parse(bytes.toString());
  }
  const image = pinned("image.json", imagePin);
  const transfer = pinned("transfer.json", transferPin);
  assert.deepEqual(
    [
      transfer.source,
      transfer.nonce,
      transfer.result,
      transfer.summaryFiles["image.json"],
      transfer.tag,
    ],
    [image.source, image.nonce, "success", imagePin, path.basename(dir)],
  );
  assert.match(image.source, /^[0-9a-f]{40}$/);
  assert.match(image.nonce, /^[0-9a-f-]{36}$/);
  assert.deepEqual(
    [image.layout, image.verification, image.people, image.facts],
    ["pooled", "full-command-and-feed-with-pinned-member-probes", 100_000, 162_456_470],
  );
  assert.equal(
    image.population,
    "346b8a8f77c1d6374deb7ad140a447d084cfff223a5982f6918f3b4608a97e7e",
  );
  const [scope] = image.scopes;
  const [proof] = image.proofs;
  assert.equal(image.scopes.length, 1);
  assert.equal(image.proofs.length, 1);
  const roster = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(scope.accounts, roster);
  assert.equal(scope.name, "dx-scale-decision-" + image.nonce + "-0");
  const key = JSON.stringify(["triplex-scope-v1", "test", "test", scope.name, 0]);
  assert.equal(scope.db, "s2-" + Buffer.from(key).toString("base64url"));
  const loaderSeal = sha(["deep-field-decision/1", image.population, image.people, roster, 2000]);
  assert.deepEqual(
    [
      scope.cut,
      scope.seedCut,
      proof.cut,
      proof.observed,
      proof.facts,
      proof.cursor,
      proof.sourceSeal,
    ],
    [87002, 87002, 87002, 87001, image.facts, 1_000_000, loaderSeal],
  );
  assert.match(image.sha256, /^[0-9a-f]{64}$/);
  assert(image.bytes > 0 && statSync(path.join(dir, "seed.pgdump")).size === image.bytes);
  return {
    scope: key,
    db: scope.db,
    head: scope.cut,
    facts: image.facts,
    imageSha256: imagePin,
    transferSha256: transferPin,
    dumpSha256: image.sha256,
    loaderSeal,
  };
}

export async function scalePredecessors(
  reader: DatomicClient,
  seed: ScaleSeed,
  targets: readonly { account: number; person: number }[],
) {
  const result = await reader.request<{ transactions: [string, number, string[]][] }>(
    "POST",
    "/v2/db/" + seed.db + "/transactions",
    { after: seed.head - 1, limit: 1 },
  );
  const entry = result.transactions[0];
  assert(entry && result.transactions.length === 1);
  const [id, position, text] = entry;
  assert.equal(position, seed.head);
  const command = text
    .map(decodeRowText)
    .find((r) => r.attribute === ":_tx/command-id")?.value_string;
  const prefix = "load1/" + sha([JSON.parse(seed.scope)[3], seed.loaderSeal, 2000]) + "/";
  assert(
    typeof command === "string" &&
      command.startsWith(prefix) &&
      /^[0-9]+$/.test(command.slice(prefix.length)),
  );
  assert.equal(await reader.claim(seed.db, command, seed.head), id);

  const fields = new Map<string, Row[]>();
  const owners = [
    ...new Map(targets.map(({ account, person }) => [scaleOwner(account, person), person])),
  ];
  const basis = { recordedPosition: seed.head, validAt: SEED_VALID_FROM };
  // Use the read peer's cache for the immutable predecessors. The writer and transactor still see the wide tape.
  for (let i = 0; i < owners.length; i += 96) {
    const batch = owners.slice(i, i + 96);
    const byEntity = new Map<string, Row[]>();
    for (const attribute of scaleFields) {
      const rows = await reader.rows(seed.db, {
        entityIds: batch.map(([e]) => e),
        pattern: { attribute },
        basis,
      });
      for (const row of rows) {
        const prior = byEntity.get(row.entity_id) ?? [];
        prior.push(row);
        byEntity.set(row.entity_id, prior);
      }
    }
    for (const [e, person] of batch) {
      const prior = byEntity.get(e);
      assert(prior && prior.length === scaleFields.length);
      for (const [n, a] of scaleFields.entries()) {
        const row: Row = prior[n]!;
        assert.equal(row.attribute, a);
        assert.equal(row.value_string, fieldValue(person, 0, n, 0).value);
        assert(row.id && row.recorded_position > 0 && row.recorded_position <= seed.head);
      }
      fields.set(e, prior);
    }
  }
  return fields;
}
