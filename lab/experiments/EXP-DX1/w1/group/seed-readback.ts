import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { DatomicClient } from "../../../../../packages/datomic/dist/index.js";
import { SEED_VALID_FROM, type Fact } from "../../../../bench/lib/world.ts";
import { accounts, pooledDigest, tenantRows } from "./population.ts";
import { command } from "./workload.ts";

// [DX-W1] Why: check every persisted assertion against the frozen population at the seed cut after pricing finishes.
// Rejected: treating generated row counts, assigned positions or a few sampled subjects as proof of the entire database.
export async function verifyPopulation(
  url: string,
  r: { scope: string; db: string; phases: { firstPosition: number }[] },
  populationSpec = { accounts, total: 16_245_050, sha256: pooledDigest },
) {
  const c = new DatomicClient(url, 35_000),
    cut = r.phases[0]!.firstPosition - 1,
    population = createHash("sha256");
  let total = 0,
    position = 0;
  try {
    const opened = await c.create(r.scope, "lean", true, 35_000);
    assert(!opened.created && opened.db === r.db && opened.strictRecordClocks);
    for (const a of populationSpec.accounts) {
      let batch: Fact[] = [],
        part = 0;
      const verify = async () => {
        if (!batch.length) return;
        const id = "seed-" + a.index + "-" + part++,
          input = command(id, batch, [], false),
          ack = await c.operation(r.db, id);
        assert.equal(ack.status, "committed");
        assert.equal(ack.operationId, id);
        assert.equal(Number(ack.position?.v), ++position);
        const subjects = [...new Set(batch.map((f) => f.e))],
          tx = input.rows[0]!.tx_id;
        const observed = await c.rows(r.db, {
          entityIds: subjects,
          basis: { recordedPosition: cut, validAt: SEED_VALID_FROM },
          pattern: {},
        });
        const fromTx = observed.filter((row) => row.tx_id === tx);
        assert.equal(fromTx.length, batch.length);
        const byId = new Map(fromTx.map((row) => [row.id, row]));
        assert.equal(byId.size, batch.length);
        for (const row of input.rows) {
          const actual = byId.get(row.id);
          assert.deepEqual(actual, {
            ...row,
            recorded_at: Number(ack.recordedAt?.v),
            recorded_position: position,
          });
        }
        total += batch.length;
        batch = [];
      };
      for (let i = 0; i < a.people; i++) {
        const rows = tenantRows(a, i);
        population.update(JSON.stringify(rows) + "\n");
        if (batch.length + rows.length > 2000) await verify();
        batch.push(...rows);
      }
      await verify();
    }
    assert.equal(position, cut);
    assert.equal(total, populationSpec.total);
    assert.equal(population.digest("hex"), populationSpec.sha256);
    return { facts: total, seedCommits: position, seedCut: cut, digest: populationSpec.sha256 };
  } finally {
    c.close();
  }
}
