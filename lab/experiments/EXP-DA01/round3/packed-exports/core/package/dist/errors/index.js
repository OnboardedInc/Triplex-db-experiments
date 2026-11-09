import { DatabaseAlreadyExists, DatabaseNotFound, InternalError } from "../Error.js";
import { Data } from "effect";
//#region src/errors/index.ts
/**
* Database error types.
*
* All error types used by the database package live here.
* Database-layer errors extracted from the old monolithic package layout
* are now owned by the database package.
*/
var WriteError = class extends Data.TaggedError("WriteError") {};
/** Explicit backend capability rejection; never coerce a new value family. */
var UnsupportedValueTypeError = class extends WriteError {
	reason = "unsupported-value-type";
	constructor(backend, valueType) {
		super({ message: `${backend} does not support ${valueType} values` });
		this.backend = backend;
		this.valueType = valueType;
	}
};
/**
* Submission may have committed. Resolve the durable operation identity before
* retrying. Retains WriteError's tag for compatibility with existing write APIs.
*/
var TransactionOutcomeUnknown = class extends WriteError {
	reason = "outcome-unknown";
	operationId;
	attemptId;
	commandId;
	constructor(input) {
		super({
			message: `Transaction outcome is unknown; resolve operation ${input.operationId} before retrying`,
			...input.cause === void 0 ? {} : { cause: input.cause }
		});
		this.operationId = input.operationId;
		this.attemptId = input.attemptId;
		this.commandId = input.commandId;
	}
};
var DuplicateTripleError = class extends Data.TaggedError("DuplicateTripleError") {};
var InvalidTripleError = class extends Data.TaggedError("InvalidTripleError") {};
var TransactionError = class extends Data.TaggedError("TransactionError") {};
/**
* A transaction's compare-and-retract condition no longer matched.
*
* This is a normal concurrency outcome, not storage corruption. Callers may
* reload the current facts and retry their command.
*/
var TransactionConflictError = class extends Data.TaggedError("TransactionConflictError") {};
/**
* A command with this idempotency identity already committed.
*
* The original transaction remains the durable receipt. Callers should return
* or inspect that result rather than execute the command again.
*/
var CommandAlreadyCommittedError = class extends Data.TaggedError("CommandAlreadyCommittedError") {};
/** A transaction would introduce or worsen a configured graph constraint violation. */
var ConstraintViolationError = class extends Data.TaggedError("ConstraintViolationError") {};
var ReadError = class extends Data.TaggedError("ReadError") {};
var EntityNotFoundError = class extends Data.TaggedError("EntityNotFoundError") {};
var TripleNotFoundError = class extends Data.TaggedError("TripleNotFoundError") {};
var QueryError = class extends Data.TaggedError("QueryError") {};
var InvalidPatternError = class extends Data.TaggedError("InvalidPatternError") {};
var ParseError = class extends Data.TaggedError("ParseError") {};
var UnexpectedTokenError = class extends Data.TaggedError("UnexpectedTokenError") {};
var UndefinedVariableError = class extends Data.TaggedError("UndefinedVariableError") {};
var ValidationError = class extends Data.TaggedError("ValidationError") {};
var DatalogError = class extends Data.TaggedError("DatalogError") {};
var UnboundVariableError = class extends Data.TaggedError("UnboundVariableError") {};
var InvalidPredicateError = class extends Data.TaggedError("InvalidPredicateError") {};
var DatalogValidationError = class extends Data.TaggedError("DatalogValidationError") {};
/**
* A paged-query cursor could not be decoded or does not belong to the query,
* temporal snapshot, or database scope in which it was presented.
*/
var PaginationCursorError = class extends Data.TaggedError("PaginationCursorError") {};
var MigrationError = class extends Data.TaggedError("MigrationError") {};
//#endregion
export { CommandAlreadyCommittedError, ConstraintViolationError, DatabaseAlreadyExists, DatabaseNotFound, DatalogError, DatalogValidationError, DuplicateTripleError, EntityNotFoundError, InternalError, InvalidPatternError, InvalidPredicateError, InvalidTripleError, MigrationError, PaginationCursorError, ParseError, QueryError, ReadError, TransactionConflictError, TransactionError, TransactionOutcomeUnknown, TripleNotFoundError, UnboundVariableError, UndefinedVariableError, UnexpectedTokenError, UnsupportedValueTypeError, ValidationError, WriteError };

//# sourceMappingURL=index.js.map