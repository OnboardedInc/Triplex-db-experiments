import { expect, it } from 'vitest';
import { fixture, run, seed, advance } from './round2-utils.js';

// [CX-VDA01-R2] Why: classify the same query representation the database executes, including repeated sections and attribute bindings. Rejected: assuming parser agreement from the two original F1 spellings (incomplete grammar coverage).
it('R2 native query grammar rejects every unsupported historical live selection', async () => fixture('grammar', async ({ client, db, a, record }) => {
  await seed(a); await advance(a);
  const where = '[?f :f/live _] [?f :f/id ?id] [(triplex.gateway.query/visible $ ?f 50.0 10.0 nil)]';
  const cases = {
    literal: `[:find ?id :in $ $rules :where ${where}]`,
    ground: '[:find ?id :in $ $rules :where [(ground :f/live) ?a] [?f ?a _] [?f :f/id ?id]]',
    ident: '[:find ?id :in $ $rules :where [?a :db/ident :f/live] [?f ?a _] [?f :f/id ?id]]',
    lookup: '[:find ?id :in $ $rules :where [?f [:db/ident :f/live] _] [?f :f/id ?id]]',
    omitted: '[:find ?id :in $ $rules :where [?f] [?f :f/id ?id]]',
    nested: '[:find ?id :in $ $rules :where (or-join [?f] (and [(ground :f/live) ?a] [?f ?a _])) [?f :f/id ?id]]',
    duplicateWhere: `[:find ?id :in $ $rules :where [?f :f/id ?id] :where ${where}]`,
    repeatedFind: `[:find ?f :in $ $rules :where [?f :f/id ?id] :find ?id :where ${where}]`,
    duplicateIn: '[:find ?id :in $ $rules :where [$rules ?f ?a _] [?f :f/id ?id] :in $rules $]',
    duplicateInLive: '[:find ?id :in $ $rules :where [$rules ?f :f/live _] [$rules ?f :f/id ?id] [(triplex.gateway.query/visible $rules ?f 50.0 10.0 nil)] :in $rules $]',
    relationAlias: '[:find ?id :in $rules $ :where [$rules ?f ?a _] [?f :f/id ?id]]',
    listWhereMap: `{:find [?id] :in [$ $rules] :where (${where})}`,
    explicitSource: '[:find ?id :in $ $rules :where [(ground :f/live) ?a] [$ ?f ?a _] [?f :f/id ?id]]',
  };
  const results: unknown[] = [];
  for (const [name, edn] of Object.entries(cases)) {
    let outcome: unknown;
    try { outcome = { status: 'answered', response: await client.request('POST', `/v1/db/${db}/q`, { edn, relations: [], basis: { validAt: 50, recordedAt: 10 }, basisWaitMs: 10 }) }; }
    catch (error) { outcome = { status: 'refused', code: (error as { code: string }).code, message: String(error) }; }
    results.push({ name, edn, outcome }); record({ kind: 'grammar-case', name, edn, outcome });
  }
  record({ kind: 'grammar-summary', results });
  expect(results.filter((r: any) => r.outcome.status === 'answered')).toEqual([]);
}), 120000);
