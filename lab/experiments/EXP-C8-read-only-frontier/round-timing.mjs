#!/usr/bin/env node
// @ts-nocheck -- [EXP-CHECKJS-R2] runtime-populated records, option bags, or branch-specific union members; dynamic collections, runtime Buffer-to-JSON coercion, or validated values without static narrowing. Binding errors remain checked by lab/bin/checkjs.mjs.
import { latencyReceipt } from "../../receipts/latency.mjs";
// EXP-C8 gate 4: recursive-read timing per round, before (scratch writes) and after (read-only
// frontier), on the same engine, graphs and calls.
//
//   node lab/experiments/EXP-C8-read-only-frontier/round-timing.mjs --root <tree> --lane xtdb|qlever \
//     --label before|after [--repeat 3] [--url URL] --output <file.json>
//
// <tree> is a built checkout: the pre-C8 tree (git archive 2bfc451) for "before", this worktree
// for "after". Each run loads two graphs into a fresh scope named c8-bench-*:
//   wl15: R10 3.2's WL15 dependency-set (cycle Y<->Z plus a diamond), closure from X (3 rounds).
//   tree: a layered tree, fanout 4, depth 4 (341 nodes), closure from the root (5 rounds).
// and times, per graph: the native closure call (XTDB SQL selectSqlWithReachability; QLever
// selectWithRelations) with every step's phase and elapsed ms, and the Datalog rule query
// (ancestor from the root) as wall ms. The pre-C8 helpers ignore `seeds` and close all pairs; the
// answer is the same. Why a separate script and not G2 timings: G2's fixture graphs have at most
// 5 edges and its receipts mix ingest and verification; this isolates the recursive read.
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const root = path.resolve(option('--root'));
const lane = option('--lane');
const label = option('--label');
const repeat = Number(option('--repeat', '3'));
const output = path.resolve(option('--output'));
const url = option('--url', lane === 'xtdb' ? 'postgres://xtdb:xtdb@127.0.0.1:5470/xtdb' : 'http://127.0.0.1:7070');
const load = (pkg, entry = 'index.js') => import(path.join(root, 'packages', pkg, 'dist', entry));
const core = await load('core');
const runtimeApi = await load('core', 'runtime/index.js');
const config = await load('core', 'config/index.js');
const engine = await load(lane);
const { Effect } = await import(path.join(root, 'packages/core/node_modules/effect/dist/index.js'));

const graphs = {
  wl15: { root: 'c8:X', edges: [['c8:X', 'c8:Y'], ['c8:X', 'c8:W'], ['c8:W', 'c8:Z'], ['c8:Y', 'c8:Z'], ['c8:Z', 'c8:Y']] },
  tree: (() => {
    const edges = [];
    let level = ['c8:t'];
    for (let depth = 0; depth < 4; depth++) {
      const next = [];
      for (const node of level) for (let k = 0; k < 4; k++) { const child = `${node}.${k}`; edges.push([node, child]); next.push(child); }
      level = next;
    }
    return { root: 'c8:t', edges };
  })(),
};
const scope = runtimeApi.DatabaseScope.test(`c8-bench-${label}-${randomUUID()}`);
const layer = (lane === 'xtdb' ? engine.makeXtdbRuntime : engine.makeQleverRuntime)({ url }).layer({ scope, capabilities: runtimeApi.Capabilities.none });
const client = (lane === 'xtdb' ? engine.makeXtdbClient : engine.makeQleverClient)(url);
const native = (lane === 'xtdb' ? engine.makeXtdbNativeQueries : engine.makeQleverNativeQueries)(client, scope);
const attribute = (name) => `:c8/${name}`;
const T = config.TypeExpr;
const contract = { name: 'c8/bench', parameters: T.struct({ from: T.required(T.text) }), row: T.struct({ target: T.required(T.text) }) };

