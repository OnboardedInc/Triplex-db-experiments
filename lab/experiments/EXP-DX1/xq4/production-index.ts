import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { CrossIndexDeclaration, DatomicClient } from "../../../../packages/datomic/dist/index.js";

// [DX-XQ4] The production exactness gate (prep1/production-gate.ts) and the loader-aged gate (real2/aged-gate.ts) with
// the commit-time index on: when DX_XQ4_DECLARATION names a declaration file (the gateway then runs TX2_CROSS_INDEX=1),
// the driver declares it and backfills before the tape, and after its own read-back checks (1) that a dry-run
// reconciliation of every entity's entries against its rows finds nothing to add or retract, and (2) that `find` by
// each declared attribute's expected value returns every touched owner, and no touched owner whose expected value
// differs. Unset, both gates run exactly as before.
export const declarationPath = process.env.DX_XQ4_DECLARATION;

export async function declareAndBackfill(client: DatomicClient, db: string) {
  if (!declarationPath) return null;
  const declaration = JSON.parse(readFileSync(declarationPath, "utf8")) as CrossIndexDeclaration;
  const declared = await client.declareIndexes(db, declaration);
  const backfill = await client.backfillIndex(db, {});
  assert(backfill.sealed, "the backfill did not seal");
  return { attributes: declaration.attributes.map((a) => a.attribute), seq: declared.seq, backfill };
}

export async function checkIndex(
  reader: DatomicClient, db: string, cut: number, validAt: number,
  expected: ReadonlyMap<string, ReadonlyMap<string, string>>, attributes: readonly string[],
) {
  const dryRun = await reader.backfillIndex(db, { dryRun: true });
  assert.equal(dryRun.added, 0, "entries missing against the rows");
  assert.equal(dryRun.retracted, 0, "entries the rows no longer hold");
  // One question per (account, attribute, value), each owner's expected value; pages until the end.
  const questions = new Map<string, { account: string; attribute: string; value: string; owners: string[] }>();
  for (const [e, fields] of expected) {
    const account = e.split("/")[1]!;
    for (const attribute of attributes) {
      const value = fields.get(attribute);
      if (value === undefined) continue;
      const key = JSON.stringify([account, attribute, value]);
      const q = questions.get(key) ?? { account, attribute, value, owners: [] };
      q.owners.push(e);
      questions.set(key, q);
    }
  }
  let asked = 0, ownersFound = 0, pages = 0;
  for (const q of questions.values()) {
    const ids = new Set<string>();
    let cursor: string | null = null;
    do {
      const answer: any = await reader.find(db, {
        account: q.account, where: [{ attribute: q.attribute, op: "eq", value: { type: "string", value: q.value } }],
        result: "ids", limit: 1000, basis: { recordedPosition: cut, validAt }, ...(cursor ? { cursor } : {}),
      });
      pages++;
      for (const id of answer.ids ?? []) ids.add(id);
      cursor = answer.next ?? null;
    } while (cursor);
    asked++;
    for (const e of q.owners) assert(ids.has(e), `find by ${q.attribute} = ${q.value} misses ${e}`);
    ownersFound += q.owners.length;
    for (const id of ids) {
      const want = expected.get(id)?.get(q.attribute);
      if (want !== undefined) assert.equal(want, q.value, `find by ${q.attribute} = ${q.value} returns ${id}, whose value is ${want}`);
    }
  }
  return { dryRun: { added: dryRun.added, retracted: dryRun.retracted, entities: dryRun.entities }, questions: asked, pages, ownersFound };
}
