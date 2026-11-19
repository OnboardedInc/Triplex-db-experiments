import assert from "node:assert/strict";
import { Option } from "effect";
import {
  DatomicClient,
  Replica,
  datomicReplicaSource,
} from "../../../../packages/datomic/dist/index.js";
import { decodeReplicaRows } from "../../../../packages/datomic/dist/replica/decodeRows.js";
import { openComposition, type Receipt, type PullResult } from "../../../bench/lib/composition.ts";
import { publicRow } from "../../../bench/lib/replica-reads.ts";
import { runtimeApi } from "../../../bench/lib/triplex.ts";
import { W0, worldOf } from "../../../bench/lib/w0-world.ts";
import type { ImportJournal } from "../../../bench/lib/thin-activation.ts";
import {
  clock,
  firstValid,
  fixture,
  fixtureRows,
  intent,
  person,
  seedHead,
  txId,
} from "./population.ts";

export type Operation = ReturnType<typeof intent>[number];
export async function trialStore(size: number, scope: string, live: boolean) {
  if (live) {
    const base = await openComposition("reach", "datomic", scope);
    const endpoint = process.env.DATOMIC_READ_URLS!.split(",")[0]!;
    const client = new DatomicClient(endpoint);
    const opened = await client.create(runtimeApi.DatabaseScope.test(scope), "lean", false, 35_000);
    const inline = Replica.source(
      client,
      opened.db,
      () => base.currentPosition(),
      firstValid + 1000,
    );
    const lean = {
      ...datomicReplicaSource(client, opened.db, () => base.currentPosition()),
      capability: inline.capability!,
    };
    assert.equal(await base.currentPosition(), 0, "Fresh scope required");
    return {
      source: lean,
      inline,
      async commit(p: number, _indices: number[], _updated: boolean, ops: Operation[]) {
        const result = await base.transact(ops, { actor: "import", commandId: scope + "-" + p });
        if (!result.ok) throw Error("Commit failed: " + result.tag);
        assert.equal(result.value.position, p);
        return result.value;
      },
      async feed(after: number, limit: number) {
        return (await base.feedPage(after, limit)).transactions as ImportJournal[];
      },
      pull: (root: string, p: number, validAt: number) =>
        base.pull(root, { recordedPosition: p, validAt } as Parameters<typeof base.pull>[1]),
      async world(root: string, basis: W0.Basis) {
        const requested = { position: basis.tx, validAt: Date.parse(basis.validTime) };
        const page = await base.sweepPage([root], requested);
        assert.deepEqual(page.reportedBasis, requested);
        return worldOf(root, page.rows);
      },
      async publish(records: readonly W0.EvaluationRecord[]) {
        await base.publishOutbox(records);
      },
      async close() {
        client.close();
        await base.close();
      },
    };
  }
  const data = fixture(size),
    base = seedHead(size);
  let published = 0;
  const observed = (p: number, indices: number[], updated: boolean) =>
    indices.flatMap((i) => fixtureRows(i, p, updated));
  return {
    source: data.source,
    inline: data.source,
    async commit(
      p: number,
      indices: number[],
      updated: boolean,
      _ops: Operation[],
    ): Promise<Receipt> {
      assert.equal(p, ++published);
      if (updated) data.writes(p - base);
      return {
        position: p,
        instant: clock(p),
        txId: txId(p),
        triples: observed(p, indices, updated),
      };
    },
    async feed(after: number, limit: number): Promise<ImportJournal[]> {
      const { batchSize } = await import("./population.ts");
      return Array.from({ length: Math.min(limit, published - after) }, (_, n) => {
        const p = after + n + 1,
          first = (p - 1) * batchSize;
        const indices =
          p > base
            ? [(p - base - 1) * 50]
            : Array.from({ length: Math.min(batchSize, size - first) }, (_, i) => i + first);
        return {
          position: p,
          txId: txId(p),
          instant: clock(p),
          commandId: scope + "-" + p,
          changes: observed(p, indices, p > base).map((r) => ({
            op: r.op,
            entityId: r.entityId,
            attribute: r.attribute,
            value: r.value,
            tripleId: r.id,
            validFrom: r.validFrom,
            recordedAt: r.publicMetadata.recordedAt,
            assertionTxId: r.publicMetadata.txId,
          })),
        };
      });
    },
    async pull(root: string, p: number, validAt: number): Promise<PullResult> {
      const page = await data.source.page([root], { recordedPosition: p, validAt });
      const triples = page.entities.flatMap((entry) => {
        const [id, rev, wire] = entry as [string, number, string[]];
        return decodeReplicaRows(id, rev, wire, p)
          .map(publicRow)
          .filter(
            (r) =>
              r.validFrom! <= validAt && (Option.isNone(r.validTo) || validAt < r.validTo.value),
          );
      });
      return {
        triples,
        entities: page.entities.length,
        depth: page.entities.length > 1 ? 1 : 0,
        roundTrips: 1,
        route: "source",
        language: "fixture",
        waitedMs: 0,
      };
    },
    async world(root: string, basis: W0.Basis) {
      const validAt = Date.parse(basis.validTime);
      const page = await data.source.page([root], { recordedPosition: basis.tx, validAt });
      const rows = page.entities.flatMap((entry) => {
        const [id, rev, wire] = entry as [string, number, string[]];
        return decodeReplicaRows(id, rev, wire, basis.tx).filter(
          (r) => r.validFrom <= validAt && (r.validTo === undefined || validAt < r.validTo),
        );
      });
      return worldOf(root, rows);
    },
    async publish(_records: readonly W0.EvaluationRecord[]) {},
    async close() {},
  };
}
