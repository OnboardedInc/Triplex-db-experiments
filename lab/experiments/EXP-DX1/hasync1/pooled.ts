import assert from "node:assert/strict";
import { SEED_VALID_FROM, ids } from "../../../bench/lib/world.ts";
import { keyFor, tenantCatalog, tenantRows } from "../scale1/tenants.ts";
import { hash, type Evidence } from "../ha1/common.ts";
import { immutable, type Account, type Receipt } from "../ha1/one-db.ts";
import type { DatomicClient } from "../../../../packages/datomic/test/ha1-account.ts";
import { auditSeed } from "./seed.ts";
import { deepRow } from "./v2/history.ts";
import type { Checkpoint } from "./seed.ts";

export const pooledAccounts = 10;
type Basis = Awaited<ReturnType<DatomicClient["basis"]>>;

export type PooledProof = {
  database: string;
  people: number;
  facts: number;
  basis: Basis;
  receipts: Receipt[];
};

export function poolAt(
  ac: Account,
  proof: Omit<PooledProof, "database"> | Checkpoint,
): PooledProof {
  return {
    database: ac.db,
    people: proof.people,
    facts: proof.facts,
    basis: proof.basis,
    receipts: proof.receipts,
  };
}

export async function seedPooled(e: Evidence, ac: Account, people: number): Promise<PooledProof> {
  assert(people >= pooledAccounts && people % pooledAccounts === 0);
  const receipts = [];
  let facts = 0;
  const width = people / pooledAccounts;
  for (let index = 0; index < pooledAccounts; index++) {
    const account = { index, first: index * width, people: width, key: keyFor(index) };
    for (let n = 0; n < width; n++) {
      const op = `${ac.key}-pooled-${index}-${n}`;
      const tx = op + "/tx";
      const stamp = 500000 + index * width + n;
      const rows = tenantRows(account, n).map((f, i) => deepRow(f, op + "/" + i, tx, stamp, ""));
      const receipt = immutable(
        await ac.w.transact(ac.db, {
          operationId: op,
          attemptId: op + "/first",
          sourceK: null,
          scopeWide: false,
          assignRecordTime: false,
          position: 1,
          span: 1,
          rows,
          newIds: rows.map((row) => row.id),
          claims: [{ commandId: op + "/claim", txId: tx, timestamp: stamp }],
        }),
      );
      assert.equal(receipt.operationId, op);
      assert.equal(receipt.recordedAt.v, stamp);
      facts += rows.length;
      receipts.push(receipt);
    }
  }
  const basis = await ac.w.basis(ac.db);
  ac.cursor = String(BigInt(basis.t.v) + 1n);
  const proof = { database: ac.db, people, facts, basis, receipts };
  await auditPool(e, ac, proof, "seed", ac.w);
  return proof;
}

export function pooledRead(proof: PooledProof) {
  assert.equal(proof.people % pooledAccounts, 0);
  return (ordinal: number) => {
    const index = ordinal % pooledAccounts;
    const subject = (proof.people / pooledAccounts) * index;
    const entity = ids.placement(subject);
    const values = [keyFor(index)];
    const pin = {
      basisT: proof.basis.t.v,
      basis: { recordedPosition: Number(proof.basis.position.v), validAt: SEED_VALID_FROM },
    };
    return {
      identity: {
        subject,
        t: proof.basis.t.v,
        sha256: hash(JSON.stringify([entity, values, pin])),
      },
      async query(client: DatomicClient) {
        const rows = await client.rows(proof.database, { entityIds: [entity], ...pin });
        assert.deepEqual(
          rows
            .filter((row) => row.attribute === ":subject/account")
            .map((row) => [row.entity_id, row.value_type, row.value_string]),
          [[entity, "string", values[0]]],
        );
      },
    };
  };
}

export async function auditPool(
  e: Evidence,
  ac: Account,
  proof: PooledProof,
  stage: string,
  client = ac.r,
) {
  assert.equal(proof.database, ac.db);
  assert.equal(proof.basis.t.t, "long");
  assert.equal(proof.basis.position.t, "long");
  const rows = await client.rows(ac.db, {
    entityIds: [tenantCatalog],
    basisT: proof.basis.t.v,
    basis: { recordedPosition: Number(proof.basis.position.v), validAt: SEED_VALID_FROM },
  });
  const accounts = Array.from({ length: pooledAccounts }, (_, n) => keyFor(n));
  assert.deepEqual(
    rows
      .filter((row) => row.attribute === ":tenant/account")
      .map((row) => row.value_string)
      .sort(),
    accounts,
  );
  const sample = accounts.map((_, i) => pooledRead(proof)(i));
  await Promise.all(sample.map(({ query }) => query(client)));
  const receipts = await auditSeed(ac, proof.receipts, client);
  // [DX-HASYNC1] Why: prove all ten account memberships on one native database at the same original cut. Rejected: inferring shared placement from an engine count or subject prefixes.
  e.write("pooled-" + stage, {
    nonce: e.nonce,
    slot: e.slot,
    source: e.source,
    ...proof,
    accounts,
    sample: sample.map(({ identity }) => identity),
    checkedReceipts: receipts,
  });
}
