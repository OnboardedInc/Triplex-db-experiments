import { Effect } from 'effect';
import { expect, it } from 'vitest';
import { fixture, seed, advance, run } from './round2-utils.js';

const n = (x: number | undefined) => x === undefined ? 'nil' : Number.isInteger(x) ? `${x}.0` : String(x);
const sorted = (xs: readonly string[]) => [...xs].sort();
const cuts = [
  { name: 'latest', basis: { validAt: 50 }, live: true },
  { name: 'V-start', basis: { validAt: 0 }, live: true },
  { name: 'V-expired', basis: { validAt: 100 }, live: true },
  { name: 'P-old', basis: { validAt: 50, recordedPosition: 1 }, live: true },
  { name: 'P-interior', basis: { validAt: 50, recordedPosition: 2 }, live: false },
  { name: 'T', basis: { validAt: 50, recordedAt: 10 }, live: false },
  { name: 'TP', basis: { validAt: 50, recordedAt: 10, recordedPosition: 3 }, live: false },
  { name: 'future-P', basis: { validAt: 50, recordedPosition: 1000 }, live: false, future: true },
] as const;
// [CX-VDA01-R3] Why: generate surfaces independently and compare both actual route and complete result bytes with the canonical control. Rejected: copying the builder's generator (shared assumptions could hide parser disagreement).
it('R3 generated equivalent native surfaces preserve canonical routes and answers or typed refusal', async () => fixture('R3-surfaces', async ({ client, a, db, record }) => {
  await seed(a);
  let total = 0;
  for (const phase of ['before', 'after']) {
    if (phase === 'after') await advance(a);
    for (const cut of cuts) {
      const b = cut.basis as { validAt: number; recordedAt?: number; recordedPosition?: number };
      const expected = 'future' in cut ? [] : sorted((await client.rows(db, { route: 'history', pattern: { attribute: ':key' }, basis: b })).map(r => r.entity_id));
      const snapshot = await client.begin(db);
      try {
        for (const live of [false, true]) {
          const f = '?fact', s = '?subject', e = '?entity', attr = '?attribute';
          const selection = `[${f} ${live ? ':f/live' : ':f/subject'} ${s}]`;
          const data = [selection, `[${s} :triplex.entity/id ${e}]`, `[${f} :f/attr ${attr}]`, `[${attr} :triplex.attr/key ":key"]`];
          const visible = `[(triplex.gateway.query/visible $ ${f} ${n(b.validAt)} ${n(b.recordedAt)} ${b.recordedPosition ?? 'nil'})]`;
          const canonical = `{:find [${e}] :in [$ $rules] :where [${data.join(' ')} ${visible}]}`;
          type Outcome = { kind: 'answer'; route: string; rows: string[] } | { kind: 'refusal'; code: string; status: number };
          const query = async (edn: string, pin: Record<string, unknown> = {}): Promise<Outcome> => {
            try {
              const response = await client.request<{ route: string; rows: { t: string; v: string }[][] }>('POST', `/v1/db/${db}/q`, { edn, relations: [], basis: b, basisWaitMs: 5, ...pin });
              expect(response.rows.every(r => r.length === 1 && r[0]!.t === 'string')).toBe(true);
              return { kind: 'answer', route: response.route, rows: sorted(response.rows.map(r => r[0]!.v)) };
            } catch (error) { return { kind: 'refusal', code: (error as { code: string }).code, status: (error as { status: number }).status }; }
          };
          const control = await query(canonical);
          const eligible = !('future' in cut) && (!live || cut.live);
          if (eligible) expect(control).toEqual({ kind: 'answer', route: live ? 'live' : 'history', rows: expected });
          else expect(control).toEqual({ kind: 'refusal', status: 409, code: 'BasisNotAvailable' });
          const clauses = [...data, visible], text = clauses.join(' ');
          const variants: Record<string, string> = {
            vector: `[:find ${e} :in $ $rules :where ${text}]`,
            reorderedSections: `[:where ${text} :find ${e} :in $ $rules]`,
            splitEveryClause: `[:in $ $rules :find ${e} ${clauses.map(c => ':where ' + c).join(' ')}]`,
            repeatedWhere: `[:find ${e} :in $ $rules :where ${data[1]} :where ${text}]`,
            duplicateHeaders: `[:find ${e} :find ${e} :in $ $rules :where ${text} :in $ $rules]`,
            withDeduplication: `[:find ${e} :in $ $rules :with ${f} :with ${f} ${attr} :where ${text}]`,
            mapLists: `{:where (${text}) :find (${e}) :in ($ $rules)}`,
            duplicateClause: `{:find [${e}] :in [$ $rules] :where [${text} ${data[0]}]}`,
            reorderedPatterns: `[:in $ $rules :where ${[...data].reverse().join(' ')} ${visible} :find ${e}]`,
            metadataQuery: `^{:review true :arbitrary [1 2]} [:find ${e} :in $ $rules :where ${text}]`,
            metadataClauses: `[:find ^:review ${e} :in $ $rules :where ${clauses.map(c => '^{:review "clause"} ' + c).join(' ')}]`,
            comments: `; leading query comment\n[:find ${e} ; projection\n :in $ $rules ; bindings\n :where ${clauses.join(' ; data or predicate\n ')}] ; trailing comment\n`,
            commas: `[:find,${e},:in,$,$rules,:where,${clauses.join(',')}]`,
            discardLeading: `#_ {:discard ["unused"]} ${canonical}`,
            discardTrailing: `${canonical} #_ [:find ?unexecuted :in $rules $]`,
            alphaRename: canonical.replaceAll('?fact', '?f_NEW').replaceAll('?subject', '?s_NEW').replaceAll('?entity', '?e_NEW').replaceAll('?attribute', '?a_NEW'),
            explicitSource: `[:find ${e} :in $ $rules :where ${data.map(c => '[$ ' + c.slice(1)).join(' ')} ${visible}]`,
            nestedLogical: `[:find ${e} :in $ $rules :where ${data.slice(1).join(' ')} (or-join [${f} ${s}] (and ${selection} (or-join [${f} ${s}] ${selection}))) ${visible}]`,
            negativeClause: `[:find ${e} :in $ $rules :where ${text} (not-join [${f}] [${f} :f/id "never-present"])]`,
          };
          for (const [variant, edn] of Object.entries(variants)) {
            const mode = total % 3;
            const pin = mode === 0 ? {} : { handle: snapshot.handle, ...(mode === 2 ? { staged: { sourceK: snapshot.position, position: snapshot.position + 1, operationId: 'R3-property-overlay', rows: [], newIds: [], claims: [] } } : {}) };
            const actual = await query(edn, pin);
            record({ kind: 'surface-equivalence', phase, cut: cut.name, basis: b, family: live ? 'live' : 'history', variant, mode: ['unheld', 'held', 'staged'][mode], canonical, edn, control, actual, expected });
            total++;
            // [CX-VDA01-R3] Why: a conservative parser may explicitly refuse an unsupported surface, but must not answer from another route/cut. Rejected: accepting generic exceptions or comparing HTTP status only (content could differ).
            if (actual.kind === 'refusal' && actual.status === 400 && actual.code === 'InvalidValue') continue;
            expect(actual, `${phase}/${cut.name}/${live}/${variant}`).toEqual(control);
          }
        }
      } finally { await client.release(db, snapshot.handle); }
    }
  }
  record({ kind: 'surface-coverage', total, variants: 19, cuts: cuts.length, families: 2, phases: 2 });
  expect(total).toBe(608);
}), 180000);

