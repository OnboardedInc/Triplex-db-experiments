import type { GranularBackend, GranularSession, TransactionController, ReadQueueAdmissionOptions, TransactionAdmissionOptions } from "./effect-storage.js";
import type { OwnedDuckDBPort } from "./owned-duckdb-port.mjs";
import type { TripleInput, TripleRow } from "@triplex-build/triplex/runtime";
/** @internal Own and validate the public row shape without physical carrier conversion. */
export function buildRow(
  input: TripleInput,
  txId: string | null,
  timestamp: number,
  id: string,
  position: number,
): TripleRow;
export class PublicBackendError extends Error {
  readonly code: string;
  constructor(code: string, message: string);
}
export class PublicDuckDBBackend implements GranularBackend {
  constructor(port: OwnedDuckDBPort, scope: string);
  initialize(schema: string): Promise<void>;
  withTransaction<A>(work: (session: GranularSession) => Promise<A>, options?: ReadQueueAdmissionOptions): Promise<A>;
  read<A>(work: (session: GranularSession) => Promise<A>): Promise<A>;
  startTransaction<A>(options?: TransactionAdmissionOptions): TransactionController<A>;
  close(): Promise<void>;
  status(): Readonly<{ closed: boolean; initialized: boolean; owner: unknown }>;
}
