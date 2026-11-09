import { EntityId, TransactionId, TripleId } from "../Branded.js";
import { ViolationAt } from "../Constraint.js";
import { DatabaseAlreadyExists, DatabaseNotFound, InternalError } from "../Error.js";
import * as _$effect_Types0 from "effect/Types";
import * as _$effect_Cause0 from "effect/Cause";

//#region src/errors/index.d.ts
declare const WriteError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "WriteError";
} & Readonly<A>;
declare class WriteError extends WriteError_base<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
/** Explicit backend capability rejection; never coerce a new value family. */
declare class UnsupportedValueTypeError extends WriteError {
  readonly backend: string;
  readonly valueType: string;
  readonly reason: "unsupported-value-type";
  constructor(backend: string, valueType: string);
}
/**
 * Submission may have committed. Resolve the durable operation identity before
 * retrying. Retains WriteError's tag for compatibility with existing write APIs.
 */
declare class TransactionOutcomeUnknown extends WriteError {
  readonly reason: "outcome-unknown";
  readonly operationId: string;
  readonly attemptId: string;
  readonly commandId: string | undefined;
  constructor(input: {
    readonly operationId: string;
    readonly attemptId: string;
    readonly commandId?: string;
    readonly cause?: unknown;
  });
}
declare const DuplicateTripleError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DuplicateTripleError";
} & Readonly<A>;
declare class DuplicateTripleError extends DuplicateTripleError_base<{
  readonly entityId: EntityId;
  readonly attribute: string;
  readonly message: string;
}> {}
declare const InvalidTripleError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "InvalidTripleError";
} & Readonly<A>;
declare class InvalidTripleError extends InvalidTripleError_base<{
  readonly field: string;
  readonly value: unknown;
  readonly message: string;
}> {}
declare const TransactionError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "TransactionError";
} & Readonly<A>;
declare class TransactionError extends TransactionError_base<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
declare const TransactionConflictError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "TransactionConflictError";
} & Readonly<A>;
/**
 * A transaction's compare-and-retract condition no longer matched.
 *
 * This is a normal concurrency outcome, not storage corruption. Callers may
 * reload the current facts and retry their command.
 */
declare class TransactionConflictError extends TransactionConflictError_base<{
  readonly tripleId?: TripleId;
  readonly entityId?: EntityId;
  readonly message: string;
}> {}
declare const CommandAlreadyCommittedError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "CommandAlreadyCommittedError";
} & Readonly<A>;
/**
 * A command with this idempotency identity already committed.
 *
 * The original transaction remains the durable receipt. Callers should return
 * or inspect that result rather than execute the command again.
 */
