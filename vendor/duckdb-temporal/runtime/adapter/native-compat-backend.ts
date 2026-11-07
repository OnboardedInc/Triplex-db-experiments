import type { TripleInput, TripleRow } from '@triplex-build/triplex/runtime';
import type { GranularBackend, GranularSession, TransactionController } from './effect-storage.js';
import { buildRow, PublicBackendError } from './public-backend.mjs';

const maxRows = 128;
const maxPayloadBytes = 32 * 1024;
const maxStatementLength = 65_000;
const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const appendStatement = (payload: string) => `PRAGMA td_compat_append_v1(${quote(payload)})`;

async function rejectAdmission(session: GranularSession, message: string): Promise<never> {
  // Enter the existing owner queue so a caught admission error poisons this
  // transaction just like a caught database append failure.
  await session.runRecords(`SELECT error(${quote('TD_E_COMPAT_LIMIT: ' + message)})`);
  throw new PublicBackendError('COMPAT_LIMIT', message);
}

async function appendRows(session: GranularSession, rows: readonly TripleRow[]): Promise<readonly TripleRow[]> {
  for (let offset = 0; offset < rows.length;) {
    const encoded: string[] = [];
    let bytes = 2;
    let statementLength = appendStatement('[]').length;
    while (offset < rows.length && encoded.length < maxRows) {
      const value = JSON.stringify(rows[offset]);
      const nextBytes = Buffer.byteLength(value) + (encoded.length === 0 ? 0 : 1);
      const nextLength = quote(value).length - 2 + (encoded.length === 0 ? 0 : 1);
      if (bytes + nextBytes > maxPayloadBytes || statementLength + nextLength > maxStatementLength) {
        if (encoded.length === 0) return rejectAdmission(session, 'one row exceeds the experimental JSON transport');
        break;
      }
      encoded.push(value);
      bytes += nextBytes;
      statementLength += nextLength;
      offset++;
    }
    const result = await session.runRecords(appendStatement('[' + encoded.join(',') + ']'));
    if (result.length !== encoded.length) {
      return rejectAdmission(session, 'native append result count is inconsistent');
    }
  }
  return Object.freeze(rows);
}

function retractText(value: string): string {
  if (typeof value !== 'string' || !value.isWellFormed() || value.includes('\0') || value.length === 0 || value.length > 1_048_576) {
    throw new PublicBackendError('TEXT', 'Unsupported public text');
  }
  return value;
}

function wrapSession(session: GranularSession): GranularSession {
  return Object.freeze({
    ...session,
    insert: async (input: TripleInput, txId: string | null, timestamp: number, id: string, position: number) =>
      (await appendRows(session, [buildRow(input, txId, timestamp, id, position)]))[0]!,
    batchInsert: async (inputs: readonly TripleInput[], txId: string, timestamp: number, ids: readonly string[], position: number) => {
      if (!Array.isArray(inputs) || !Array.isArray(ids) || inputs.length !== ids.length || inputs.length > 4096) {
        throw new PublicBackendError('BATCH', 'Expected matching selected batch inputs/ids');
      }
      return appendRows(session, inputs.map((input, index) => buildRow(input, txId, timestamp, ids[index]!, position)));
    },
    retract: async (id: string, timestamp: number, txId: string, position: number) => {
      id = retractText(id);
      txId = retractText(txId);
      if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0) {
        throw new PublicBackendError('TIME', 'Expected nonnegative instant');
      }
      if (!Number.isSafeInteger(position) || position < 0) {
        throw new PublicBackendError('POSITION', 'Expected safe nonnegative commit position');
      }
      const statement = `PRAGMA td_compat_retract_v1(${quote(id)},${timestamp},${quote(txId)},${position})`;
      if (Buffer.byteLength(id) > maxPayloadBytes || Buffer.byteLength(txId) > maxPayloadBytes || statement.length > maxStatementLength) {
        return rejectAdmission(session, 'retraction exceeds the experimental transport');
      }
      const result = await session.runRecords(statement);
      if (result.length > 1) return rejectAdmission(session, 'native retraction result count is inconsistent');
      return result.length === 1;
    },
  });
}

/** Experimental C++ carrier conversion inside the existing transaction owner.
 * Raw dispatch intentionally invalidates any audited-owner certificate.
 */
export class NativeCompatibilityBackend implements GranularBackend {
  constructor(private readonly backend: GranularBackend) {}
  initialize(schema: string): Promise<void> { return this.backend.initialize(schema); }
  withTransaction<A>(work: (session: GranularSession) => Promise<A>): Promise<A> {
    return this.backend.withTransaction(session => work(wrapSession(session)));
  }
  read<A>(work: (session: GranularSession) => Promise<A>): Promise<A> {
    return this.backend.read(session => work(wrapSession(session)));
  }
  startTransaction<A>(): TransactionController<A> {
    const controller = this.backend.startTransaction<A>();
    return Object.freeze({ ...controller, started: controller.started.then(wrapSession) });
  }
  close(): Promise<void> { return this.backend.close(); }
}
