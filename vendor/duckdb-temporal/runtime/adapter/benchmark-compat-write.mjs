// Bounded complete-path comparison. Requires the separately built experimental
// adapter and an exclusive execution lease. Every paired result is checked.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { NativeDuckDBPort } from './native-duckdb-port.mjs';
import { PublicDuckDBBackend } from './public-backend.mjs';
import { NativeCompatibilityBackend } from './native-compat-backend.js';
import { NativeDirectCompatibilityBackend } from './native-direct-backend.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const output = process.argv[2];
if (!output) throw new Error('Supply a new evidence output path');
const argumentsByName = new Map(process.argv.slice(3).map(argument => {
  const match = /^--(history-rows|samples|warmups)=(.+)$/.exec(argument);
  if (!match) throw new Error('Unknown benchmark argument: ' + argument);
  return [match[1], match[2]];
}));
const integer = (value, low, high) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < low || number > high) throw new Error('Invalid benchmark bound');
  return number;
};
const historyRows = (argumentsByName.get('history-rows') ?? '0,4096').split(',').map(value => integer(value, 0, 65536));
const samples = integer(argumentsByName.get('samples') ?? '5', 1, 20);
const warmups = integer(argumentsByName.get('warmups') ?? '2', 0, 5);
const schema = await readFile(resolve(root, 'adapter/public-schema.sql'), 'utf8');
const sizes = [1, 16, 128, 1024];
const profiles = ['appender', 'native-compat', 'native-direct'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const median = values => values.toSorted((left, right) => left - right)[Math.floor(values.length / 2)];
const physical = `SELECT assertion_id,e,a,tag,payload,valid_from::VARCHAR valid_from,valid_to::VARCHAR valid_to,
 tx_from::VARCHAR tx_from,tx_to::VARCHAR tx_to,command_id,corrected_by,payload_hash,v_tag,hex(v_s) v_s,v_b,
 v_i::VARCHAR v_i,v_f,recorded_at,retracted_at,external_valid_from,external_valid_to,created_by,entity_type,
 transaction_id,retract_transaction_id,extra_json,origin,interop
 FROM main.assertions WHERE a=? ORDER BY assertion_id`;

function values(index) {
  switch (index % 7) {
    case 0: return { type: 'string', value: "é🙂 ' \\ row-" + index };
    case 1: return { type: 'number', value: index % 2 ? Number.MIN_VALUE : index + 0.125 };
    case 2: return { type: 'boolean', value: index % 2 === 0 };
    case 3: return { type: 'ref', value: 'target-' + index };
    case 4: return { type: 'datetime', value: -index - 0.25 };
    case 5: return { type: 'json', value: { index, text: 'é🙂', list: [false, null, index] } };
    default: return { type: 'blob', value: 'blob-' + index, mimeType: 'text/plain', size: index, filename: 'row.txt' };
  }
}

async function open(profile, retained) {
  const started = performance.now();
  const port = await NativeDuckDBPort.openWithOwner();
  const openMs = performance.now() - started;
  let capture;
  const run = port.run.bind(port);
  Object.defineProperty(port, 'run', { value: plan => {
    if (capture) capture.push(plan);
    return run(plan);
  } });
  const baseline = new PublicDuckDBBackend(port, 'compat-write-comparison');
  try {
    const initialized = performance.now();
    await baseline.initialize(schema);
    const initializeMs = performance.now() - initialized;
    const seedStarted = performance.now();
    if (retained > 0) {
      // Setup uses the already verified Appender. One canonical bulk closure
      // builds retained history without timing thousands of unrelated calls.
      await baseline.withTransaction(async session => {
        const position = await session.nextCommitPosition();
        await session.claimCommand('seed', 'seed-tx', 1);
        for (let offset = 0; offset < retained; offset += 4096) {
          const count = Math.min(4096, retained - offset);
          const inputs = Array.from({ length: count }, (_, index) => ({
            entityId: 'seed-' + (offset + index), attribute: 'seed',
            value: { type: 'number', value: offset + index }, validFrom: 0,
          }));
          await session.batchInsert(inputs, 'seed-tx', 1, inputs.map(row => row.entityId), position);
        }
      });
      await baseline.withTransaction(async session => {
        const position = await session.nextCommitPosition();
        await session.claimCommand('seed-close', 'seed-close-tx', 2);
        await session.runRecords(`UPDATE main.assertions SET tx_to=?,retracted_at=2,retract_transaction_id='seed-close-tx'
          WHERE a='seed' AND v_f%2=0`, [BigInt(position)]);
      });
    }
    const seedMs = performance.now() - seedStarted;
    const backend = profile === 'appender' ? baseline : profile === 'native-compat'
      ? new NativeCompatibilityBackend(baseline) : new NativeDirectCompatibilityBackend(baseline);
    const featureStarted = performance.now();
    if (profile === 'native-direct') await backend.initialize(schema);
    return { profile, backend, port, setup: { open_ms: openMs, initialize_ms: initializeMs,
      seed_ms: seedMs, feature_check_ms: performance.now() - featureStarted },
      record: () => { capture = []; return capture; }, stop: () => { capture = undefined; } };
  } catch (error) { await baseline.close(); throw error; }
}

function transport(plans) {
  const appends = plans.filter(plan => plan.kind === 'append');
  const native = plans.filter(plan => plan.sql?.startsWith('PRAGMA td_compat_append_v1('));
  const direct = plans.filter(plan => plan.sql === 'SELECT td_compat_append_cpp_v1(?::VARCHAR) AS inserted');
  let jsonBytes = 0;
  for (const plan of native) {
    const literal = plan.sql.slice('PRAGMA td_compat_append_v1('.length, -1);
    assert.equal(literal[0], "'");
    assert.equal(literal.at(-1), "'");
    const payload = literal.slice(1, -1).replaceAll("''", "'");
    assert.ok(Buffer.byteLength(payload) <= 32768);
    assert.ok(JSON.parse(payload).length <= 128);
    jsonBytes += Buffer.byteLength(payload);
  }
  for (const plan of direct) {
    const payload = plan.params[0];
    assert.equal(typeof payload, 'string');
    assert.ok(Buffer.byteLength(payload) <= 1048576);
    assert.ok(JSON.parse(payload).length <= 4096);
    jsonBytes += Buffer.byteLength(payload);
  }
  return {
    appender_calls: appends.length,
    compatibility_calls: native.length,
    direct_cpp_calls: direct.length,
    json_envelope_bytes: jsonBytes,
    compatibility_sql_bytes: native.reduce((sum, plan) => sum + Buffer.byteLength(plan.sql), 0),
    direct_sql_bytes: direct.reduce((sum, plan) => sum + Buffer.byteLength(plan.sql), 0),
  };
}

async function runAttempt(state, size, attempt, retained) {
  const attribute = 'measure-' + attempt;
  const inputs = Array.from({ length: size }, (_, index) => ({
    entityId: 'measure-' + attempt + '-' + index, attribute, value: values(index),
    validFrom: 0.25, validTo: 1000.75, createdBy: 'actor', entityType: 'Row',
  }));
  const ids = inputs.map(row => row.entityId);
  const command = 'command-' + attempt;
  const transaction = 'transaction-' + attempt;
  const before = await state.backend.read(session => session.runRecords('SELECT retained_bytes FROM main.storage_usage'));
  const plans = state.record();
  const previousTraceId = state.port.trace().at(-1)?.id ?? 0;
  const started = performance.now();
  const pendingWrite = state.backend.withTransaction(async session => {
    assert.equal(await session.claimCommand(command, transaction, 10.125 + attempt), null);
    const position = await session.nextCommitPosition();
    return { position, rows: await session.batchInsert(inputs, transaction, 10.125 + attempt, ids, position) };
  });
  // The current public backend serializes a read call behind this writer. This
  // measures its queue-inclusive latency, without claiming engine overlap.
  const queuedStarted = performance.now();
  const pendingRead = state.backend.read(session => session.query({ attribute }));
  pendingRead.catch(() => undefined);
  const written = await pendingWrite;
  const writeMs = performance.now() - started;
  state.stop();
  const invalidations = state.port.trace().filter(event => event.id > previousTraceId && event.name === 'owner_invalidate').length;
  const queuedRows = await pendingRead;
  const queuedReadMs = performance.now() - queuedStarted;
  const readStarted = performance.now();
  const readRows = await state.backend.read(session => session.query({ attribute }));
  const readMs = performance.now() - readStarted;
  assert.equal(written.rows.length, size);
  assert.equal(written.position, (retained > 0 ? 3 : 1) + attempt);
  const byId = new Map(written.rows.map(row => [row.id, row]));
  for (const rows of [queuedRows, readRows]) {
    assert.equal(rows.length, size);
    for (const row of rows) assert.deepEqual(row, byId.get(row.id));
  }
  const snapshot = await state.backend.read(async session => ({
    rows: await session.runRecords(physical, [attribute]),
    command: await session.runRecords('SELECT * FROM main.commands WHERE command_id=?', [command]),
    usage: await session.runRecords('SELECT * FROM main.storage_usage'),
    clock: await session.currentCommitPosition(),
    seed: await session.runRecords(`SELECT count(*) retained,count(*) FILTER(WHERE tx_to=9223372036854775807) live
      FROM main.assertions WHERE a='seed'`),
  }));
  assert.equal(snapshot.rows.length, size);
  assert.equal(snapshot.usage[0].retained_count, retained + (attempt + 1) * size);
  assert.deepEqual(snapshot.seed, [{ retained, live: Math.floor(retained / 2) }]);
  const addedBytes = snapshot.usage[0].retained_bytes - before[0].retained_bytes;
  const observed = transport(plans);
  if (state.profile === 'appender') {
    assert.ok(observed.appender_calls > 0);
    assert.equal(observed.compatibility_calls, 0);
    assert.equal(observed.direct_cpp_calls, 0);
  } else if (state.profile === 'native-compat') {
    assert.ok(observed.compatibility_calls > 0);
    assert.equal(observed.appender_calls, 0);
    assert.equal(observed.direct_cpp_calls, 0);
  } else {
    assert.ok(observed.direct_cpp_calls > 0);
    assert.equal(observed.appender_calls, 0);
    assert.equal(observed.compatibility_calls, 0);
  }
  return {
    exact: { ...snapshot, returned: written.rows, read: readRows },
    sample: { attempt, retained_before: retained + attempt * size, write_commit_ms: writeMs,
      queued_read_call_ms: queuedReadMs, subsequent_read_ms: readMs, retained_logical_bytes_added: addedBytes,
      raw_invalidations_observed_at_write_ack: invalidations,
      ...observed },
  };
}

const paths = ['adapter/benchmark-compat-write.mjs', 'adapter/native-compat-backend.ts', 'adapter/native-compat-runtime.ts',
  'adapter/native-direct-backend.ts', 'adapter/native-direct-runtime.ts', 'native/owner_probe/compat_mutation.cpp',
  'adapter/public-backend.mjs', 'adapter/native-duckdb-port.mjs', 'adapter/transaction-owner.mjs',
  'native/src/temporal_compat.cpp', 'native/src/temporal_datalog.cpp'];
const report = {
  schema: 'native-compatibility-write-comparison/2', timestamp_utc: new Date().toISOString(),
  status: 'running', sizes, history_rows: historyRows, warmups, measured_repetitions: samples,
  scope: 'Claim, position, public normalization, transport, native lowering or typed Appender, logical usage and COMMIT. Reads include full public decoding. Queued read latency includes writer wait on the same serialized backend. A shared lightweight plan capture runs inside timing; its byte accounting runs afterward. Open, seed, snapshots and assertions are outside timing.',
  fixture: 'Separate in-memory database per profile/cell. Existing Appender inserts retained seed facts; canonical bulk SQL closes even-indexed seed facts in one later transaction. Inputs and receipts are identical across each profile group.',
  transport: 'All raw compatibility profiles load the same verified owner companion and use identical conservative raw-dispatch invalidation. Open and initialization costs are reported separately.',
  limits: { legacy_json: { rows: 128, json_bytes: 32768 }, direct_cpp: { rows: 4096,
    native_json_bytes: 2097152, host_parameter_bytes: 1048576 }, format: 5 },
  source_sha256: Object.fromEntries(await Promise.all(paths.map(async path => [path, sha(await readFile(resolve(root, path)))]))),
  executed_adapter_sha256: Object.fromEntries(await Promise.all([
    'native-compat-backend.js', 'native-compat-runtime.js', 'native-direct-backend.js', 'native-direct-runtime.js',
    'public-backend.mjs', 'native-duckdb-port.mjs',
  ].map(async path => [path, sha(await readFile(new URL(path, import.meta.url)))]))),
  native_build: JSON.parse(await readFile(resolve(root, 'build/artifact.json'), 'utf8')),
  companion_build: JSON.parse(await readFile(resolve(root, 'build/owner_probe/artifact.json'), 'utf8')),
  cells: [],
};
const persist = () => writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n');
await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
let failure;
try {
  for (const retained of historyRows) for (const size of sizes) {
    const cell = { seed_retained: retained, batch_rows: size, status: 'running', samples: [] };
    report.cells.push(cell);
    const states = {};
    let cellError;
    try {
      for (const profile of profiles) states[profile] = await open(profile, retained);
      cell.setup = Object.fromEntries(profiles.map(profile => [profile, states[profile].setup]));
      for (let attempt = 0; attempt < warmups + samples; attempt++) {
        const result = {};
        const shift = attempt % profiles.length;
        for (const profile of [...profiles.slice(shift), ...profiles.slice(0, shift)]) {
          result[profile] = await runAttempt(states[profile], size, attempt, retained);
          if (attempt >= warmups) cell.samples.push({ profile, ...result[profile].sample });
        }
        for (const profile of profiles.slice(1)) assert.deepEqual(result[profile].exact, result.appender.exact);
        await persist();
      }
      cell.summary = {};
      for (const profile of profiles) {
        const rows = cell.samples.filter(row => row.profile === profile);
        cell.summary[profile] = Object.fromEntries(['write_commit_ms', 'queued_read_call_ms', 'subsequent_read_ms'].map(key =>
          [key, median(rows.map(row => row[key]))]));
      }
      cell.status = 'passed';
    } catch (error) {
      cellError = error;
      cell.status = 'failed';
      throw error;
    } finally {
      const closed = await Promise.allSettled(Object.values(states).map(state => state.backend.close()));
      const errors = closed.filter(result => result.status === 'rejected').map(result => result.reason);
      if (errors.length) throw new AggregateError([...(cellError ? [cellError] : []), ...errors], 'Benchmark operation or cleanup failed');
    }
  }
  report.status = 'passed';
} catch (error) {
  failure = error;
  report.status = 'failed';
  report.error = { name: error.name, message: error.message, cause: error.cause?.message };
}
await persist();
console.log(JSON.stringify({ status: report.status, cells: report.cells.map(({ samples, ...cell }) => cell) }));
if (failure) throw failure;