declare class CommandAlreadyCommittedError extends CommandAlreadyCommittedError_base<{
  readonly commandId: string;
  readonly transactionId: TransactionId;
  readonly message: string;
}> {}
declare const ConstraintViolationError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "ConstraintViolationError";
} & Readonly<A>;
/** A transaction would introduce or worsen a configured graph constraint violation. */
declare class ConstraintViolationError extends ConstraintViolationError_base<{
  readonly violations: readonly ViolationAt[];
  readonly message: string;
}> {}
declare const ReadError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "ReadError";
} & Readonly<A>;
declare class ReadError extends ReadError_base<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
declare const EntityNotFoundError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "EntityNotFoundError";
} & Readonly<A>;
declare class EntityNotFoundError extends EntityNotFoundError_base<{
  readonly entityId: EntityId;
}> {}
declare const TripleNotFoundError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "TripleNotFoundError";
} & Readonly<A>;
declare class TripleNotFoundError extends TripleNotFoundError_base<{
  readonly tripleId: TripleId;
}> {}
declare const QueryError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "QueryError";
} & Readonly<A>;
declare class QueryError extends QueryError_base<{
  readonly message: string;
  readonly sql?: string;
  readonly cause?: unknown;
}> {}
declare const InvalidPatternError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "InvalidPatternError";
} & Readonly<A>;
declare class InvalidPatternError extends InvalidPatternError_base<{
  readonly pattern: unknown;
  readonly message: string;
}> {}
declare const ParseError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "ParseError";
} & Readonly<A>;
declare class ParseError extends ParseError_base<{
  readonly message: string;
  readonly line: number;
  readonly column: number;
  readonly source?: string;
}> {}
declare const UnexpectedTokenError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "UnexpectedTokenError";
} & Readonly<A>;
declare class UnexpectedTokenError extends UnexpectedTokenError_base<{
  readonly expected: string;
  readonly found: string;
  readonly line: number;
  readonly column: number;
}> {}
declare const UndefinedVariableError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "UndefinedVariableError";
} & Readonly<A>;
declare class UndefinedVariableError extends UndefinedVariableError_base<{
  readonly variable: string;
  readonly line: number;
}> {}
declare const ValidationError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "ValidationError";
} & Readonly<A>;
declare class ValidationError extends ValidationError_base<{
  readonly field: string;
  readonly message: string;
  readonly value?: unknown;
}> {}
declare const DatalogError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DatalogError";
} & Readonly<A>;
declare class DatalogError extends DatalogError_base<{
  readonly message: string;
  readonly cause?: unknown;
}> {}
declare const UnboundVariableError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "UnboundVariableError";
} & Readonly<A>;
declare class UnboundVariableError extends UnboundVariableError_base<{
  readonly variable: string;
  readonly clause: unknown;
  readonly message: string;
}> {}
declare const InvalidPredicateError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "InvalidPredicateError";
} & Readonly<A>;
declare class InvalidPredicateError extends InvalidPredicateError_base<{
  readonly predicate: unknown;
  readonly message: string;
}> {}
declare const DatalogValidationError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "DatalogValidationError";
} & Readonly<A>;
declare class DatalogValidationError extends DatalogValidationError_base<{
  readonly message: string;
  readonly query: unknown;
  readonly cause?: unknown;
}> {}
declare const PaginationCursorError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "PaginationCursorError";
} & Readonly<A>;
/**
 * A paged-query cursor could not be decoded or does not belong to the query,
 * temporal snapshot, or database scope in which it was presented.
 */
declare class PaginationCursorError extends PaginationCursorError_base<{
  readonly reason: "malformed" | "unsupported_version" | "query_mismatch" | "scope_mismatch" | "basis_mismatch" | "invalid_ordering";
  readonly message: string;
  readonly cause?: unknown;
}> {}
declare const MigrationError_base: new <A extends Record<string, any> = {}>(args: _$effect_Types0.VoidIfEmpty<{ readonly [P in keyof A as P extends "_tag" ? never : P]: A[P] }>) => _$effect_Cause0.YieldableError & {
  readonly _tag: "MigrationError";
} & Readonly<A>;
declare class MigrationError extends MigrationError_base<{
  readonly version: number;
  readonly name: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}
type WriteErrorUnion = WriteError | DuplicateTripleError | InvalidTripleError | TransactionError | TransactionConflictError | CommandAlreadyCommittedError | ConstraintViolationError;
type ReadErrorUnion = ReadError | EntityNotFoundError | TripleNotFoundError;
type QueryErrorUnion = QueryError | InvalidPatternError;
type ParseErrorUnion = ParseError | UnexpectedTokenError | UndefinedVariableError;
type DatalogQueryError = DatalogError | UnboundVariableError | InvalidPredicateError | DatalogValidationError;
type DatalogErrorUnion = DatalogQueryError | PaginationCursorError;
type TripleStoreError = WriteErrorUnion | ReadErrorUnion | QueryErrorUnion | ParseErrorUnion | DatalogErrorUnion | ValidationError | MigrationError;
//#endregion
export { CommandAlreadyCommittedError, ConstraintViolationError, DatabaseAlreadyExists, DatabaseNotFound, DatalogError, DatalogErrorUnion, DatalogQueryError, DatalogValidationError, DuplicateTripleError, EntityNotFoundError, InternalError, InvalidPatternError, InvalidPredicateError, InvalidTripleError, MigrationError, PaginationCursorError, ParseError, ParseErrorUnion, QueryError, QueryErrorUnion, ReadError, ReadErrorUnion, TransactionConflictError, TransactionError, TransactionOutcomeUnknown, TripleNotFoundError, TripleStoreError, UnboundVariableError, UndefinedVariableError, UnexpectedTokenError, UnsupportedValueTypeError, ValidationError, WriteError, WriteErrorUnion };
//# sourceMappingURL=index.d.ts.map