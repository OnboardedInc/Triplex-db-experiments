import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Independent immutable-event recipe inspired by XTDB's distinct valid/system
// coordinates. This is a controller fixture, not an XTDB/DuckDB/QLever result.
// Native engine fixtures must use Triplex writes and their own qualified recipes.
const directory = process.env.TRIPLEX_RUN_ARTIFACTS;
if (!directory) throw new Error('Run through the owned controller');
const events = [
  { command: 'create-a', position: '1', entity: 'a', attribute: 'age', value: { type: 'integer', value: '9007199254740993' }, validFrom: 0, validTo: 20 },
  { command: 'correct-a', position: '2', entity: 'a', attribute: 'age', value: { type: 'integer', value: '9007199254740994' }, validFrom: 10, validTo: 20 },
];
const fixture = { format: 'triplex-logical-event-fixture/1', population: { distinctEntities: 1, activeDomainFactsAtLatestCut: 1, retainedAssertions: 2, commands: 2 }, events, independentExpected: [{ validAt: 15, knownAt: '1', age: '9007199254740993' }, { validAt: 15, knownAt: '2', age: '9007199254740994' }] };
const bytes = JSON.stringify(fixture, null, 2) + '\n';
await fs.writeFile(join(directory, 'logical-fixture.json'), bytes, { flag: 'wx' });
await fs.writeFile(join(directory, 'result.json'), JSON.stringify({ status: 'logical-fixture-created', eventCount: events.length, exactInt64: true }) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify({ fixtureSha256: createHash('sha256').update(bytes).digest('hex'), scope: 'LOGICAL_FIXTURE_ONLY_NOT_ENGINE_QUALIFICATION' }) + '\n');
