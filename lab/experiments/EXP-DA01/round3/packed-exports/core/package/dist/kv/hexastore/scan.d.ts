import { TripleValue } from "../../Value.js";
import { TuplePart } from "./tuple.js";
import { IndexChoice } from "./indexes.js";

//#region src/kv/hexastore/scan.d.ts
/**
 * A scan pattern with optional bound components.
 * undefined means "any" (variable/wildcard).
 */
interface ScanPattern {
  readonly entity?: string;
  readonly attribute?: string;
  readonly value?: TripleValue;
}
/**
 * Convert a TripleValue to a TuplePart for index key encoding.
 */
declare const valueToTuplePart: (value: TripleValue) => TuplePart;
/**
 * Convert a TripleValue to a latin1-encoded string for the string fast path.
 * Uses direct encoders to skip TuplePart object allocation.
 */
declare const valueToPartStr: (value: TripleValue) => string;
/**
 * Convert a scan pattern to index selection + range bounds.
 */
declare const patternToScan: (pattern: ScanPattern) => {
  choice: IndexChoice;
  start: Uint8Array;
  end: Uint8Array;
};
//#endregion
export { ScanPattern, patternToScan, valueToPartStr, valueToTuplePart };
//# sourceMappingURL=scan.d.ts.map