it('R3 unsupported input bindings, nested native rule bodies and nested pull maps refuse typed', async () => fixture('R3-unsupported', async ({ client, a, db, record }) => {
  await seed(a);
  const safe = '[?f :f/subject _] [?f :f/id ?id]';
  const bindingForms: Record<string, string> = {
    omitted: '', defaultSourceOnly: '$', reversedSources: '$rules $', otherSource: '$ $other', scalar: '$ ?value',
    tuple: '$ [?left ?right]', collection: '$ [?value ...]', relation: '$ [[?left ?right]]', rules: '$ %',
    extraScalar: '$ $rules ?value', mixedRules: '$ $rules %', repeatedSource: '$ $', tupleAll: '[$ $rules]',
  };
  const invalid: Record<string, string> = Object.fromEntries(Object.entries(bindingForms).map(([name, binding]) => [`input/${name}`, `[:find ?id ${name === 'omitted' ? '' : ':in ' + binding} :where ${safe}]`]));
  Object.assign(invalid, {
    conflictingInputs: `[:find ?id :in $ $rules :where ${safe} :in $rules $]`,
    conflictingFind: `[:find ?id :in $ $rules :where ${safe} :find ?f]`,
    trailingQuery: `[:find ?id :in $ $rules :where ${safe}] [:find ?f :in $ $rules :where [?f :f/live _]]`,
    nativeRuleBody: '[:find ?id :in $ $rules :where (outer ?f) [?f :f/id ?id] :rules [[(outer ?e) (inner ?e)] [(inner ?e) [?e :f/live _]]]]',
    ruleCall: `[:find ?id :in $ $rules :where ${safe} (outer ?f)]`,
    nestedRuleCall: `[:find ?id :in $ $rules :where ${safe} (or-join [?f] (and (outer ?f))) ]`,
    negativeRuleCall: `[:find ?id :in $ $rules :where ${safe} (not-join [?f] (outer ?f))]`,
    pullProjection: '[:find (pull ?f [* {:f/subject [:triplex.entity/id {:f/live [*]}]}]) :in $ $rules :where [?f :f/id ?id]]',
    nativePullFunction: `[:find ?id :in $ $rules :where ${safe} [(pull $ ?f [* {:f/subject [:triplex.entity/id {:f/live [*]}]}]) ?pattern]]`,
    nestedMapTerm: `[:find ?id :in $ $rules :where ${safe} [(ground {:outer {:f/subject [:triplex.entity/id {:f/live [*]}]}}) ?map]]`,
    dataMap: `[:find ?id :in $ $rules :where ${safe} [?f :f/subject {:nested {:f/live [*]}}]]`,
    unknownSection: `[:find ?id :in $ $rules :where ${safe} :offset 1]`,
  });
  const decorations = (edn: string) => [edn, `; arbitrary comment\n^{:review {:nested true}} ${edn} ; end\n`, `#_ [:discarded] ${edn}`];
  let total = 0;
  for (const basis of [{ validAt: 50 }, { validAt: 50, recordedAt: 10 }]) for (const [name, raw] of Object.entries(invalid)) for (const [decoration, edn] of decorations(raw).entries()) {
    let result: unknown;
    try { result = { answered: await client.request('POST', `/v1/db/${db}/q`, { edn, relations: [], basis }) }; }
    catch (e) { result = { status: (e as { status: number }).status, code: (e as { code: string }).code }; }
    record({ kind: 'surface-refusal', name, decoration, basis, edn, actual: result }); total++;
    expect(result, `${name}/${decoration}`).toEqual({ status: 400, code: 'InvalidValue' });
  }
  record({ kind: 'unsupported-coverage', total, grammarClasses: Object.keys(invalid) });
}), 120000);