const closure = (name, from) =>
  lane === 'xtdb'
    ? native.selectSqlWithReachability(contract, { from }, [{
        name: 'e',
        edges: (ctx) => `SELECT DISTINCT entity_id AS source, value_string AS target FROM ${ctx.facts()} f WHERE attribute = ${ctx.attribute(attribute(name))} AND value_type = 'ref' AND entity_id IS NOT NULL AND value_string IS NOT NULL`,
        seeds: (_ctx, input) => [input.from],
      }], (ctx, input) => `SELECT DISTINCT target FROM ${ctx.relation('e')} c WHERE source = ${ctx.bind(input.from)}`, { maxRounds: 100 })
    : native.selectWithRelations(contract, { from }, [{
        name: 'e',
        edges: (ctx) => `SELECT DISTINCT ?source ?target WHERE { ${ctx.fact('?source', { key: attribute(name), type: T.ref('C8Node') }, '?target')} }`,
        seeds: (_ctx, input) => [input.from],
      }], (ctx, input) => `SELECT DISTINCT ?target WHERE { ${ctx.relation('e', '?source', '?target')} FILTER(?source = ${ctx.literal(input.from)}) }`);
const rules = (name) => [
  { name: `c8-${name}`, body: [['?x', attribute(name), '?y']] },
  { name: `c8-${name}`, body: [['?x', attribute(name), '?z'], [`c8-${name}`, '?z', '?y']] },
];

const result = latencyReceipt({ qleverConnectionMode: lane === 'qlever' ? engine.qleverConnectionModeOf() : null, format: 'c8-round-timing/1', label, lane, url, root, scope, startedAt: new Date().toISOString(), repeat, graphs: {} });
await Effect.runPromise(Effect.gen(function* () {
  const t = yield* core.Triples;
  for (const [name, graph] of Object.entries(graphs))
    yield* t.assertBatch(graph.edges.map(([a, b]) => ({ entityId: core.EntityId.make(a), attribute: attribute(name), value: core.ref(b) })));
  for (const [name, graph] of Object.entries(graphs)) {
    const expected = new Set(graph.edges.map(([, b]) => b));
    const entry = (result.graphs[name] = { edges: graph.edges.length, reach: expected.size, native: [], datalog: [] });
    for (let i = 0; i < repeat; i++) {
      // A failed call (for example the 30 s read timeout) is a result, recorded with its time.
      const started = performance.now();
      const answer = yield* Effect.exit(closure(name, graph.root));
      const totalMs = Math.round(performance.now() - started);
      if (answer._tag === 'Success') {
        const targets = new Set(answer.value.rows.map((row) => row.target));
        if (targets.size !== expected.size || [...expected].some((node) => !targets.has(node))) throw new Error(`native ${name}: wrong closure`);
        entry.native.push({ totalMs, steps: (answer.value.trace.steps ?? []).map((step) => [step.phase, Math.round(step.elapsedMs)]) });
      } else entry.native.push({ totalMs, error: String(answer.cause).slice(0, 300) });
      const datalogStarted = performance.now();
      // Datalog reads are bounded to 100 rows per page by default; count the closure instead.
      const rows = yield* Effect.exit(t.query({ find: ['?n'], where: [[`c8-${name}`, graph.root, '?y']], rules: rules(name), aggregate: [['count', '?y', '?n']] }));
      const datalogMs = Math.round(performance.now() - datalogStarted);
      if (rows._tag === 'Success') {
        const count = Number(rows.value.results[0]?.['?n']?.value ?? rows.value.results[0]?.['?n']);
        if (count !== expected.size) throw new Error(`datalog ${name}: ${count} rows, expected ${expected.size}`);
        entry.datalog.push(datalogMs);
      } else entry.datalog.push({ ms: datalogMs, error: String(rows.cause).slice(0, 300) });
    }
  }
}).pipe(Effect.provide(layer), Effect.scoped));
await client.close();
result.endedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(latencyReceipt({ qleverConnectionMode: result.qleverConnectionMode, graphs: result.graphs })));
