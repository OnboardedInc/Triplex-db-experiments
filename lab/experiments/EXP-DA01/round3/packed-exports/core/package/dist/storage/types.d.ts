import { TripleInput, TripleRow } from "../Triple.js";
import { TripleValue } from "../Value.js";
import { Pattern, Variable } from "../types/Pattern.js";

//#region src/storage/types.d.ts
/**
 * Query pattern for filtering triples at the storage layer.
 */
interface QueryPattern {
  readonly entityId?: string | Variable;
  readonly attribute?: string | Variable;
  readonly entityType?: string;
  readonly value?: TripleValue | Variable;
}
/**
 * Result of a transaction containing the transaction ID
 */
interface TransactionInfo {
  readonly txId: string;
  readonly timestamp: number;
}
//#endregion
export { type Pattern, QueryPattern, TransactionInfo, type TripleInput, type TripleRow };
//# sourceMappingURL=types.d.ts.map