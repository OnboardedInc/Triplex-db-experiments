
import { after as diagnosticAfter } from 'node:test';
import { createHash as diagnosticHash } from 'node:crypto';
import { createRequire as diagnosticRequire } from 'node:module';
let diagnosticIrCount=0;
const diagnosticOriginal=NativeDuckDBPort.prototype.runWriter;
NativeDuckDBPort.prototype.runWriter=async function(plan){
 const value=await diagnosticOriginal.call(this,plan);
 if(plan.sql==='SELECT system.main.td_schema_ir_v2(?)'){
  assert.equal(++diagnosticIrCount,1);assert.equal(typeof value[0]?.[0],'string');
  const ir=value[0][0];assert.equal(JSON.parse(ir).format,'td.schema/4');
  await writeFile("__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/qualification-reference-identity-growth-pair-20261106-01/pair/candidate/schema-proof.json",JSON.stringify({dsl:plan.params[0],ir,hash:diagnosticHash('sha256').update(ir).digest('hex')}),{flag:'wx'});
 }
 return value;
};
diagnosticAfter(async()=>{
 NativeDuckDBPort.prototype.runWriter=diagnosticOriginal;
 const bridge=diagnosticRequire(import.meta.url)("__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/owner_probe/temporal_writer.node");
 const snapshot=bridge.snapshot();
 const images=process.report.getReport().sharedObjects.filter(p=>/duckdb|temporal_(?:datalog|owner_probe|control|writer)/.test(p));
 const expected=["__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/temporal_datalog.duckdb_extension","__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/owner_probe/temporal_owner_probe.duckdb_extension","__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/temporal_control.node","__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/owner_probe/temporal_writer.node","__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/node_modules/@duckdb/node-bindings-darwin-arm64/duckdb.node","__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/node_modules/@duckdb/node-bindings-darwin-arm64/libduckdb.dylib"];
 await writeFile("__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/qualification-reference-identity-growth-pair-20261106-01/pair/candidate/lifecycle.json",JSON.stringify({snapshot,images,expected,diagnosticIrCount}),{flag:'wx'});
 assert.deepEqual(snapshot,{liveHandles:0,pendingCompletions:0,asyncContexts:0,asyncResources:0,lifecycleOwners:0});
 assert.deepEqual(images.toSorted(),expected.toSorted());assert.equal(diagnosticIrCount,1);
});
import assert from 'node:assert/strict';
import { appendFile, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { NativeDuckDBPort } from "file://__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/adapter/native-duckdb-port.mjs";
import { NativeEntityStore } from "file://__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/adapter/native-entity.js";
// A fresh diagnostic of the preserved growth failure, not a replacement for
// its first terminal. The original independent boundary methods stay unchanged.
const root = "__HANDOFF_ROOT__/duckdb-temporal/variants/temporal-reference-coverage-20261106/runtime/build/qualification-reference-identity-growth-pair-20261106-01/pair/candidate";
const settings = { threads: 1, memoryLimit: '128MB', maxTempDirectorySize: '64MB' };
const definition = 'schema coverage_boundary version 1 {entity T live {} entity S live {to:ref_value(T) many;}}';
const countProgram = 'source(?e,?a,?v) :- triple(?e,?a,?v). answer(count()) :- source(?e,?a,?v).';
const json = (value) => JSON.stringify(value, (_, cell) => typeof cell === 'bigint' ? String(cell) : cell) + '\n';
function errorDetail(value, depth = 0) {
    if (!(value instanceof Error))
        return String(value);
    return { name: value.name, message: value.message, stack: value.stack,
        ...('code' in value ? { code: value.code } : {}),
        ...(depth < 3 && value.cause !== undefined ? { cause: errorDetail(value.cause, depth + 1) } : {}) };
}
test('coverage growth diagnostic records each actual ACK and isolates postcommit query audit and reopen phases', async (t) => {
    const directory = await mkdtemp(join(root, 'build/reference-coverage-growth-trace-'));
    const database = join(directory, 'facts.duckdb'), trace = join(directory, 'events.jsonl');
    await writeFile(trace, '', { flag: 'wx' });
    t.diagnostic('Preserved owned fixture: ' + directory);
    let sequence = 0, store, raw, primary;
    const mark = (stage, details = {}) => appendFile(trace, json({ sequence: ++sequence, atUtc: new Date().toISOString(), stage, details }));
    async function observe(stage, work, summary = () => ({})) {
        await mark(stage + ':begin');
        try {
            const value = await work();
            await mark(stage + ':end', summary(value));
            return value;
        }
        catch (error) {
            try {
                await mark(stage + ':error', errorDetail(error));
            }
            catch (logging) {
                t.diagnostic('Trace logging failed: ' + String(logging));
            }
            throw error;
        }
    }
    const source = (index) => ({ schema: 'coverage_boundary', version: 1, type: 'S', entityId: 's' + index,
        commandId: 'growth-source-' + index, validFrom: 0n, validTo: 10n,
        fields: [{ attribute: 'to', value: { tag: 'ref', value: 't' + index } }] });
    async function counts(label, k) {
        for (const route of ['native', 'scalable', 'automatic'])
            await observe(label + ':' + route, async () => {
                const result = route === 'scalable' ?
                    await store.queryScalable(countProgram, { knownAt: k, validAt: 0n, timeoutMs: 10000 }) :
                    await store.query(countProgram, route === 'native' ?
                        { knownAt: k, validAt: 0n, forceNative: true, timeoutMs: 10000 } : { validAt: 0n, timeoutMs: 10000 });
                assert.equal(result.position, k);
                assert.deepEqual(result.rows, [[{ tag: 'i64', value: 65n }]]);
                return result;
            }, result => ({ position: result.position, route: result.route, rows: result.rows }));
    }
    try {
        await mark('profile', { settings, readers: 2, definition, expectedTargetBatches: 195, expectedSourcePuts: 65,
            expectedTargetEvents: 4225, expectedTotalEntities: 130, expectedTotalEvents: 4290 });
        store = await observe('initial_open', () => NativeEntityStore.open({ database, readers: 2, ...settings }));
        await observe('schema_registration', () => store.defineSchema(definition), value => value);
        const targets = Array.from({ length: 65 }, (_, i) => 't' + i);
        let authoredTargetEvents = 0, last = 1n;
        for (let round = 0; round < 65; round++)
            for (let start = 0; start < 65; start += 32) {
                const commandId = `growth-target-${round}-${start}`;
                const members = targets.slice(start, start + 32).map(entityId => ({ operation: round === 0 ? 'put' : 'patch',
                    type: 'T', entityId, validFrom: 0n, validTo: 10n, fields: [] }));
                await mark('target_batch:submitted', { round, start, commandId, members: members.length });
                const receipt = await observe('target_batch:' + commandId, () => store.batch({ schema: 'coverage_boundary', version: 1, commandId, members }), value => ({ commandId: value.commandId, position: value.position, members: value.members.length }));
                // This marker proves public receipt delivery, rather than inferring ACK
                // from a committed header after a possibly uncertain delivery failure.
                await mark('target_batch:ack', { commandId, position: receipt.position, members: receipt.members.length });
                assert.equal(receipt.commandId, commandId);
                assert.equal(receipt.position, last + 1n);
                assert.equal(receipt.members.length, members.length);
                authoredTargetEvents += receipt.members.length;
                last = receipt.position;
            }
        assert.equal(authoredTargetEvents, 4225);
        await mark('target_setup_complete', { position: last, authoredTargetEvents });
        let first;
        for (let i = 0; i < 65; i++) {
            const request = source(i);
            await mark('source_put:submitted', { index: i, commandId: request.commandId });
            const receipt = await observe('source_put:' + request.commandId, () => store.put(request), value => ({ commandId: value.commandId, position: value.position, asserted: value.asserted }));
            await mark('source_put:ack', { commandId: receipt.commandId, position: receipt.position });
            assert.equal(receipt.position, last + 1n);
            assert.equal(receipt.commandId, request.commandId);
            last = receipt.position;
            first ??= receipt;
        }
        assert.ok(first);
        await mark('all_writes_acknowledged', { position: last, batchAcks: 195, putAcks: 65 });
        await counts('first_count', last);
        await observe('revalidate', () => store.revalidate());
        await observe('presence_exact', async () => {
            const value = await store.presenceIntervals('t64', { knownAt: last, maxEvents: 65, maxIntervals: 1 });
            assert.deepEqual(value, { position: last, hasEditAtCut: true, intervals: [{ validFrom: 0n, validTo: 10n }] });
            return value;
        }, value => value);
        await observe('presence_low_cap', async () => {
            await assert.rejects(store.presenceIntervals('t64', { knownAt: last, maxEvents: 64, maxIntervals: 1 }), /TD_E_PRESENCE_LIMIT/);
        });
        const saved = await observe('first_receipt', () => store.receipt(source(0).commandId), value => value);
        assert.deepEqual(saved, first);
        await observe('first_put_replay', async () => { const value = await store.put(source(0)); assert.deepEqual(value, saved); return value; }, value => value);
        await counts('after_replay_count', last);
        await observe('first_close', () => store.close());
        store = undefined;
        raw = await observe('raw_open', () => NativeDuckDBPort.openWithOwner({ database, ...settings }));
        await observe('raw_activate', () => raw.activateOwnership());
        await observe('raw_event_count', async () => {
            const value = await raw.runNative({ name: 'coverage_growth_trace', sql: 'SELECT count(DISTINCT entity_id)::BIGINT,count(*)::BIGINT FROM td_catalog_v1.entity_presence_events', params: [] });
            assert.deepEqual(value, [[130n, 4290n]]);
            return value;
        }, value => value);
        await observe('raw_close', () => raw.close());
        raw = undefined;
        store = await observe('final_reopen', () => NativeEntityStore.open({ database, readers: 2, ...settings }));
        await counts('final_count', last);
        await observe('final_receipt', async () => { const value = await store.receipt(source(0).commandId); assert.deepEqual(value, saved); return value; }, value => value);
        assert.deepEqual(store.readerStats(), { capacity: 2, available: 2, active: 0, waiting: 0 });
        await mark('all_checks_passed', { position: last });
    }
    catch (error) {
        primary = error;
        try {
            await mark('fixture_error', errorDetail(error));
        }
        catch (logging) {
            t.diagnostic('Trace logging failed: ' + String(logging));
        }
        throw error;
    }
    finally {
        for (const [label, close] of [['cleanup_raw', () => raw?.close()], ['cleanup_store', () => store?.close()]]) {
            try {
                await observe(label, async () => { await close(); });
            }
            catch (error) {
                if (primary === undefined)
                    throw error;
                t.diagnostic(label + ' failed after preserved primary: ' + String(error));
            }
        }
    }
});
