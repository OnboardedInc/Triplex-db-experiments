import { TransactionId } from "../Branded.js";
import { Triple, TripleInput } from "../Triple.js";
import { TransactionChange, TransactionMeta, TransactionRecord } from "./Triples.js";
import * as _$effect_Brand0 from "effect/Brand";

//#region src/store/transactionMetadata.d.ts
declare const transactionChangeFromTriple: (op: "assert" | "retract", triple: Triple, transactionId: TransactionId, transactionInstant: number) => TransactionChange;
declare const metadataInputs: (txId: TransactionId, position: number, instant: number, meta: TransactionMeta | undefined, changes: readonly TransactionChange[]) => readonly TripleInput[];
declare const transactionRecordFromTriples: (txId: TransactionId, triples: readonly Triple[]) => TransactionRecord | null;
declare const transactionRecordsFromTriples: (triples: readonly Triple[]) => readonly TransactionRecord[];
declare const livePreconditionIds: (meta?: TransactionMeta) => ReadonlySet<string>;
declare const entityStatePreconditions: (meta?: TransactionMeta) => {
  readonly _tag: "EntityState";
  readonly entityId: string & _$effect_Brand0.Brand<"EntityId">;
  readonly tripleIds: readonly (string & _$effect_Brand0.Brand<"TripleId">)[];
}[];
declare const invalidCommandId: (meta?: TransactionMeta) => string | undefined;
declare const validatePreconditions: (operations: readonly {
  readonly op: string;
  readonly id?: string;
}[], meta?: TransactionMeta) => string | undefined;
//#endregion
export { entityStatePreconditions, invalidCommandId, livePreconditionIds, metadataInputs, transactionChangeFromTriple, transactionRecordFromTriples, transactionRecordsFromTriples, validatePreconditions };
//# sourceMappingURL=transactionMetadata.d.ts.map