import { EntityId, TransactionId } from "../Branded.js";
import { ReadError } from "../errors/index.js";
import { DatalogQuery } from "../datalog/schema.js";
import { EntityTransactionPage, EntityTransactionPageRequest, QueryResponse, TransactionRecord } from "./Triples.js";
import { Effect } from "effect";

//#region src/store/entityTransactionHistory.d.ts
interface EntityTransactionReader {
  readonly currentPosition: () => Effect.Effect<number, ReadError>;
  readonly query: (query: DatalogQuery) => Effect.Effect<QueryResponse, unknown>;
  readonly transaction: (transactionId: TransactionId) => Effect.Effect<TransactionRecord | null, ReadError>;
}
/** Indexed journal lookup shared by the KV and SQL `Triples` implementations. */
declare const transactionsForEntity: (reader: EntityTransactionReader, entityId: EntityId, request?: EntityTransactionPageRequest) => Effect.Effect<EntityTransactionPage, ReadError>;
//#endregion
export { transactionsForEntity };
//# sourceMappingURL=entityTransactionHistory.d.ts.map