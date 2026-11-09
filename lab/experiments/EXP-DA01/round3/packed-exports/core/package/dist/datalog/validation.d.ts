import { DatalogValidationError, UnboundVariableError } from "../errors/index.js";
import { DatalogQuery, WrappedQuery } from "./schema.js";
import { Effect } from "effect";

//#region src/datalog/validation.d.ts
type DatalogQueryValidationError = DatalogValidationError | UnboundVariableError;
/** Decode and validate a query before selecting a backend execution strategy. */
declare const assertDatalogQuery: (input: unknown) => DatalogQuery;
/** Effect form of {@link assertDatalogQuery} for public service boundaries. */
declare const validateDatalogQuery: (input: unknown) => Effect.Effect<DatalogQuery, DatalogQueryValidationError>;
/** Validate wrapper shape and ensure filters/order reference projected inner columns. */
declare const assertWrappedQuery: (input: unknown) => WrappedQuery;
declare const validateWrappedQuery: (input: unknown) => Effect.Effect<WrappedQuery, DatalogQueryValidationError>;
//#endregion
export { DatalogQueryValidationError, assertDatalogQuery, assertWrappedQuery, validateDatalogQuery, validateWrappedQuery };
//# sourceMappingURL=validation.d.ts.map