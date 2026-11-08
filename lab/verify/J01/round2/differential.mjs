// [CX-VJ01-2] Why: compare actual boundary calls and live answers on adversarial public/native inputs. Rejected: mock answers as semantic proof.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { createHash, randomUUID } from 'node:crypto';
import { Effect } from 'effect';
import { TypeExpr } from '../../../../packages/core/dist/config/index.js';
import { DatabaseScope } from '../../../../packages/core/dist/runtime/index.js';
import { types } from '../../../../packages/xtdb/node_modules/postgres/src/types.js';
const root = 'lab/verify/J01/round2';
const live = process.argv.includes('--live');
const xtqlOnly = process.argv.includes('--xtql-only');
const file = `${root}/${live ? xtqlOnly ? 'answers-xtql' : 'answers' : 'wire'}.json`;
const sha = v => createHash('sha256').update(v).digest('hex');
const stable = v => JSON.stringify(v, (_, x) => typeof x === 'bigint' ? { bigint: String(x) } : Object.is(x, -0) ? { number: '-0' } : x);
const summarize = v => ({ sha256: sha(stable(v)), bytes: Buffer.byteLength(stable(v)), ...(Buffer.byteLength(stable(v)) < 1800 ? { value: v } : {}) });
const cases = [
  ['empty', []], ['strings', ['a', 'b']], ['numeric', [1, 2]], ['mixed', ['a', 1, null, false]],
  ['nested', [[], ['a', ['b', null]], { list: [1, 2] }]],
  ['json-looking-members', ['[]', '["a"]', '{"x":[1]}', 'null', '"s"']],
  ['json-looking-string', '["a", {"x": []}]'], ['json-object-string', '{"list":["a"]}'],
  ['unicode-escapes', ['𝄞', "quote'", 'a,b', 'NULL', 'x\\y', 'line\nend', '']],
  ['surrogate-member', ['ok', String.fromCharCode(0xd800)]],
  ['large-100k', Array.from({ length: 100000 }, (_, i) => `s${i}:[]𝄞`)],
];
const manifest = JSON.parse(fs.readFileSync(`${root}/source-manifest.json`));
const out = { startedAt: new Date().toISOString(), live, source: manifest.sources, cases: [], failures: [] };
const save = () => fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
const scope = DatabaseScope.test(`cx-vj01-r2-${randomUUID()}`);
const contract = { name: 'cx-vj01-r2/echo', parameters: TypeExpr.struct({}), row: TypeExpr.struct({ value: TypeExpr.required(TypeExpr.any) }) };
let calls;
const libraries = {};
for (const arm of ['main', 'candidate']) {
  const native = await import(`./trees/${arm}/xtdb/native/NativeQueries.ts`);
  let client;
  if (live) client = await import(`./trees/${arm}/xtdb/XtdbClient.ts`);
  else {
    // Real serializer for JSON parameters; the fake driver retains complete statements/OIDs/bytes.
    globalThis.__CX_VJ01_R2_DRIVER__ = () => ({
      typed: (value, oid) => ({ value, oid, bytes: oid === 114 ? types.json.serialize(value) : String(value) }),
      reserve: async () => ({ unsafe: (sql, params = []) => {
        calls.push({ sql, params });
        return Object.assign(Promise.resolve(sql.startsWith('SHOW AWAIT_TOKEN') ? [{ token: 'fixed-token' }] : []), { cancel() {} });
      }, release() {} }), end: async () => {},
    });
    const source = fs.readFileSync(`${root}/trees/${arm}/xtdb/XtdbClient.ts`, 'utf8').replace('import postgres from "postgres";', 'const postgres = globalThis.__CX_VJ01_R2_DRIVER__;');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    client = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  }
  libraries[arm] = { ...client, ...native };
}
const ownerFile = manifest.owners.xtdb.path;
assert.equal(sha(fs.readFileSync(ownerFile)), manifest.owners.xtdb.sha256);
try {
  for (const mode of [undefined, 'a0']) {
    if (mode === undefined) delete process.env.TRIPLEX_COMMIT_ENCODING; else process.env.TRIPLEX_COMMIT_ENCODING = mode;
    for (const [name, value] of cases) {
      const results = {};
      for (const arm of ['main', 'candidate']) {
        const lib = libraries[arm]; calls = [];
        const c = lib.makeXtdbClient(live ? manifest.owners.xtdb.owner.endpoint : 'postgresql://unused-local', { maxConnections: 1, transactionTimeoutMs: 20000 });
        const answers = {};
        const invoke = async (label, fn) => {
          try { answers[label] = { result: await fn() }; }
          catch (e) { answers[label] = { error: String(e.message), code: e.code ?? e.cause?.code ?? null }; }
        };
        try {
          if (!xtqlOnly) {
          await invoke('query-postgresql', () => c.query('SELECT $1 AS value', [value], undefined, { parameterSyntax: 'postgresql', timeoutMs: 20000 }));
          await invoke('query-placeholders', () => c.query('SELECT ? AS value', [value], undefined, { timeoutMs: 20000 }));
          // Same scoped ID in each arm: persisted read-back uses the caller's own AWAIT_TOKEN.
          const id = `${scope}/${mode ?? 'unset'}/${name}`;
          await invoke('submit', () => c.submit([{ sql: 'INSERT INTO j01_r2_values (_id, value) VALUES ($1, $2)', params: [id, value], parameterSyntax: 'postgresql' }]));
          // Tokens differ across real transactions; compare success/error, then read the value.
          if (live && answers.submit.result) answers.submit.result = { committed: true };
          await invoke('submit-readback', () => c.query('SELECT value FROM j01_r2_values WHERE _id = $1', [id], undefined, { parameterSyntax: 'postgresql', timeoutMs: 20000 }));
          }
          const n = lib.makeXtdbNativeQueries(c, scope);
          for (const language of xtqlOnly ? ['xtql'] : ['xtdb-sql', 'xtql', 'reachability-empty']) {
            const build = ctx => language === 'xtql' ? `(rel [{:value ${ctx.bind(value)}}] [value])` : `SELECT ${ctx.bind(value)} AS value`;
            const options = { basis: { validAt: 0, recordedPosition: 0 }, timeoutMs: 20000 };
            await invoke(language, async () => {
              const r = await Effect.runPromise(language === 'xtql' ? n.select(contract, {}, build, options) : language === 'reachability-empty' ? n.selectSqlWithReachability(contract, {}, [], build, options) : n.selectSql(contract, {}, build, options));
              return { rows: r.rows, query: r.trace.query, parameters: r.trace.parameters };
            });
          }
          results[arm] = { calls: structuredClone(calls), answers };
        } finally { await c.close(); }
      }
      const equal = stable(results.main) === stable(results.candidate);
      const entry = { mode: mode ?? 'unset', name, input: summarize(value), equal, main: summarize(results.main), candidate: summarize(results.candidate) };
      entry.surfaces = Object.fromEntries(Object.entries(results.main.answers).map(([surface, answer]) => [surface, { main: summarize(answer), candidate: summarize(results.candidate.answers[surface]), mainError: answer.error ?? null, candidateError: results.candidate.answers[surface].error ?? null }]));
      // All statements and full bound bytes are retained for the offline comparator (including large inputs).
      if (!live) entry.raw = results;
      out.cases.push(entry);
      if (!equal) out.failures.push({ mode: mode ?? 'unset', name });
      save(); console.log(`${live ? 'answers' : 'wire'}/${mode ?? 'unset'}/${name}: ${equal ? 'equal' : 'DIFF'}`);
    }
  }
} catch (e) { out.failures.push({ fatal: e.stack }); }
finally { out.ownerUnchanged = sha(fs.readFileSync(ownerFile)) === manifest.owners.xtdb.sha256; out.endedAt = new Date().toISOString(); save(); }
if (out.failures.length || !out.ownerUnchanged) process.exitCode = 1;
