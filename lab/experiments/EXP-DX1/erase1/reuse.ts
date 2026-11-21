import assert from "node:assert/strict";
import { DatomicClient, DatomicHttpError } from "../../../../packages/datomic/dist/index.js";
import type { CompositionHandle } from "../../../bench/lib/composition.ts";
import { SEED_VALID_FROM } from "../../../bench/lib/world.ts";

export async function checkErasedIdentity(
  f: { db: string; scope: string; comp: CompositionHandle },
  attribute: string,
  nonce: string,
  diag: (action: string, input: object) => Promise<{ t: string; assertionId: string }>,
  output: (name: string, value: unknown) => void,
) {
  const peer = new DatomicClient(process.env.DATOMIC_URL!);
  try {
    for (const destination of ["original", "other-account"] as const) {
      const owner = `acct/a/person-${destination}`;
      const target = destination === "original" ? owner : `acct/b/person-${destination}`;
      const seed = await f.comp.transact(
        [
          {
            op: "assert",
            entityId: owner,
            attribute,
            value: { type: "string", value: "seed" },
            validFrom: SEED_VALID_FROM,
          },
        ],
        { commandId: `seed-identity-${destination}-${nonce}`, actor: "identity-check" },
      );
      assert(seed.ok);
      const [assertion] = seed.value.triples;
      assert(assertion && assertion.entityId === owner);
      const original = (await peer.rows(f.db, { entityIds: [owner] })).find(
        (row) => row.id === assertion.id,
      );
      assert(original?.value_string === "seed");
      const erased = await peer.erase(f.db, `erase-identity-${destination}-${nonce}`, [
        { id: original.id },
      ]);
      assert.deepEqual(
        erased.identities.map((entry) => entry.assertionId),
        [original.id],
      );
      // [DX-ERASE1] Why: remove the row from native history so history uniqueness cannot hide a missing removal check.
      // Rejected: offering the duplicate while the original native identity remains searchable.
      const excision = await diag("regression-excise", {
        scope: f.scope,
        entityId: owner,
        assertionId: original.id,
      });
      assert.equal(excision.assertionId, original.id);
      assert(BigInt(excision.t) > BigInt(erased.t));
      const history = await peer.rows(f.db, { entityIds: [owner], history: true });
      assert(!history.some((row) => row.id === original.id));
      const attempt = async (id: string, operationId: string) => {
        const position = (await f.comp.currentPosition()) + 1;
        try {
          await peer.transact(f.db, {
            sourceK: null,
            span: 1,
            scopeWide: false,
            assignRecordTime: true,
            position,
            operationId,
            attemptId: operationId,
            claims: [],
            newIds: [id],
            rows: [
              {
                ...original,
                id,
                entity_id: target,
                value_string: "replacement",
                recorded_position: position,
                tx_id: null,
              },
            ],
          });
          return { status: 200, code: undefined };
        } catch (e) {
          if (!(e instanceof DatomicHttpError)) throw e;
          return { status: e.status, code: e.code };
        }
      };
      const operation = `reuse-${destination}-${nonce}`;
      const refusal = await attempt(original.id, operation);
      const receipt = await peer.operation(f.db, operation);
      output(`reuse-${destination}`, { destination, erased, excision, refusal, receipt });
      assert.deepEqual(refusal, { status: 409, code: "ErasedAssertionIdentity" });
      assert.equal(receipt.status, "absent");
      const fresh = `fresh-${destination}-${nonce}`;
      const control = `save-${destination}-${nonce}`;
      assert.equal((await attempt(fresh, control)).status, 200);
      assert.equal((await peer.operation(f.db, control)).status, "committed");
      const actual = await peer.rows(f.db, { entityIds: [target] });
      assert(actual.some((row) => row.id === fresh && row.value_string === "replacement"));
      assert(!actual.some((row) => row.id === original.id));
    }
  } finally {
    peer.close();
  }
}
