import type { TripleInput, TripleRow } from '@triplex-build/triplex/runtime';
import type { GranularBackend, GranularSession, TransactionController } from './effect-storage.js';
import { buildRow, PublicBackendError } from './public-backend.mjs';

// The native kernel admits 2 MiB. The existing public parameter transport
// admits 1 MiB, so this experiment chunks at that unchanged host boundary.
const maxPayloadBytes = 1024 * 1024;
async function rejectAdmission(session: GranularSession): Promise<never> {
  await session.runRecords("SELECT error('TD_E_COMPAT_CPP_LIMIT: one row exceeds the public parameter transport')");
  throw new PublicBackendError('COMPAT_CPP_LIMIT', 'Native append transport admission failed');
}

async function append(session: GranularSession, rows: readonly TripleRow[]) {
  for (let offset = 0; offset < rows.length;) {
    const encoded: string[] = [];
    let bytes = 2;
    while (offset < rows.length && encoded.length < 4096) {
      const value = JSON.stringify(rows[offset]);
      const added = Buffer.byteLength(value) + (encoded.length ? 1 : 0);
      if (bytes + added > maxPayloadBytes) {
        if (!encoded.length) return rejectAdmission(session);
        break;
      }
      encoded.push(value);
      bytes += added;
      offset++;
    }
    const result = await session.runRecords('SELECT td_compat_append_cpp_v1(?::VARCHAR) AS inserted', ['[' + encoded.join(',') + ']']);
    if (result.length !== 1 || result[0]?.inserted !== encoded.length) return rejectAdmission(session);
  }
  return Object.freeze(rows);
}

function sessionWithNativeAppend(session: GranularSession): GranularSession {
  return Object.freeze({
    ...session,
    insert: async (input: TripleInput, txId: string | null, timestamp: number, id: string, position: number) =>
      (await append(session, [buildRow(input, txId, timestamp, id, position)]))[0]!,
    batchInsert: async (inputs: readonly TripleInput[], txId: string, timestamp: number, ids: readonly string[], position: number) => {
      if (!Array.isArray(inputs) || !Array.isArray(ids) || inputs.length !== ids.length || inputs.length > 4096)
        throw new PublicBackendError('BATCH', 'Expected matching selected batch inputs/ids');
      return append(session, inputs.map((input, index) => buildRow(input, txId, timestamp, ids[index]!, position)));
    },
  });
}

/** Experimental same-transaction C++ append with the existing SQL retraction. */
export class NativeDirectCompatibilityBackend implements GranularBackend {
  constructor(private readonly backend: GranularBackend) {}
  async initialize(schema: string) {
    await this.backend.initialize(schema);
    const available = await this.backend.read(session => session.runRecords(
      "SELECT function_name FROM duckdb_functions() WHERE function_name='td_compat_append_cpp_v1'"));
    if (available.length !== 1)
      throw new PublicBackendError('COMPAT_CPP_UNAVAILABLE', 'Build the verified owner companion with --compat-mutations');
  }
  withTransaction<A>(work: (session: GranularSession) => Promise<A>): Promise<A> {
    return this.backend.withTransaction(session => work(sessionWithNativeAppend(session)));
  }
  read<A>(work: (session: GranularSession) => Promise<A>): Promise<A> {
    return this.backend.read(session => work(sessionWithNativeAppend(session)));
  }
  startTransaction<A>(): TransactionController<A> {
    const controller = this.backend.startTransaction<A>();
    return Object.freeze({ ...controller, started: controller.started.then(sessionWithNativeAppend) });
  }
  close() { return this.backend.close(); }
}