it('R3 recursive Triplex rule variants agree with history; cross-rule/native-body variants refuse typed', async () => fixture('R3-rules', async ({ client, a, q, db, record }) => {
  await seed(a); let total = 0;
  for (const phase of ['before', 'after']) {
    if (phase === 'after') await advance(a);
    for (const basis of [{ validAt: 50 }, { validAt: 0 }, { validAt: 50, recordedAt: 10 }, { validAt: 50, recordedPosition: 1 }]) {
      const rows = await client.rows(db, { route: 'history', basis });
      const reached = new Set(['root']);
      for (let i = 0; i < 10; i++) for (const r of rows.filter(r => r.attribute === ':edge')) if (reached.has(r.entity_id)) reached.add(r.value_string!);
      const expected = sorted(rows.filter(r => r.attribute === ':key' && reached.has(r.entity_id)).map(r => r.entity_id));
      for (let variant = 0; variant < 6; variant++) {
        const s = `?start${variant}`, t = `?end${variant}`, m = `?middle${variant}`, name = `walk${variant}`;
        const rules = [{ name, body: [[s, ':edge', t]] }, { name, body: [[s, ':edge', m], [name, m, t]] }];
        if (variant % 2) rules.reverse(); if (variant >= 4) rules.push({ name, body: [[s, ':edge', t]] });
        const response = await run(q.execute({ find: ['?e'], where: [[name, 'root', '?e'], ['?e', ':key', '?v']], rules }, false, basis));
        const actual = sorted(response.results.map(r => String(r['?e'])));
        record({ kind: 'rule-equivalence', phase, basis, variant, rules, expected, actual }); total++;
        expect(actual).toEqual(expected);
      }
      const crossRule = { find: ['?e'], where: [['outer', 'root', '?e']], rules: [
        { name: 'inner', body: [['?s', ':edge', '?t']] }, { name: 'outer', body: [['?s', ':edge', '?t']] },
        { name: 'outer', body: [['?s', ':edge', '?m'], ['inner', '?m', '?t']] },
      ] };
      const error = await run(q.execute(crossRule, false, basis).pipe(Effect.flip));
      record({ kind: 'rule-refusal', phase, basis, query: crossRule, actual: { tag: error._tag, message: error.message } });
      expect(error._tag).toBe('DatalogValidationError');
    }
  }
  record({ kind: 'rule-coverage', answers: total, refusals: 8 }); expect(total).toBe(48);
}), 120000);
